"use server";

import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import { assertExperimentAccess, audit, getAccessibleSession, getAccessibleSubmission, type Actor } from "@/lib/study/access";
import {
  activateSession,
  archiveSession,
  closeSessionEntries,
  recordActualTime,
  saveSessionConfig,
  setCollectionMode,
  StudyRuleError,
  type SessionConfigInput,
} from "@/lib/study/sessions";
import { runDraw, updatePayout, voidDraw } from "@/lib/study/draw";
import {
  promoteDuplicate,
  purgeResearchData,
  recordPermission,
  revealSubmissionContact,
  setDrawExclusion,
  setResearchExclusion,
  type PermissionStatusValue,
  type PermissionTypeValue,
} from "@/lib/study/submission-admin";
import { retentionRun } from "@/lib/study/retention";
import { POLICY_KEYS, type PolicyKey } from "@/lib/study/policy";
import { parseStudyLocal } from "@/lib/study/time";

type Result<T = undefined> = { ok: true; data: T } | { error: string };

async function run<T>(fn: (actor: Actor) => Promise<T>, paths: string[] = []): Promise<Result<T>> {
  try {
    const actor = await requireRole("RESEARCHER");
    const data = await fn(actor);
    for (const p of paths) revalidatePath(p, "layout");
    return { ok: true, data };
  } catch (err) {
    if (err instanceof AuthError || err instanceof StudyRuleError) return { error: err.message };
    if (err instanceof ZodError) return { error: err.issues[0]?.message ?? "Please check the form." };
    if (err instanceof Error && /Invalid date\/time/.test(err.message)) return { error: err.message };
    throw err;
  }
}

const ADMIN = "/researcher";

// --- Sessions ---------------------------------------------------------------

export async function saveSessionConfigAction(sessionId: string, input: SessionConfigInput) {
  return run(async (a) => {
    const c = await saveSessionConfig(a, sessionId, input);
    return { version: c.version };
  }, [ADMIN]);
}

export async function activateSessionAction(sessionId: string) {
  return run((a) => activateSession(a, sessionId).then(() => undefined), [ADMIN, "/"]);
}

export async function closeSessionAction(sessionId: string, reason: string) {
  return run((a) => closeSessionEntries(a, sessionId, reason.trim() || null).then(() => undefined), [ADMIN, "/"]);
}

export async function archiveSessionAction(sessionId: string) {
  return run((a) => archiveSession(a, sessionId), [ADMIN]);
}

export async function setCollectionModeAction(sessionId: string, mode: "TEST" | "LIVE") {
  return run((a) => setCollectionMode(a, sessionId, mode === "LIVE" ? "LIVE" : "TEST"), [ADMIN]);
}

/** `localValue` is a datetime-local string in Asia/Dhaka (empty clears it). */
export async function recordActualTimeAction(
  sessionId: string,
  field: "actualStartAt" | "actualEndAt",
  localValue: string,
  reason: string,
) {
  return run(
    (a) =>
      recordActualTime(a, sessionId, field === "actualEndAt" ? "actualEndAt" : "actualStartAt", parseStudyLocal(localValue), reason).then(
        () => undefined,
      ),
    [ADMIN, "/"],
  );
}

const annotationSchema = z.object({
  type: z.enum(["STREAM_START", "STREAM_END", "CHAT_QUESTION", "CHAT_ANSWER", "LINK_SHARED", "OTHER"]),
  occurredAt: z.string().min(1, "Enter when it happened."),
  note: z.string().trim().min(1, "Add a short note.").max(500),
});

export async function addAnnotationAction(sessionId: string, input: z.input<typeof annotationSchema>) {
  return run(async (a) => {
    const session = await getAccessibleSession(a, sessionId, "write");
    const v = annotationSchema.parse(input);
    await prisma.sessionAnnotation.create({
      data: { streamSessionId: sessionId, type: v.type, occurredAt: parseStudyLocal(v.occurredAt)!, note: v.note, createdById: a.id },
    });
    await audit(prisma, { actorId: a.id, action: "ANNOTATION_ADDED", entityType: "StreamSession", entityId: sessionId, experimentId: session.experimentId });
  }, [ADMIN]);
}

const optInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === "") return null; // missing stays missing — never 0
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    if (!Number.isInteger(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Metrics must be whole numbers (or left blank)." });
      return z.NEVER;
    }
    return n;
  });

const metricSchema = z.object({
  platform: z.string().trim().min(1, "Platform is required.").max(40),
  platformStreamId: z.string().trim().max(120).optional(),
  durationMinutes: optInt,
  views: optInt,
  avgConcurrentViewers: optInt,
  peakConcurrentViewers: optInt,
  watchTimeMinutes: optInt,
  avgViewDurationSeconds: optInt,
  likes: optInt,
  comments: optInt,
  shares: optInt,
  newFollowers: optInt,
  source: z.string().trim().min(1, "Say where the numbers came from.").max(120),
  measuredAt: z.string().min(1, "Enter when the numbers were read."),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type PlatformMetricInput = z.input<typeof metricSchema>;

export async function savePlatformMetricAction(sessionId: string, input: PlatformMetricInput) {
  return run(async (a) => {
    const session = await getAccessibleSession(a, sessionId, "write");
    const v = metricSchema.parse(input);
    await prisma.platformMetric.create({
      data: {
        ...v,
        platformStreamId: v.platformStreamId || null,
        notes: v.notes || null,
        measuredAt: parseStudyLocal(v.measuredAt)!,
        windowStart: parseStudyLocal(v.windowStart),
        windowEnd: parseStudyLocal(v.windowEnd),
        streamSessionId: sessionId,
        recordedById: a.id,
      },
    });
    await audit(prisma, { actorId: a.id, action: "PLATFORM_METRIC_RECORDED", entityType: "StreamSession", entityId: sessionId, experimentId: session.experimentId });
  }, [ADMIN]);
}

/**
 * CSV import: header row with any of the PlatformMetricInput field names
 * (platform, source and measuredAt required; measuredAt as YYYY-MM-DDTHH:mm Dhaka).
 */
export async function importPlatformMetricsAction(sessionId: string, csvText: string) {
  return run(async (a) => {
    const session = await getAccessibleSession(a, sessionId, "write");
    if (csvText.length > 100_000) throw new StudyRuleError("File too large.");
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new StudyRuleError("Expected a header row and at least one data row.");
    const headers = lines[0].split(",").map((h) => h.trim());
    const allowed = new Set(Object.keys(metricSchema.shape));
    for (const h of headers) if (!allowed.has(h)) throw new StudyRuleError(`Unknown column "${h}".`);
    const rows = lines.slice(1).map((line, i) => {
      const cells = line.split(",");
      const obj = Object.fromEntries(headers.map((h, j) => [h, (cells[j] ?? "").trim()]));
      const parsed = metricSchema.safeParse(obj);
      if (!parsed.success) throw new StudyRuleError(`Row ${i + 2}: ${parsed.error.issues[0]?.message}`);
      return parsed.data;
    });
    await prisma.$transaction(
      rows.map((v) =>
        prisma.platformMetric.create({
          data: {
            ...v,
            platformStreamId: v.platformStreamId || null,
            notes: v.notes || null,
            measuredAt: parseStudyLocal(v.measuredAt)!,
            windowStart: parseStudyLocal(v.windowStart),
            windowEnd: parseStudyLocal(v.windowEnd),
            streamSessionId: sessionId,
            recordedById: a.id,
          },
        }),
      ),
    );
    await audit(prisma, { actorId: a.id, action: "PLATFORM_METRICS_IMPORTED", entityType: "StreamSession", entityId: sessionId, experimentId: session.experimentId, detail: { rows: rows.length } });
    return { rows: rows.length };
  }, [ADMIN]);
}

// --- Policies and access ------------------------------------------------------

const policyValueSchemas: Partial<Record<PolicyKey, z.ZodType>> = {
  WINNER_COUNT: z.object({ winnerCount: z.number().int().min(1).max(1000) }),
  UNDER18_CONTACT_AND_REWARD: z.object({ rewardEligible: z.boolean(), contactAllowed: z.boolean() }),
  RETENTION: z.object({
    contactDays: z.number().int().positive().nullable(),
    optionalFieldDays: z.number().int().positive().nullable(),
    eventDays: z.number().int().positive().nullable(),
    supportDays: z.number().int().positive().nullable(),
  }),
  COLLECTION_NOTICE: z.object({ noticeVersion: z.string().trim().min(1).max(40), noticeText: z.string().trim().min(1).max(1500) }),
};

export async function savePolicyAction(
  experimentId: string,
  key: PolicyKey,
  input: { status: "PENDING" | "APPROVED"; value: unknown; note: string; approvalRef: string },
) {
  return run(async (a) => {
    await assertExperimentAccess(a, experimentId, "write");
    if (!POLICY_KEYS.includes(key)) throw new StudyRuleError("Unknown decision.");
    const schema = policyValueSchemas[key];
    const value = schema && input.value !== null && input.value !== undefined ? schema.parse(input.value) : (input.value ?? null);
    if (input.status === "APPROVED") {
      if (schema && value === null) throw new StudyRuleError("Fill in the decided value before marking it approved.");
      if (!input.approvalRef.trim() && !input.note.trim()) {
        throw new StudyRuleError("Record who approved it (approval reference or note).");
      }
    }
    const previous = await prisma.studyPolicyDecision.findUnique({ where: { experimentId_key: { experimentId, key } } });
    const data = {
      status: input.status,
      value: (value ?? undefined) as Prisma.InputJsonValue | undefined,
      note: input.note.trim().slice(0, 2000) || null,
      approvalRef: input.approvalRef.trim().slice(0, 120) || null,
      decidedById: input.status === "APPROVED" ? a.id : null,
      decidedAt: input.status === "APPROVED" ? new Date() : null,
    };
    await prisma.studyPolicyDecision.upsert({
      where: { experimentId_key: { experimentId, key } },
      update: data,
      create: { experimentId, key, ...data },
    });
    await audit(prisma, {
      actorId: a.id,
      action: "POLICY_DECISION_SAVED",
      entityType: "Experiment",
      entityId: experimentId,
      experimentId,
      detail: { key, status: input.status, previousStatus: previous?.status ?? "PENDING", value: value as Prisma.InputJsonValue },
    });
  }, [ADMIN]);
}

export async function addCollaboratorAction(experimentId: string, email: string, role: "RESEARCHER" | "VIEWER") {
  return run(async (a) => {
    const exp = await prisma.experiment.findUnique({ where: { id: experimentId } });
    if (!exp || exp.researcherId !== a.id) throw new AuthError("Only the experiment owner can manage access.");
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || user.role !== "RESEARCHER") throw new StudyRuleError("No researcher account with that email. Create it with scripts/create-account.mts first.");
    if (user.id === a.id) throw new StudyRuleError("You already own this experiment.");
    await prisma.experimentCollaborator.upsert({
      where: { experimentId_userId: { experimentId, userId: user.id } },
      update: { role },
      create: { experimentId, userId: user.id, role },
    });
    await audit(prisma, { actorId: a.id, action: "COLLABORATOR_SET", entityType: "Experiment", entityId: experimentId, experimentId, detail: { userId: user.id, role } });
  }, [ADMIN]);
}

export async function removeCollaboratorAction(experimentId: string, userId: string) {
  return run(async (a) => {
    const exp = await prisma.experiment.findUnique({ where: { id: experimentId } });
    if (!exp || exp.researcherId !== a.id) throw new AuthError("Only the experiment owner can manage access.");
    await prisma.experimentCollaborator.deleteMany({ where: { experimentId, userId } });
    await audit(prisma, { actorId: a.id, action: "COLLABORATOR_REMOVED", entityType: "Experiment", entityId: experimentId, experimentId, detail: { userId } });
  }, [ADMIN]);
}

// --- Draw -------------------------------------------------------------------

export async function runDrawAction(experimentId: string, isTest: boolean, testWinnerCount?: number) {
  return run((a) => runDraw(a, experimentId, isTest, testWinnerCount).then((d) => ({ drawId: d.id })), [ADMIN]);
}

export async function voidDrawAction(drawId: string, reason: string) {
  return run((a) => voidDraw(a, drawId, reason), [ADMIN]);
}

export async function updatePayoutAction(winnerId: string, payoutStatus: "PENDING" | "PAID" | "FAILED" | "UNREACHABLE", paymentRef: string) {
  return run((a) => updatePayout(a, winnerId, { payoutStatus, paymentRef }), [ADMIN]);
}

// --- Submissions --------------------------------------------------------------

export async function recordPermissionAction(
  submissionId: string,
  input: { type: PermissionTypeValue; status: PermissionStatusValue; noticeVersion: string; method: "PHONE_CALL" | "WHATSAPP" | "SMS" | "IN_PERSON" | "OTHER"; note: string },
) {
  return run((a) => recordPermission(a, submissionId, input), [ADMIN]);
}

export async function revealContactAction(submissionId: string, purpose: string) {
  return run((a) => revealSubmissionContact(a, submissionId, purpose));
}

export async function setResearchExclusionAction(
  submissionId: string,
  input: { excluded: boolean; reason?: "INCOMPLETE" | "TECHNICAL_ERROR" | "TEST_ENTRY" | "INVALID_SUBMISSION" | "PARTICIPANT_WITHDREW" | "OTHER"; note?: string },
) {
  return run((a) => setResearchExclusion(a, submissionId, input), [ADMIN]);
}

export async function setDrawExclusionAction(submissionId: string, excluded: boolean, note: string) {
  return run((a) => setDrawExclusion(a, submissionId, { excluded, note }), [ADMIN]);
}

export async function promoteDuplicateAction(submissionId: string, reason: string) {
  return run((a) => promoteDuplicate(a, submissionId, reason), [ADMIN]);
}

export async function purgeResearchDataAction(submissionId: string, dryRun: boolean) {
  return run((a) => purgeResearchData(a, submissionId, { dryRun }), [ADMIN]);
}

const followUpSchema = z.object({
  status: z.enum(["NOT_CONTACTED", "ATTEMPTING", "REACHED", "INTERVIEW_COMPLETED", "DECLINED_INTERVIEW", "UNREACHABLE"]),
  assignedToId: z.string().nullable(),
  nextFollowupAt: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function saveFollowUpAction(submissionId: string, input: z.input<typeof followUpSchema>) {
  return run(async (a) => {
    const s = await getAccessibleSubmission(a, submissionId, "write");
    const v = followUpSchema.parse(input);
    const data = {
      status: v.status,
      assignedToId: v.assignedToId || null,
      nextFollowupAt: parseStudyLocal(v.nextFollowupAt),
      notes: v.notes || null,
    };
    await prisma.submissionFollowUp.upsert({ where: { submissionId }, update: data, create: { submissionId, ...data } });
    await audit(prisma, { actorId: a.id, action: "FOLLOW_UP_UPDATED", entityType: "Submission", entityId: submissionId, experimentId: s.experimentId, detail: { status: v.status } });
  }, [ADMIN]);
}

const attemptSchema = z.object({
  outcome: z.enum(["ANSWERED", "NO_ANSWER", "WRONG_NUMBER", "CALL_BACK_LATER", "DEBRIEF_COMPLETED", "DECLINED", "UNREACHABLE"]),
  method: z.enum(["PHONE_CALL", "WHATSAPP", "SMS", "IN_PERSON", "OTHER"]),
  note: z.string().trim().max(1000).optional(),
});

export async function logAttemptAction(submissionId: string, input: z.input<typeof attemptSchema>) {
  return run(async (a) => {
    const s = await getAccessibleSubmission(a, submissionId, "write");
    const v = attemptSchema.parse(input);
    await prisma.$transaction(async (tx) => {
      await tx.submissionContactAttempt.create({ data: { submissionId, outcome: v.outcome, method: v.method, note: v.note || null, researcherId: a.id } });
      const current = await tx.submissionFollowUp.findUnique({ where: { submissionId } });
      if (!current || current.status === "NOT_CONTACTED") {
        await tx.submissionFollowUp.upsert({
          where: { submissionId },
          update: { status: v.outcome === "ANSWERED" ? "REACHED" : "ATTEMPTING" },
          create: { submissionId, status: v.outcome === "ANSWERED" ? "REACHED" : "ATTEMPTING" },
        });
      }
    });
    await audit(prisma, { actorId: a.id, action: "CONTACT_ATTEMPT_LOGGED", entityType: "Submission", entityId: submissionId, experimentId: s.experimentId, detail: { outcome: v.outcome } });
  }, [ADMIN]);
}

const interviewSchema = z.object({
  mode: z.enum(["PHONE_CALL", "WHATSAPP_CALL", "GOOGLE_MEET", "ZOOM", "IN_PERSON", "OTHER"]),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"]),
  scriptVersion: z.string().trim().max(40).optional(),
  scheduledAt: z.string().optional(),
  durationMinutes: z.union([z.string(), z.number()]).optional(),
  summary: z.string().trim().max(5000).optional(),
  themes: z.string().trim().max(500).optional(),
});

export async function saveInterviewAction(submissionId: string, interviewId: string | null, input: z.input<typeof interviewSchema>) {
  return run(async (a) => {
    const s = await getAccessibleSubmission(a, submissionId, "write");
    const v = interviewSchema.parse(input);
    const duration = v.durationMinutes === undefined || v.durationMinutes === "" ? null : Number(v.durationMinutes);
    if (duration !== null && (!Number.isInteger(duration) || duration < 0)) throw new StudyRuleError("Duration must be whole minutes.");
    const data = {
      mode: v.mode,
      status: v.status,
      scriptVersion: v.scriptVersion || null,
      scheduledAt: parseStudyLocal(v.scheduledAt),
      durationMinutes: duration,
      summary: v.summary || null,
      themes: (v.themes ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20),
    };
    if (interviewId) {
      const existing = await prisma.submissionInterview.findFirst({ where: { id: interviewId, submissionId } });
      if (!existing) throw new AuthError("Not found or not permitted.");
      await prisma.submissionInterview.update({ where: { id: interviewId }, data });
    } else {
      await prisma.submissionInterview.create({ data: { ...data, submissionId, interviewerId: a.id } });
    }
    await audit(prisma, { actorId: a.id, action: interviewId ? "INTERVIEW_UPDATED" : "INTERVIEW_CREATED", entityType: "Submission", entityId: submissionId, experimentId: s.experimentId, detail: { status: v.status } });
  }, [ADMIN]);
}

// --- Retention --------------------------------------------------------------

export async function retentionAction(experimentId: string, dryRun: boolean) {
  return run((a) => retentionRun(a, experimentId, { dryRun }), [ADMIN]);
}
