import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { audit, assertExperimentAccess, type Actor } from "./access";
import { approvedRetention, type PolicyRecord } from "./policy";

const DAY = 24 * 60 * 60 * 1000;

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Support requests that PROVABLY belong to one campaign and are past the
 * cutoff. A request belongs to a campaign only when its response code matches
 * a submission of that campaign (response codes are globally unique). Requests
 * with no code, or a code that matches no submission, are "unassigned" and are
 * never selected by a campaign-scoped run — fail closed. The same function
 * feeds the preview and the execution, so the dry-run count is the set purged.
 */
export async function campaignSupportPurgeCandidates(db: Db, experimentId: string, cutoff: Date) {
  const candidates = await db.supportRequest.findMany({
    where: { createdAt: { lt: cutoff }, purgedAt: null },
    select: { id: true, responseCode: true },
  });
  const codes = [...new Set(candidates.map((c) => c.responseCode).filter((c): c is string => Boolean(c)))];
  const owners = codes.length
    ? await db.submission.findMany({ where: { responseCode: { in: codes } }, select: { responseCode: true, experimentId: true } })
    : [];
  const ownerByCode = new Map(owners.map((o) => [o.responseCode, o.experimentId]));
  const ids: string[] = [];
  let unassigned = 0;
  for (const c of candidates) {
    const owner = c.responseCode ? ownerByCode.get(c.responseCode) : undefined;
    if (!owner) unassigned++;
    else if (owner === experimentId) ids.push(c.id);
  }
  return { ids, unassigned };
}

/**
 * Retention clean-up driven only by APPROVED retention periods — no period is
 * assumed. Categories without an approved number of days are skipped and
 * reported as undecided. Always preview (dryRun) before executing. Backups
 * taken earlier are NOT affected; see README "Backups and retention".
 * Everything is scoped to `experimentId`; access is re-checked server-side.
 */
export async function retentionRun(actor: Actor, experimentId: string, opts: { dryRun: boolean; now?: Date }) {
  await assertExperimentAccess(actor, experimentId, "contact");
  const now = opts.now ?? new Date();
  const records: PolicyRecord[] = (await prisma.studyPolicyDecision.findMany({ where: { experimentId } })).map((r) => ({
    key: r.key,
    status: r.status,
    value: r.value,
  }));
  const days = approvedRetention(records);
  const cutoff = (d: number | null | undefined) => (d ? new Date(now.getTime() - d * DAY) : null);

  const contactCutoff = cutoff(days?.contactDays);
  const optionalCutoff = cutoff(days?.optionalFieldDays);
  const eventCutoff = cutoff(days?.eventDays);
  const supportCutoff = cutoff(days?.supportDays);

  // Phones of winners whose payout is still pending are held back and listed.
  const unpaidWinnerSubs = new Set(
    (
      await prisma.drawWinner.findMany({
        where: { draw: { experimentId, status: "FINALIZED" }, payoutStatus: "PENDING" },
        select: { submissionId: true },
      })
    ).map((w) => w.submissionId),
  );

  const phoneTargets = contactCutoff
    ? await prisma.submissionContact.findMany({
        where: { encryptedPhone: { not: null }, submission: { experimentId, submittedAt: { lt: contactCutoff } } },
        select: { submissionId: true },
      })
    : [];
  const phoneIds = phoneTargets.map((t) => t.submissionId).filter((id) => !unpaidWinnerSubs.has(id));
  const optionalWhere = optionalCutoff
    ? {
        submission: { experimentId, submittedAt: { lt: optionalCutoff } },
        OR: [{ encryptedEmail: { not: null } }, { encryptedIgn: { not: null } }, { encryptedSocial: { not: null } }, { encryptedDiscord: { not: null } }, { encryptedFacebook: { not: null } }],
      }
    : null;
  const eventWhere = eventCutoff ? { experimentId, occurredAt: { lt: eventCutoff } } : null;
  const support = supportCutoff ? await campaignSupportPurgeCandidates(prisma, experimentId, supportCutoff) : { ids: [], unassigned: 0 };

  const plan = {
    decided: days !== null,
    periods: days,
    phonesToRemove: phoneIds.length,
    phonesHeldForUnpaidWinners: phoneTargets.length - phoneIds.length,
    optionalFieldRowsToClear: optionalWhere ? await prisma.submissionContact.count({ where: optionalWhere }) : 0,
    eventsToDelete: eventWhere ? await prisma.studyEvent.count({ where: eventWhere }) : 0,
    // Only requests whose response code links them to this campaign.
    supportRequestsToPurge: support.ids.length,
    // Past the cutoff but not linked to any campaign: never purged by a campaign run.
    supportRequestsUnassignedSkipped: support.unassigned,
    undecided: [
      !days?.contactDays && "contact (phone)",
      !days?.optionalFieldDays && "optional fields",
      !days?.eventDays && "website events",
      !days?.supportDays && "support requests",
    ].filter(Boolean) as string[],
  };
  if (opts.dryRun) return plan;

  await prisma.$transaction(async (tx) => {
    if (phoneIds.length) {
      await tx.submissionContact.updateMany({
        where: { submissionId: { in: phoneIds } },
        data: { encryptedName: null, encryptedPhone: null, phonePurgedAt: now },
      });
    }
    if (optionalWhere) {
      await tx.submissionContact.updateMany({
        where: optionalWhere,
        data: { encryptedEmail: null, encryptedIgn: null, encryptedSocial: null, encryptedDiscord: null, encryptedFacebook: null, optionalPurgedAt: now },
      });
    }
    if (eventWhere) await tx.studyEvent.deleteMany({ where: eventWhere });
    if (supportCutoff) {
      // Re-select inside the transaction with the same scoped rule.
      const { ids } = await campaignSupportPurgeCandidates(tx, experimentId, supportCutoff);
      if (ids.length) {
        await tx.supportRequest.updateMany({
          where: { id: { in: ids }, purgedAt: null },
          data: { emailOrPhone: null, message: null, streamNickname: null, encryptedContact: null, encryptedMessage: null, encryptedNickname: null, purgedAt: now },
        });
      }
    }
    await audit(tx, { actorId: actor.id, action: "RETENTION_EXECUTED", entityType: "Experiment", entityId: experimentId, experimentId, detail: plan });
  });
  return plan;
}
