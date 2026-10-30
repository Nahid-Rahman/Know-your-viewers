import "server-only";
import { prisma } from "@/lib/prisma";
import { audit, assertExperimentAccess, type Actor } from "./access";
import { approvedRetention, type PolicyRecord } from "./policy";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Retention clean-up driven only by APPROVED retention periods — no period is
 * assumed. Categories without an approved number of days are skipped and
 * reported as undecided. Always preview (dryRun) before executing. Backups
 * taken earlier are NOT affected; see README "Backups and retention".
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
        OR: [{ encryptedEmail: { not: null } }, { encryptedIgn: { not: null } }, { encryptedSocial: { not: null } }],
      }
    : null;
  const eventWhere = eventCutoff ? { experimentId, occurredAt: { lt: eventCutoff } } : null;
  const supportWhere = supportCutoff ? { createdAt: { lt: supportCutoff }, purgedAt: null } : null;

  const plan = {
    decided: days !== null,
    periods: days,
    phonesToRemove: phoneIds.length,
    phonesHeldForUnpaidWinners: phoneTargets.length - phoneIds.length,
    optionalFieldRowsToClear: optionalWhere ? await prisma.submissionContact.count({ where: optionalWhere }) : 0,
    eventsToDelete: eventWhere ? await prisma.studyEvent.count({ where: eventWhere }) : 0,
    // Support requests aren't tied to one campaign; included for completeness.
    supportRequestsToPurge: supportWhere ? await prisma.supportRequest.count({ where: supportWhere }) : 0,
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
        data: { encryptedPhone: null, phonePurgedAt: now },
      });
    }
    if (optionalWhere) {
      await tx.submissionContact.updateMany({
        where: optionalWhere,
        data: { encryptedEmail: null, encryptedIgn: null, encryptedSocial: null, optionalPurgedAt: now },
      });
    }
    if (eventWhere) await tx.studyEvent.deleteMany({ where: eventWhere });
    if (supportWhere) {
      await tx.supportRequest.updateMany({
        where: supportWhere,
        data: { emailOrPhone: null, message: null, streamNickname: null, encryptedContact: null, encryptedMessage: null, encryptedNickname: null, purgedAt: now },
      });
    }
    await audit(tx, { actorId: actor.id, action: "RETENTION_EXECUTED", entityType: "Experiment", entityId: experimentId, experimentId, detail: plan });
  });
  return plan;
}
