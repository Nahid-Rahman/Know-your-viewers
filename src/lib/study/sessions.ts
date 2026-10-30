import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { audit, getAccessibleSession, type Actor } from "./access";
import { blockingPoliciesForLive, POLICY_DEFINITIONS, type PolicyRecord } from "./policy";
import { DEFAULT_REWARD_CONFIG, rewardConfigSchema } from "./reward";
import { entryDeadlineFor } from "./session-state";

export class StudyRuleError extends Error {}

export const homepageContentSchema = z.object({
  heroHeadline: z.string().trim().min(1).max(120),
  heroSubtext: z.string().trim().min(1).max(400),
  howItWorks: z.array(z.string().trim().min(1).max(200)).max(6),
  faqItems: z.array(z.object({ q: z.string().trim().min(1).max(200), a: z.string().trim().min(1).max(800) })).max(12),
});

export type HomepageContent = z.infer<typeof homepageContentSchema>;

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  heroHeadline: "Viewer reward wheel",
  heroSubtext:
    "Spin the wheel and leave your phone number to enter the BDT 100 bKash prize draw for this stream. Winners are picked at random after the session.",
  howItWorks: [
    "Spin the reward wheel.",
    "Enter your phone number and age group. Other fields are optional.",
    "After the session, winners are drawn at random and paid BDT 100 via bKash.",
  ],
  faqItems: [
    {
      q: "Does everyone win?",
      a: "No. Every valid entry goes into a random draw after the session, and only the selected winners receive BDT 100 via bKash.",
    },
    {
      q: "Do optional fields improve my chances?",
      a: "No. Email, in-game name and social contact are optional and do not affect the draw.",
    },
    {
      q: "Will you ask for my bKash PIN or OTP?",
      a: "Never. We will never ask for a PIN, OTP, password, NID or account login.",
    },
  ],
};

const httpsOrLocal = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v) || /^\/[\w\-./]+$/.test(v), "Use an https:// URL or a /path in the site.");

export const sessionConfigInputSchema = z.object({
  streamerDisplayName: z.string().trim().min(1).max(60),
  streamerImageUrl: httpsOrLocal.optional().default(""),
  welcomeText: z.string().trim().min(1).max(400),
  channelUrl: httpsOrLocal.optional().default(""),
  platform: z.string().trim().max(40).optional().default(""),
  homepageContent: homepageContentSchema,
  rewardConfig: rewardConfigSchema,
});

export type SessionConfigInput = z.input<typeof sessionConfigInputSchema>;

async function policyRecords(experimentId: string): Promise<PolicyRecord[]> {
  const rows = await prisma.studyPolicyDecision.findMany({ where: { experimentId } });
  return rows.map((r) => ({ key: r.key, status: r.status, value: r.value }));
}

/** Appends a new immutable config version and points the session at it. */
export async function saveSessionConfig(actor: Actor, sessionId: string, input: SessionConfigInput) {
  const session = await getAccessibleSession(actor, sessionId, "write");
  const data = sessionConfigInputSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const last = await tx.sessionConfig.findFirst({ where: { streamSessionId: sessionId }, orderBy: { version: "desc" } });
    const config = await tx.sessionConfig.create({
      data: {
        streamSessionId: sessionId,
        version: (last?.version ?? 0) + 1,
        streamerDisplayName: data.streamerDisplayName,
        streamerImageUrl: data.streamerImageUrl || null,
        welcomeText: data.welcomeText,
        channelUrl: data.channelUrl || null,
        platform: data.platform || null,
        homepageContent: data.homepageContent as Prisma.InputJsonValue,
        rewardConfig: data.rewardConfig as Prisma.InputJsonValue,
        createdById: actor.id,
      },
    });
    await tx.streamSession.update({ where: { id: sessionId }, data: { currentConfigId: config.id } });
    await audit(tx, {
      actorId: actor.id,
      action: "SESSION_CONFIG_VERSION_CREATED",
      entityType: "StreamSession",
      entityId: sessionId,
      experimentId: session.experimentId,
      detail: { version: config.version, mechanism: data.rewardConfig.mechanism },
    });
    return config;
  });
}

/** Initial config built from the streamer's profile and honest defaults. */
export async function defaultConfigInputFor(sessionId: string): Promise<SessionConfigInput> {
  const session = await prisma.streamSession.findUniqueOrThrow({ where: { id: sessionId }, include: { streamer: true } });
  return {
    streamerDisplayName: session.streamer.displayName,
    streamerImageUrl: session.streamer.imageUrl ?? "",
    welcomeText: `Thanks for watching ${session.streamer.displayName}! This page is part of a university research study run in collaboration with the stream.`,
    channelUrl: session.streamer.channelUrl.startsWith("https://") ? session.streamer.channelUrl : "",
    platform: session.platform ?? session.streamer.platform,
    homepageContent: DEFAULT_HOMEPAGE_CONTENT,
    rewardConfig: DEFAULT_REWARD_CONFIG,
  };
}

/**
 * Makes a study session the public one. Refuses while another study session
 * is active (sessions run sequentially), and refuses LIVE collection while
 * any required policy decision is still pending or the experiment has no
 * ethics approval reference. Serialized with an advisory lock so two
 * activations can't race into overlapping windows.
 */
export async function activateSession(actor: Actor, sessionId: string, now = new Date()) {
  const session = await getAccessibleSession(actor, sessionId, "write");
  if (session.sessionType !== "STUDY") throw new StudyRuleError("Baseline (normal) sessions have no website to activate.");
  if (!session.currentConfigId) throw new StudyRuleError("Save the session's homepage configuration first.");
  if (session.status === "ARCHIVED") throw new StudyRuleError("Archived sessions can't be reactivated.");
  if (session.status === "CLOSED") throw new StudyRuleError("This session's entries were closed; closed sessions aren't reopened.");

  if (session.collectionMode === "LIVE") {
    const experiment = await prisma.experiment.findUniqueOrThrow({ where: { id: session.experimentId } });
    if (!experiment.ethicsApprovalRef) throw new StudyRuleError("Record the ethics approval reference before live collection.");
    const blocking = blockingPoliciesForLive(await policyRecords(session.experimentId));
    if (blocking.length) {
      throw new StudyRuleError(
        `Live collection is blocked until these decisions are approved: ${blocking.map((k) => POLICY_DEFINITIONS[k].title).join("; ")}.`,
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('livedrop-active-session'))`;
    const other = await tx.streamSession.findFirst({
      where: { status: "ACTIVE", sessionType: "STUDY", id: { not: sessionId } },
      include: { streamer: { select: { displayName: true } } },
    });
    if (other) {
      throw new StudyRuleError(
        `Another study session is active (${other.streamer.displayName}${other.streamTitle ? ` — ${other.streamTitle}` : ""}). Close it before activating this one.`,
      );
    }
    const updated = await tx.streamSession.update({ where: { id: sessionId }, data: { status: "ACTIVE", activatedAt: now } });
    await audit(tx, {
      actorId: actor.id,
      action: "SESSION_ACTIVATED",
      entityType: "StreamSession",
      entityId: sessionId,
      experimentId: session.experimentId,
      detail: { collectionMode: session.collectionMode },
    });
    return updated;
  });
}

async function assertNoFinalizedLiveDraw(experimentId: string, isTest: boolean) {
  const draw = await prisma.rewardDraw.findFirst({ where: { experimentId, status: "FINALIZED", isTest } });
  if (draw) {
    throw new StudyRuleError(
      "A reward draw has been finalized for this campaign; timing changes that could alter its eligible population are blocked. Void the draw first (with a recorded reason) if a correction is required.",
    );
  }
}

/**
 * Records/corrects actual start or end. Setting the end writes the derived
 * deadline (end + 2 h). Every change is logged with the previous value.
 */
export async function recordActualTime(
  actor: Actor,
  sessionId: string,
  field: "actualStartAt" | "actualEndAt",
  value: Date | null,
  reason: string | null,
) {
  const session = await getAccessibleSession(actor, sessionId, "write");
  if (session.status === "ARCHIVED") throw new StudyRuleError("Archived sessions can't be edited.");
  const previous = session[field];
  if (previous && (!reason || !reason.trim())) {
    throw new StudyRuleError("Give a reason when correcting a time that was already recorded.");
  }
  const start = field === "actualStartAt" ? value : session.actualStartAt;
  const end = field === "actualEndAt" ? value : session.actualEndAt;
  if (start && end && end < start) throw new StudyRuleError("The actual end can't be before the actual start.");
  if (field === "actualEndAt") await assertNoFinalizedLiveDraw(session.experimentId, session.collectionMode === "TEST");

  return prisma.$transaction(async (tx) => {
    const data: Prisma.StreamSessionUpdateInput =
      field === "actualEndAt" ? { actualEndAt: value, entryDeadlineAt: entryDeadlineFor(value) } : { actualStartAt: value };
    const updated = await tx.streamSession.update({ where: { id: sessionId }, data });
    await tx.sessionTimingChange.create({
      data: { streamSessionId: sessionId, field, previousValue: previous, newValue: value, reason: reason?.trim() || null, changedById: actor.id },
    });
    await audit(tx, {
      actorId: actor.id,
      action: previous ? "SESSION_TIME_CORRECTED" : "SESSION_TIME_RECORDED",
      entityType: "StreamSession",
      entityId: sessionId,
      experimentId: session.experimentId,
      detail: { field, previous: previous?.toISOString() ?? null, value: value?.toISOString() ?? null },
    });
    return updated;
  });
}

/** Closes entries now and marks the session CLOSED (not reopened afterwards). */
export async function closeSessionEntries(actor: Actor, sessionId: string, reason: string | null, now = new Date()) {
  const session = await getAccessibleSession(actor, sessionId, "write");
  if (session.status !== "ACTIVE") throw new StudyRuleError("Only an active session can be closed.");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.streamSession.update({
      where: { id: sessionId },
      data: { status: "CLOSED", entriesClosedAt: session.entriesClosedAt ?? now },
    });
    await tx.sessionTimingChange.create({
      data: { streamSessionId: sessionId, field: "entriesClosedAt", previousValue: session.entriesClosedAt, newValue: now, reason, changedById: actor.id },
    });
    await audit(tx, {
      actorId: actor.id,
      action: "SESSION_CLOSED",
      entityType: "StreamSession",
      entityId: sessionId,
      experimentId: session.experimentId,
    });
    return updated;
  });
}

export async function archiveSession(actor: Actor, sessionId: string) {
  const session = await getAccessibleSession(actor, sessionId, "write");
  if (session.status === "ACTIVE") throw new StudyRuleError("Close the session before archiving it.");
  await prisma.streamSession.update({ where: { id: sessionId }, data: { status: "ARCHIVED" } });
  await audit(prisma, { actorId: actor.id, action: "SESSION_ARCHIVED", entityType: "StreamSession", entityId: sessionId, experimentId: session.experimentId });
}

export async function setCollectionMode(actor: Actor, sessionId: string, mode: "TEST" | "LIVE") {
  const session = await getAccessibleSession(actor, sessionId, "write");
  if (session.status !== "DRAFT") throw new StudyRuleError("Collection mode can only change while the session is a draft.");
  await prisma.streamSession.update({ where: { id: sessionId }, data: { collectionMode: mode } });
  await audit(prisma, {
    actorId: actor.id,
    action: "SESSION_COLLECTION_MODE_SET",
    entityType: "StreamSession",
    entityId: sessionId,
    experimentId: session.experimentId,
    detail: { mode },
  });
}

/** Sessions with any website records are archived, never deleted. */
export async function assertSessionDeletable(sessionId: string) {
  const [visits, submissions, configs, metrics] = await Promise.all([
    prisma.visit.count({ where: { streamSessionId: sessionId } }),
    prisma.submission.count({ where: { streamSessionId: sessionId } }),
    prisma.sessionConfig.count({ where: { streamSessionId: sessionId } }),
    prisma.platformMetric.count({ where: { streamSessionId: sessionId } }),
  ]);
  if (visits || submissions || configs || metrics) {
    throw new StudyRuleError("This session has study records or configuration history — archive it instead of deleting.");
  }
}
