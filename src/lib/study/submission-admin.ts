import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptContact } from "@/lib/crypto";
import { audit, getAccessibleSubmission, type Actor } from "./access";
import { StudyRuleError } from "./sessions";
import { evaluateResearchEligibility } from "./eligibility";

export { PERMISSION_TYPES, currentPermissions, type PermissionStatusValue, type PermissionTypeValue } from "./permissions";
import { PERMISSION_TYPES, currentPermissions, type PermissionStatusValue, type PermissionTypeValue } from "./permissions";

/**
 * Appends one permission decision for ONE type. Never copies a single answer
 * into other types, and never overwrites history.
 */
export async function recordPermission(
  actor: Actor,
  submissionId: string,
  input: {
    type: PermissionTypeValue;
    status: PermissionStatusValue;
    noticeVersion: string;
    method: "PHONE_CALL" | "WHATSAPP" | "SMS" | "IN_PERSON" | "OTHER";
    note?: string | null;
  },
) {
  const submission = await getAccessibleSubmission(actor, submissionId, "write");
  if (!PERMISSION_TYPES.includes(input.type)) throw new StudyRuleError("Unknown permission type.");
  if (!input.noticeVersion.trim()) throw new StudyRuleError("Record which notice/script version was used.");
  if (input.status === "WITHDRAWN") {
    const rows = await prisma.dataUsePermission.findMany({ where: { submissionId, type: input.type } });
    if (currentPermissions(rows)[input.type] !== "GRANTED") {
      throw new StudyRuleError("Only a granted permission can be withdrawn.");
    }
  }
  await prisma.$transaction(async (tx) => {
    const row = await tx.dataUsePermission.create({
      data: {
        submissionId,
        type: input.type,
        status: input.status,
        noticeVersion: input.noticeVersion.trim().slice(0, 40),
        method: input.method,
        note: input.note?.trim().slice(0, 1000) || null,
        recordedById: actor.id,
      },
    });
    await audit(tx, {
      actorId: actor.id,
      action: "PERMISSION_RECORDED",
      entityType: "Submission",
      entityId: submissionId,
      experimentId: submission.experimentId,
      detail: { permissionId: row.id, type: input.type, status: input.status, noticeVersion: row.noticeVersion },
    });
  });
}

/**
 * Owner decision: people who selected "Below 18" are never contacted — not for
 * research follow-up, interviews, or rewards. Enforced on the server for every
 * contact path (reveal, follow-up, attempts, interviews, contact exports).
 */
export const UNDER18_CONTACT_BLOCKED = "This entrant selected “Below 18”. Under-18 entrants are not contacted, so contact details and follow-up are unavailable.";
export function assertContactAllowed(s: { ageGroup: string }) {
  if (s.ageGroup === "BELOW_18") throw new StudyRuleError(UNDER18_CONTACT_BLOCKED);
}

/** Deliberate, audited reveal of contact values. Never used for list rendering. */
export async function revealSubmissionContact(actor: Actor, submissionId: string, purpose: string) {
  const submission = await getAccessibleSubmission(actor, submissionId, "contact");
  assertContactAllowed(submission);
  if (!purpose.trim()) throw new StudyRuleError("State why the contact details are needed.");
  const contact = await prisma.submissionContact.findUnique({ where: { submissionId } });
  if (!contact) throw new StudyRuleError("No contact details on file.");
  const dec = (v: string | null) => (v ? decryptContact(v) : null);
  const result = {
    name: dec(contact.encryptedName),
    phone: dec(contact.encryptedPhone),
    email: dec(contact.encryptedEmail),
    ign: dec(contact.encryptedIgn),
    discord: dec(contact.encryptedDiscord),
    facebook: dec(contact.encryptedFacebook),
  };
  await audit(prisma, {
    actorId: actor.id,
    action: "CONTACT_REVEALED",
    entityType: "Submission",
    entityId: submissionId,
    experimentId: submission.experimentId,
    detail: {
      purpose: purpose.trim().slice(0, 200),
      fields: Object.entries(result)
        .filter(([, v]) => v)
        .map(([k]) => k),
    },
  });
  return result;
}

async function assertNoFinalizedDraw(experimentId: string, isTest: boolean) {
  const draw = await prisma.rewardDraw.findFirst({ where: { experimentId, isTest, status: "FINALIZED" } });
  if (draw) throw new StudyRuleError("A draw has been finalized; its eligible population can't change. Void it first (with a reason) if a correction is required.");
}

export const EXCLUSION_CATEGORIES = ["INCOMPLETE", "TECHNICAL_ERROR", "TEST_ENTRY", "INVALID_SUBMISSION", "PARTICIPANT_WITHDREW", "OTHER"] as const;
export type ExclusionInput = { excluded: boolean; reason?: (typeof EXCLUSION_CATEGORIES)[number]; note?: string };

/**
 * Manual research exclusion (or its reversal). It can only ADD an exclusion:
 * reversing it never makes an entry eligible past a hard rule (under-18,
 * duplicate, TEST, missing permission, purged) — those come from recorded
 * facts and are re-derived by the evaluator. Every change is audited with the
 * prior and new classification, without contact values or the free-text note.
 */
async function applyResearchExclusion(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  actor: Actor,
  submissionId: string,
  input: ExclusionInput,
  bulk: boolean,
) {
  const s = await tx.submission.findUniqueOrThrow({
    where: { id: submissionId },
    include: { permissions: { select: { type: true, status: true, recordedAt: true } } },
  });
  const before = evaluateResearchEligibility(s);
  const note = input.excluded ? input.note?.trim().slice(0, 500) || null : null;
  await tx.submission.update({
    where: { id: submissionId },
    data: {
      researchExcluded: input.excluded,
      researchExclusionReason: input.excluded ? input.reason : null,
      researchExclusionNote: note,
    },
  });
  const after = evaluateResearchEligibility({ ...s, researchExcluded: input.excluded });
  await audit(tx, {
    actorId: actor.id,
    action: input.excluded ? "RESEARCH_EXCLUDED" : "RESEARCH_EXCLUSION_REMOVED",
    entityType: "Submission",
    entityId: submissionId,
    experimentId: s.experimentId,
    detail: {
      responseCode: s.responseCode,
      bulk,
      reason: input.reason ?? null,
      hasNote: Boolean(note),
      previous: { manual: s.researchExcluded, manualReason: s.researchExclusionReason, status: before.status, reasons: before.reasons },
      next: { manual: input.excluded, manualReason: input.excluded ? input.reason : null, status: after.status, reasons: after.reasons },
    },
  });
}

export async function setResearchExclusion(actor: Actor, submissionId: string, input: ExclusionInput) {
  await getAccessibleSubmission(actor, submissionId, "write");
  if (input.excluded && !input.reason) throw new StudyRuleError("Choose an exclusion reason.");
  if (input.reason && !EXCLUSION_CATEGORIES.includes(input.reason)) throw new StudyRuleError("Unknown exclusion reason.");
  await prisma.$transaction((tx) => applyResearchExclusion(tx, actor, submissionId, input, false));
}

/** Same rule for many entries at once; all-or-nothing, each audited separately. */
export async function bulkSetResearchExclusion(actor: Actor, submissionIds: string[], input: ExclusionInput) {
  const ids = [...new Set(submissionIds.filter((x) => typeof x === "string" && /^[0-9a-f-]{36}$/.test(x)))];
  if (!ids.length) throw new StudyRuleError("Select at least one submission.");
  if (ids.length > 200) throw new StudyRuleError("Select at most 200 submissions at a time.");
  if (input.excluded && !input.reason) throw new StudyRuleError("Choose an exclusion reason.");
  if (input.reason && !EXCLUSION_CATEGORIES.includes(input.reason)) throw new StudyRuleError("Unknown exclusion reason.");
  // Authorise every row before changing any.
  for (const id of ids) await getAccessibleSubmission(actor, id, "write");
  await prisma.$transaction(async (tx) => {
    for (const id of ids) await applyResearchExclusion(tx, actor, id, input, true);
  });
  return { updated: ids.length };
}

export async function setDrawExclusion(actor: Actor, submissionId: string, input: { excluded: boolean; note: string }) {
  const s = await getAccessibleSubmission(actor, submissionId, "contact");
  if (!input.note.trim()) throw new StudyRuleError("A note is required for draw-eligibility changes.");
  await assertNoFinalizedDraw(s.experimentId, s.isTest);
  await prisma.$transaction(async (tx) => {
    await tx.submission.update({
      where: { id: submissionId },
      data: { drawExcluded: input.excluded, drawExclusionNote: input.note.trim().slice(0, 500) },
    });
    await audit(tx, {
      actorId: actor.id,
      action: input.excluded ? "DRAW_EXCLUDED" : "DRAW_EXCLUSION_REMOVED",
      entityType: "Submission",
      entityId: submissionId,
      experimentId: s.experimentId,
      detail: { note: input.note.trim().slice(0, 200) },
    });
  });
}

/**
 * Explicit, audited correction: make a duplicate the canonical entry for its
 * phone (e.g. the original was a mistaken test). Never done automatically
 * when a canonical entry is excluded.
 */
export async function promoteDuplicate(actor: Actor, duplicateId: string, reason: string) {
  const dup = await getAccessibleSubmission(actor, duplicateId, "contact");
  if (dup.status !== "DUPLICATE" || !dup.canonicalId) throw new StudyRuleError("This submission is not a duplicate.");
  if (!reason.trim()) throw new StudyRuleError("A reason is required.");
  await assertNoFinalizedDraw(dup.experimentId, dup.isTest);
  const oldCanonicalId = dup.canonicalId;
  await prisma.$transaction(async (tx) => {
    await tx.campaignPhoneEntry.update({
      where: { experimentId_phoneHash: { experimentId: dup.experimentId, phoneHash: dup.phoneHash } },
      data: { canonicalSubmissionId: duplicateId },
    });
    await tx.submission.update({ where: { id: duplicateId }, data: { status: "CANONICAL", canonicalId: null } });
    await tx.submission.updateMany({
      where: { canonicalId: oldCanonicalId, id: { not: duplicateId } },
      data: { canonicalId: duplicateId },
    });
    await tx.submission.update({ where: { id: oldCanonicalId }, data: { status: "DUPLICATE", canonicalId: duplicateId } });
    await audit(tx, {
      actorId: actor.id,
      action: "CANONICAL_CORRECTED",
      entityType: "Submission",
      entityId: duplicateId,
      experimentId: dup.experimentId,
      detail: { previousCanonicalId: oldCanonicalId, reason: reason.trim().slice(0, 300) },
    });
  });
}

/**
 * After a recorded decline/withdrawal of website-data use: remove research
 * data (events tied to this submission, optional fields) while keeping what a
 * still-valid prize entitlement needs (the phone, until retention applies).
 * The reward entitlement itself is not touched.
 */
export async function purgeResearchData(actor: Actor, submissionId: string, opts: { dryRun: boolean }) {
  const s = await getAccessibleSubmission(actor, submissionId, "contact");
  const perms = currentPermissions(await prisma.dataUsePermission.findMany({ where: { submissionId } }));
  if (perms.WEBSITE_DATA_USE !== "DECLINED" && perms.WEBSITE_DATA_USE !== "WITHDRAWN") {
    throw new StudyRuleError("Research data is only removed after website-data use is recorded as declined or withdrawn.");
  }
  const otherLiveSubmissions = await prisma.submission.count({
    where: { visitId: s.visitId, id: { not: submissionId }, researchDataPurgedAt: null },
  });
  const eventWhere = otherLiveSubmissions
    ? { submissionId }
    : { visitId: s.visitId, OR: [{ submissionId: null }, { submissionId }] };
  const prizeEntitled = s.status === "CANONICAL" && !s.drawExcluded;
  const plan = {
    eventsToDelete: await prisma.studyEvent.count({ where: eventWhere }),
    optionalFieldsCleared: s.emailProvided || s.ignProvided || s.socialProvided,
    phoneKeptForPrize: prizeEntitled,
  };
  if (opts.dryRun) return plan;

  await prisma.$transaction(async (tx) => {
    await tx.studyEvent.deleteMany({ where: eventWhere });
    await tx.submissionContact.update({
      where: { submissionId },
      data: {
        encryptedEmail: null,
        encryptedIgn: null,
        encryptedSocial: null,
        encryptedDiscord: null,
        encryptedFacebook: null,
        optionalPurgedAt: new Date(),
        ...(prizeEntitled ? {} : { encryptedName: null, encryptedPhone: null, phonePurgedAt: new Date() }),
      },
    });
    await tx.submission.update({ where: { id: submissionId }, data: { researchDataPurgedAt: new Date() } });
    await audit(tx, {
      actorId: actor.id,
      action: "RESEARCH_DATA_PURGED",
      entityType: "Submission",
      entityId: submissionId,
      experimentId: s.experimentId,
      detail: plan,
    });
  });
  return plan;
}
