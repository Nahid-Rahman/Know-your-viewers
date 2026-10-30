import "server-only";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { encryptContact } from "@/lib/crypto";
import { Prisma } from "@/generated/prisma/client";
import { FIELD_LIMITS } from "./constants";
import { generateResponseCode, hashPhone } from "./keys";
import { normalizePhone } from "./phone";
import { parseRewardConfig, selectSpinResult } from "./reward";
import { entryState } from "./session-state";
import { entryFormSchema } from "./submission-schema";
import { getLiveVisit } from "./visits";
import { recordStudyEvent } from "./events";

export type SubmitResult =
  | { ok: true; submissionId: string; responseCode: string; replayed: boolean }
  | { ok: false; error: string; code: "INVALID" | "VISIT_EXPIRED" | "ENTRY_CLOSED" | "RATE_LIMITED" };

function isUniqueViolation(err: unknown, field?: string) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  if (!field) return true;
  return JSON.stringify(err.meta ?? {}).includes(field);
}

/**
 * Server-authoritative spin, persisted the moment it happens. One outcome per
 * visit: repeating the request returns the stored result, so replays can't
 * re-roll it. The result never affects draw eligibility.
 */
export async function spinForVisit(visitorId: string, visitId: string, now = new Date()) {
  const visit = await getLiveVisit(visitId, visitorId, now);
  if (!visit) return { ok: false as const, error: "Your visit expired — please reload the page." };
  const session = await prisma.streamSession.findUnique({ where: { id: visit.streamSessionId } });
  if (!session || !entryState(session, now).accepting) {
    return { ok: false as const, error: "Entries for this session are closed." };
  }

  const existing = await prisma.spinOutcome.findUnique({ where: { visitId } });
  if (existing) return { ok: true as const, resultKey: existing.resultKey, resultLabel: existing.resultLabel, repeated: true };

  const config = await prisma.sessionConfig.findUniqueOrThrow({ where: { id: visit.configId } });
  const { item, mechanism } = selectSpinResult(parseRewardConfig(config.rewardConfig), randomInt);
  try {
    const spin = await prisma.$transaction(async (tx) => {
      const created = await tx.spinOutcome.create({
        data: {
          visitId,
          streamSessionId: visit.streamSessionId,
          configId: visit.configId,
          mechanism,
          resultKey: item.key,
          resultLabel: item.label,
        },
      });
      await recordStudyEvent(tx, visit, { type: "SPIN_CLICKED", detail: { mechanism, resultKey: item.key } });
      return created;
    });
    return { ok: true as const, resultKey: spin.resultKey, resultLabel: spin.resultLabel, repeated: false };
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const again = await prisma.spinOutcome.findUniqueOrThrow({ where: { visitId } });
    return { ok: true as const, resultKey: again.resultKey, resultLabel: again.resultLabel, repeated: true };
  }
}

/**
 * Saves one genuine submission. Every call with a new idempotency key creates
 * a new row; a repeat phone within the campaign is saved as DUPLICATE linked
 * to the canonical entry (never overwriting it). The canonical claim is a
 * primary-key insert on campaign_phone_entries, so concurrent submissions
 * with the same phone serialize and only one can become canonical.
 */
export async function submitEntryForVisit(input: {
  visitorId: string;
  visitId: string;
  idempotencyKey: string;
  values: unknown;
  now?: Date;
}): Promise<SubmitResult> {
  const now = input.now ?? new Date();
  const key = input.idempotencyKey.trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(key) || key.length > FIELD_LIMITS.idempotencyKey) {
    return { ok: false, code: "INVALID", error: "Please reload the page and try again." };
  }

  // Retried request (double click / network retry): return the original.
  const prior = await prisma.submission.findUnique({
    where: { visitorId_idempotencyKey: { visitorId: input.visitorId, idempotencyKey: key } },
  });
  if (prior) return { ok: true, submissionId: prior.id, responseCode: prior.responseCode, replayed: true };

  const visit = await getLiveVisit(input.visitId, input.visitorId, now);
  if (!visit) return { ok: false, code: "VISIT_EXPIRED", error: "Your visit expired — please reload the page and try again." };

  const parsed = entryFormSchema.safeParse(input.values);
  if (!parsed.success) {
    await recordStudyEvent(prisma, visit, { type: "SUBMISSION_REJECTED", detail: { reason: "INVALID" } });
    return { ok: false, code: "INVALID", error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const values = parsed.data;

  const session = await prisma.streamSession.findUniqueOrThrow({ where: { id: visit.streamSessionId } });
  const state = entryState(session, now);
  if (!state.accepting) {
    await recordStudyEvent(prisma, visit, { type: "SUBMISSION_REJECTED", detail: { reason: state.reason } });
    return { ok: false, code: "ENTRY_CLOSED", error: "Entries for this session have closed." };
  }

  const phone = normalizePhone(values.phone);
  if (!phone.ok) return { ok: false, code: "INVALID", error: phone.error };
  const phoneHash = hashPhone(phone.e164);
  const spin = await prisma.spinOutcome.findUnique({ where: { visitId: visit.id }, select: { id: true } });
  const socialProvided = Boolean(values.socialType && values.socialHandle);

  for (let attempt = 0; attempt < 4; attempt++) {
    const responseCode = generateResponseCode();
    try {
      const saved = await prisma.$transaction(async (tx) => {
        const submission = await tx.submission.create({
          data: {
            responseCode,
            idempotencyKey: key,
            experimentId: visit.experimentId,
            streamSessionId: visit.streamSessionId,
            configId: visit.configId,
            visitId: visit.id,
            visitorId: input.visitorId,
            spinOutcomeId: spin?.id ?? null,
            attributionSource: visit.attributionSource,
            trackingLinkId: visit.trackingLinkId,
            isTest: session.collectionMode === "TEST",
            phoneHash,
            ageGroup: values.ageGroup,
            emailProvided: Boolean(values.email),
            ignProvided: Boolean(values.ign),
            socialType: socialProvided ? (values.socialType as "DISCORD" | "FACEBOOK") : null,
            socialProvided,
            status: "CANONICAL",
            submittedAt: now,
          },
        });

        const claimed = await tx.$queryRaw<{ canonicalSubmissionId: string }[]>`
          INSERT INTO campaign_phone_entries ("experimentId", "phoneHash", scope, "canonicalSubmissionId", "createdAt")
          VALUES (${visit.experimentId}, ${phoneHash}, 'CAMPAIGN', ${submission.id}, ${now})
          ON CONFLICT ("experimentId", "phoneHash") DO NOTHING
          RETURNING "canonicalSubmissionId"`;

        let status: "CANONICAL" | "DUPLICATE" = "CANONICAL";
        if (claimed.length === 0) {
          const entry = await tx.campaignPhoneEntry.findUniqueOrThrow({
            where: { experimentId_phoneHash: { experimentId: visit.experimentId, phoneHash } },
          });
          status = "DUPLICATE";
          await tx.submission.update({
            where: { id: submission.id },
            data: { status, canonicalId: entry.canonicalSubmissionId },
          });
        }

        await tx.submissionContact.create({
          data: {
            submissionId: submission.id,
            encryptedPhone: encryptContact(phone.e164),
            phoneTail: phone.e164.slice(-2),
            encryptedEmail: values.email ? encryptContact(values.email) : null,
            encryptedIgn: values.ign ? encryptContact(values.ign) : null,
            encryptedSocial: socialProvided ? encryptContact(values.socialHandle) : null,
          },
        });

        await recordStudyEvent(tx, visit, {
          type: "SUBMISSION_SAVED",
          submissionId: submission.id,
          detail: {
            emailProvided: Boolean(values.email),
            ignProvided: Boolean(values.ign),
            socialProvided,
          },
        });
        if (status === "DUPLICATE") {
          await recordStudyEvent(tx, visit, { type: "DUPLICATE_CLASSIFIED", submissionId: submission.id });
        }
        await tx.visit.update({ where: { id: visit.id }, data: { lastSeenAt: now } });
        return submission;
      });
      return { ok: true, submissionId: saved.id, responseCode: saved.responseCode, replayed: false };
    } catch (err) {
      if (isUniqueViolation(err, "idempotencyKey")) {
        const row = await prisma.submission.findUniqueOrThrow({
          where: { visitorId_idempotencyKey: { visitorId: input.visitorId, idempotencyKey: key } },
        });
        return { ok: true, submissionId: row.id, responseCode: row.responseCode, replayed: true };
      }
      if (isUniqueViolation(err, "responseCode")) continue;
      throw err;
    }
  }
  throw new Error("Could not allocate a unique response code.");
}
