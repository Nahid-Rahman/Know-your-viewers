import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type {
  Experiment as ExperimentDTO,
  Condition as ConditionDTO,
  Streamer as StreamerDTO,
  TrackingLink as TrackingLinkDTO,
  FunnelStage,
} from "@/types/research";
import type {
  ExperimentModel as Experiment,
  ConditionModel as Condition,
  StreamerModel as Streamer,
} from "@/generated/prisma/models";
import type { Prisma } from "@/generated/prisma/client";
import type { DebriefStatus, InterviewCandidateStatus } from "@/generated/prisma/enums";
import type { EntrySourceValue } from "@/lib/entry-source";
import { DEFAULT_SITE_CONTENT, type SiteContentValues } from "@/lib/site-content-defaults";

export { RECRUITMENT_SOURCE_LABELS, type EntrySourceValue } from "@/lib/entry-source";

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function toConditionDTO(condition: Condition): Promise<ConditionDTO> {
  const [participantCount, disclosedCount] = await Promise.all([
    prisma.participant.count({ where: { conditionId: condition.id } }),
    prisma.participant.count({ where: { conditionId: condition.id, contact: { isNot: null } } }),
  ]);

  return {
    id: condition.id,
    name: condition.name,
    urgencyEnabled: condition.urgencyEnabled,
    socialProofEnabled: condition.socialProofEnabled,
    authorityBadgesEnabled: condition.authorityBadgesEnabled,
    rewardRarity: condition.rewardRarity.toLowerCase() as ConditionDTO["rewardRarity"],
    contactRequirement: condition.contactRequirement.toLowerCase() as ConditionDTO["contactRequirement"],
    participantCount,
    disclosureRate: pct(disclosedCount, participantCount),
  };
}

type ExperimentWithRelations = Experiment & {
  researcher: { name: string };
  streamers: { streamerId: string }[];
  conditions: Condition[];
};

async function toExperimentDTO(exp: ExperimentWithRelations): Promise<ExperimentDTO> {
  const [participantCount, debriefedCount, conditions] = await Promise.all([
    prisma.participant.count({ where: { experimentId: exp.id } }),
    prisma.debrief.count({ where: { participant: { experimentId: exp.id } } }),
    Promise.all(exp.conditions.map(toConditionDTO)),
  ]);

  return {
    id: exp.id,
    title: exp.title,
    description: exp.description,
    objective: exp.objective,
    status: exp.status,
    startDate: toDateOnly(exp.startDate),
    endDate: exp.endDate ? toDateOnly(exp.endDate) : null,
    ethicsApprovalRef: exp.ethicsApprovalRef,
    researcherName: exp.researcher.name,
    conditions,
    participantCount,
    completionRate: pct(debriefedCount, participantCount),
    assignedStreamerIds: exp.streamers.map((s) => s.streamerId),
    createdAt: toDateOnly(exp.createdAt),
  };
}

const experimentInclude = {
  researcher: { select: { name: true } },
  streamers: { select: { streamerId: true } },
  conditions: true,
} as const;

export async function getExperiments(researcherId?: string): Promise<ExperimentDTO[]> {
  const experiments = await prisma.experiment.findMany({
    where: researcherId ? { researcherId } : undefined,
    include: experimentInclude,
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(experiments.map(toExperimentDTO));
}

export async function getExperimentById(id: string): Promise<ExperimentDTO | null> {
  const exp = await prisma.experiment.findUnique({ where: { id }, include: experimentInclude });
  return exp ? toExperimentDTO(exp) : null;
}

async function toStreamerDTO(streamer: Streamer): Promise<StreamerDTO> {
  const [assignedExperiments, links] = await Promise.all([
    prisma.experimentStreamer.count({ where: { streamerId: streamer.id } }),
    prisma.trackingLink.findMany({ where: { streamerId: streamer.id }, select: { id: true } }),
  ]);
  const totalClicks = links.length
    ? await prisma.participant.count({ where: { trackingLinkId: { in: links.map((l) => l.id) } } })
    : 0;

  return {
    id: streamer.id,
    displayName: streamer.displayName,
    platform: streamer.platform as StreamerDTO["platform"],
    channelUrl: streamer.channelUrl,
    category: streamer.category,
    status: streamer.status,
    assignedExperiments,
    totalClicks,
    createdAt: toDateOnly(streamer.createdAt),
  };
}

export async function getStreamers(): Promise<StreamerDTO[]> {
  const streamers = await prisma.streamer.findMany({ orderBy: { createdAt: "desc" } });
  return Promise.all(streamers.map(toStreamerDTO));
}

export async function getStreamerById(id: string): Promise<StreamerDTO | null> {
  const streamer = await prisma.streamer.findUnique({ where: { id } });
  return streamer ? toStreamerDTO(streamer) : null;
}

export async function getStreamerByUserId(userId: string): Promise<StreamerDTO | null> {
  const streamer = await prisma.streamer.findUnique({ where: { userId } });
  return streamer ? toStreamerDTO(streamer) : null;
}

export async function getTrackingLinks(experimentId: string): Promise<TrackingLinkDTO[]> {
  const links = await prisma.trackingLink.findMany({ where: { experimentId }, orderBy: { createdAt: "asc" } });
  return Promise.all(
    links.map(async (link) => {
      const [visits, conversions] = await Promise.all([
        prisma.participant.count({ where: { trackingLinkId: link.id } }),
        prisma.participant.count({ where: { trackingLinkId: link.id, contact: { isNot: null } } }),
      ]);
      return {
        id: link.id,
        experimentId: link.experimentId,
        streamerId: link.streamerId,
        streamSessionId: link.streamSessionId,
        entrySource: link.entrySource as EntrySourceValue,
        uniqueCode: link.uniqueCode,
        visits,
        conversions,
        createdAt: toDateOnly(link.createdAt),
      };
    }),
  );
}

export type StreamSessionRow = {
  id: string;
  streamerId: string;
  streamerName: string;
  platform: string | null;
  gameName: string | null;
  streamTitle: string | null;
  streamStartTime: string | null;
  /** Pre-formatted server-side so the (client) row component never re-derives locale-sensitive text during hydration. */
  streamStartLabel: string;
  streamEndTime: string | null;
  campaignStartTime: string | null;
  campaignEndTime: string | null;
  estimatedViewerCount: number | null;
  /** Pre-formatted server-side for the same reason as `streamStartLabel`. */
  estimatedViewerCountLabel: string;
  qrDisplayed: boolean;
  chatLinkPosted: boolean;
  notes: string | null;
  trackingLinkCount: number;
  participantCount: number;
  createdAt: string;
};

export async function getStreamSessions(experimentId: string): Promise<StreamSessionRow[]> {
  const sessions = await prisma.streamSession.findMany({
    where: { experimentId },
    include: {
      streamer: { select: { displayName: true } },
      trackingLinks: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    sessions.map(async (s) => {
      const linkIds = s.trackingLinks.map((l) => l.id);
      const participantCount = linkIds.length
        ? await prisma.participant.count({ where: { trackingLinkId: { in: linkIds } } })
        : 0;

      return {
        id: s.id,
        streamerId: s.streamerId,
        streamerName: s.streamer.displayName,
        platform: s.platform,
        gameName: s.gameName,
        streamTitle: s.streamTitle,
        streamStartTime: s.streamStartTime ? s.streamStartTime.toISOString() : null,
        streamStartLabel: s.streamStartTime
          ? s.streamStartTime.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
          : "—",
        streamEndTime: s.streamEndTime ? s.streamEndTime.toISOString() : null,
        campaignStartTime: s.campaignStartTime ? s.campaignStartTime.toISOString() : null,
        campaignEndTime: s.campaignEndTime ? s.campaignEndTime.toISOString() : null,
        estimatedViewerCount: s.estimatedViewerCount,
        estimatedViewerCountLabel:
          s.estimatedViewerCount != null ? s.estimatedViewerCount.toLocaleString("en-US") : "—",
        qrDisplayed: s.qrDisplayed,
        chatLinkPosted: s.chatLinkPosted,
        notes: s.notes,
        trackingLinkCount: linkIds.length,
        participantCount,
        createdAt: toDateOnly(s.createdAt),
      };
    }),
  );
}

/** Lightweight options list for the tracking-link create/edit selects. */
export async function getStreamSessionOptions(
  experimentId: string,
): Promise<{ id: string; label: string }[]> {
  const sessions = await prisma.streamSession.findMany({
    where: { experimentId },
    include: { streamer: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return sessions.map((s) => ({
    id: s.id,
    label: `${s.streamer.displayName} — ${s.streamTitle ?? "Untitled stream"}`,
  }));
}

/** Streamers assigned to an experiment, for the participant-facing "which streamer are you watching" select. */
export async function getExperimentStreamerOptions(
  experimentId: string,
): Promise<{ id: string; displayName: string }[]> {
  const assignments = await prisma.experimentStreamer.findMany({
    where: { experimentId },
    include: { streamer: { select: { id: true, displayName: true } } },
    orderBy: { assignedAt: "asc" },
  });
  return assignments.map((a) => a.streamer);
}

// Counts DISTINCT participants who reached each stage at least once (not raw
// event rows — a participant can fire PAGE_VIEW/CTA_CLICKED more than once),
// so the funnel is monotonically non-increasing top to bottom.
export async function getFunnel(experimentId: string): Promise<FunnelStage[]> {
  const [
    websiteVisit,
    ctaClick,
    studyStarted,
    taskCompleted,
    contactSubmitted,
    studyCompleted,
    debriefCompleted,
    interviewAccepted,
  ] = await Promise.all([
    prisma.participant.count({ where: { experimentId, events: { some: { type: "PAGE_VIEW" } } } }),
    prisma.participant.count({ where: { experimentId, events: { some: { type: "CTA_CLICKED" } } } }),
    prisma.participant.count({ where: { experimentId, events: { some: { type: "SPIN_CLICKED" } } } }),
    prisma.participant.count({ where: { experimentId, events: { some: { type: "MODAL_OPENED" } } } }),
    prisma.participant.count({ where: { experimentId, contact: { isNot: null } } }),
    prisma.participant.count({ where: { experimentId, events: { some: { type: "STUDY_COMPLETED" } } } }),
    prisma.debrief.count({
      where: { participant: { experimentId }, debriefStatus: { in: ["ACKNOWLEDGED", "DECLINED"] } },
    }),
    prisma.interviewConsent.count({
      where: { participant: { experimentId }, status: { in: ["ACCEPTED", "SCHEDULED", "COMPLETED", "NO_SHOW"] } },
    }),
  ]);

  return [
    { stage: "Website Visit", count: websiteVisit },
    { stage: "CTA Click", count: ctaClick },
    { stage: "Study Started", count: studyStarted },
    { stage: "Task Completed", count: taskCompleted },
    { stage: "Contact Submitted", count: contactSubmitted },
    { stage: "Study Completed", count: studyCompleted },
    { stage: "Debrief Completed", count: debriefCompleted },
    { stage: "Interview Accepted", count: interviewAccepted },
  ];
}

export type DashboardSummary = {
  totalParticipants: number;
  studyStarted: number;
  studyCompleted: number;
  completionRate: number;
  dropped: number;
  contactsSubmitted: number;
  debriefPending: number;
  debriefCompleted: number;
  dataUseApproved: number;
  interviewAccepted: number;
  interviewCompleted: number;
  eligibleForAnalysis: number;
};

/** Global, across every experiment this researcher owns — the spec's KPI cards aren't per-study. */
export async function getDashboardSummary(researcherId: string): Promise<DashboardSummary> {
  const where = { experiment: { researcherId } };

  const [
    totalParticipants,
    studyStarted,
    studyCompleted,
    contactsSubmitted,
    debriefCompleted,
    dataUseApproved,
    interviewAccepted,
    interviewCompleted,
    ineligibleCount,
  ] = await Promise.all([
    prisma.participant.count({ where }),
    prisma.participant.count({ where: { ...where, events: { some: { type: "SPIN_CLICKED" } } } }),
    prisma.participant.count({ where: { ...where, events: { some: { type: "STUDY_COMPLETED" } } } }),
    prisma.participant.count({ where: { ...where, contact: { isNot: null } } }),
    prisma.debrief.count({
      where: { participant: where, debriefStatus: { in: ["ACKNOWLEDGED", "DECLINED"] } },
    }),
    prisma.consent.count({ where: { participant: where, consentGiven: true, withdrawn: false } }),
    prisma.interviewConsent.count({
      where: { participant: where, status: { in: ["ACCEPTED", "SCHEDULED", "COMPLETED", "NO_SHOW"] } },
    }),
    prisma.interviewConsent.count({ where: { participant: where, status: "COMPLETED" } }),
    prisma.researchEligibility.count({ where: { participant: where, eligible: false } }),
  ]);

  return {
    totalParticipants,
    studyStarted,
    studyCompleted,
    completionRate: pct(studyCompleted, studyStarted),
    dropped: Math.max(studyStarted - studyCompleted, 0),
    contactsSubmitted,
    debriefPending: Math.max(totalParticipants - debriefCompleted, 0),
    debriefCompleted,
    dataUseApproved,
    interviewAccepted,
    interviewCompleted,
    eligibleForAnalysis: Math.max(totalParticipants - ineligibleCount, 0),
  };
}

export type RecruitmentSourceRow = {
  source: EntrySourceValue;
  visits: number;
  studyStarts: number;
  completions: number;
  completionRate: number;
};

export async function getRecruitmentSourceBreakdown(researcherId: string): Promise<RecruitmentSourceRow[]> {
  const linkSources = ["STREAM_QR", "STREAM_CHAT_LINK", "STREAM_DESCRIPTION", "OTHER"] as const;

  const rows = await Promise.all(
    linkSources.map(async (source): Promise<RecruitmentSourceRow> => {
      const where = { experiment: { researcherId }, trackingLink: { entrySource: source } };
      const [visits, studyStarts, completions] = await Promise.all([
        prisma.participant.count({ where }),
        prisma.participant.count({ where: { ...where, events: { some: { type: "SPIN_CLICKED" } } } }),
        prisma.participant.count({ where: { ...where, events: { some: { type: "STUDY_COMPLETED" } } } }),
      ]);
      return { source, visits, studyStarts, completions, completionRate: pct(completions, visits) };
    }),
  );

  // A participant with no trackingLinkId arrived directly (no ?ref= at all).
  const directWhere = { experiment: { researcherId }, trackingLinkId: null };
  const [directVisits, directStarts, directCompletions] = await Promise.all([
    prisma.participant.count({ where: directWhere }),
    prisma.participant.count({ where: { ...directWhere, events: { some: { type: "SPIN_CLICKED" } } } }),
    prisma.participant.count({ where: { ...directWhere, events: { some: { type: "STUDY_COMPLETED" } } } }),
  ]);
  rows.push({
    source: "DIRECT",
    visits: directVisits,
    studyStarts: directStarts,
    completions: directCompletions,
    completionRate: pct(directCompletions, directVisits),
  });

  return rows.filter((r) => r.visits > 0);
}

export type StreamerPerformanceRow = {
  streamerId: string;
  displayName: string;
  streamSessions: number;
  participants: number;
  completed: number;
  completionRate: number;
  interviewAccepted: number;
};

export async function getStreamerPerformance(researcherId: string): Promise<StreamerPerformanceRow[]> {
  const streamers = await prisma.streamer.findMany({
    where: { experiments: { some: { experiment: { researcherId } } } },
    select: { id: true, displayName: true },
  });

  return Promise.all(
    streamers.map(async (s): Promise<StreamerPerformanceRow> => {
      const where = { experiment: { researcherId }, trackingLink: { streamerId: s.id } };
      const [streamSessions, participants, completed, interviewAccepted] = await Promise.all([
        prisma.streamSession.count({ where: { streamerId: s.id, experiment: { researcherId } } }),
        prisma.participant.count({ where }),
        prisma.participant.count({ where: { ...where, events: { some: { type: "STUDY_COMPLETED" } } } }),
        prisma.interviewConsent.count({
          where: { participant: where, status: { in: ["ACCEPTED", "SCHEDULED", "COMPLETED", "NO_SHOW"] } },
        }),
      ]);
      return {
        streamerId: s.id,
        displayName: s.displayName,
        streamSessions,
        participants,
        completed,
        completionRate: pct(completed, participants),
        interviewAccepted,
      };
    }),
  );
}

export type RecentActivityItem = {
  id: string;
  label: string;
  anonymousCode: string;
  timestamp: string;
};

/** Merges a handful of "something happened" signals into one recency-sorted feed. */
export async function getRecentActivity(researcherId: string, limit = 10): Promise<RecentActivityItem[]> {
  const where = { experiment: { researcherId } };
  const participantSelect = { participant: { select: { anonymousCode: true } } };

  const [completedEvents, contactEvents, debriefs, consents, interviewAccepts, interviewCompletes] =
    await Promise.all([
      prisma.engagementEvent.findMany({
        where: { type: "STUDY_COMPLETED", participant: where },
        include: participantSelect,
        orderBy: { timestamp: "desc" },
        take: limit,
      }),
      prisma.engagementEvent.findMany({
        where: { type: "CONTACT_SUBMITTED", participant: where },
        include: participantSelect,
        orderBy: { timestamp: "desc" },
        take: limit,
      }),
      prisma.debrief.findMany({
        where: { participant: where, debriefStatus: { in: ["ACKNOWLEDGED", "DECLINED"] } },
        include: participantSelect,
        orderBy: { timestamp: "desc" },
        take: limit,
      }),
      prisma.consent.findMany({
        where: { participant: where, consentGiven: true, withdrawn: false },
        include: participantSelect,
        orderBy: { timestamp: "desc" },
        take: limit,
      }),
      prisma.interviewConsent.findMany({
        where: { participant: where, status: "ACCEPTED" },
        include: participantSelect,
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      prisma.interviewConsent.findMany({
        where: { participant: where, status: "COMPLETED" },
        include: participantSelect,
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
    ]);

  const items: RecentActivityItem[] = [
    ...completedEvents.map((e) => ({
      id: `study-${e.id}`,
      label: "Participant completed study",
      anonymousCode: e.participant.anonymousCode,
      timestamp: e.timestamp.toISOString(),
    })),
    ...contactEvents.map((e) => ({
      id: `contact-${e.id}`,
      label: "New contact submitted",
      anonymousCode: e.participant.anonymousCode,
      timestamp: e.timestamp.toISOString(),
    })),
    ...debriefs.map((d) => ({
      id: `debrief-${d.id}`,
      label: "Debrief completed",
      anonymousCode: d.participant.anonymousCode,
      timestamp: d.timestamp.toISOString(),
    })),
    ...consents.map((c) => ({
      id: `consent-${c.id}`,
      label: "Data-use permission received",
      anonymousCode: c.participant.anonymousCode,
      timestamp: c.timestamp.toISOString(),
    })),
    ...interviewAccepts.map((i) => ({
      id: `interview-accept-${i.id}`,
      label: "Interview accepted",
      anonymousCode: i.participant.anonymousCode,
      timestamp: (i.consentAt ?? i.updatedAt).toISOString(),
    })),
    ...interviewCompletes.map((i) => ({
      id: `interview-complete-${i.id}`,
      label: "Interview completed",
      anonymousCode: i.participant.anonymousCode,
      timestamp: i.updatedAt.toISOString(),
    })),
  ];

  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
}

export const getSiteContent = cache(async (): Promise<SiteContentValues | null> => {
  const row = await prisma.siteContent.findUnique({ where: { id: "singleton" } });
  if (!row) return null;

  return {
    siteName: row.siteName,
    siteDescription: row.siteDescription,
    heroHeadline: row.heroHeadline,
    heroSubtext: row.heroSubtext,
    claimedCount: row.claimedCount,
    countdownSeconds: row.countdownSeconds,
    trustBadges: row.trustBadges as SiteContentValues["trustBadges"],
    gameCategories: row.gameCategories as SiteContentValues["gameCategories"],
    rewardPool: row.rewardPool as SiteContentValues["rewardPool"],
    gameTypeOptions: row.gameTypeOptions as SiteContentValues["gameTypeOptions"],
    watchFrequencyOptions: row.watchFrequencyOptions as SiteContentValues["watchFrequencyOptions"],
    faqItems: row.faqItems as SiteContentValues["faqItems"],
    navContent: { ...DEFAULT_SITE_CONTENT.navContent, ...(row.navContent as object) },
    footerContent: { ...DEFAULT_SITE_CONTENT.footerContent, ...(row.footerContent as object) },
    aboutContent: { ...DEFAULT_SITE_CONTENT.aboutContent, ...(row.aboutContent as object) },
    supportContent: { ...DEFAULT_SITE_CONTENT.supportContent, ...(row.supportContent as object) },
    termsContent: { ...DEFAULT_SITE_CONTENT.termsContent, ...(row.termsContent as object) },
    debriefContent: { ...DEFAULT_SITE_CONTENT.debriefContent, ...(row.debriefContent as object) },
    entryReceivedContent: {
      ...DEFAULT_SITE_CONTENT.entryReceivedContent,
      ...(row.entryReceivedContent as object),
    },
  };
});

export async function getSurveysForExperiment(experimentId: string) {
  return prisma.survey.findMany({
    where: { experimentId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
}

// ---------------------------------------------------------------------------
// Participant journey — funnel-stage/study-status/data-use-permission are all
// derived at query time from EngagementEvent + Debrief/Consent/InterviewConsent
// presence, never stored redundantly (see the schema's own comments).
// ---------------------------------------------------------------------------

const FUNNEL_STAGE_ORDER = [
  "Website Visit",
  "CTA Click",
  "Study Started",
  "Task Completed",
  "Contact Submitted",
  "Study Completed",
  "Debrief Completed",
  "Interview Accepted",
] as const;

const DEBRIEF_TERMINAL_STATUSES = ["ACKNOWLEDGED", "DECLINED"];
const INTERVIEW_ACCEPTED_STATUSES = ["ACCEPTED", "SCHEDULED", "COMPLETED", "NO_SHOW"];

/**
 * "Study status" only distinguishes completed vs. dropped (not the spec's
 * literal visited/started/in_progress/dropped split) — an admin reviewing
 * this well after the fact can't honestly tell "still in progress right now"
 * from "gave up hours ago" without an arbitrary time threshold, which the
 * research rules explicitly ask not to invent. "Current stage" below still
 * shows exactly where a dropped participant stopped.
 */
function deriveFunnel(input: {
  eventTypes: Set<string>;
  hasContact: boolean;
  debriefStatus: string | null;
  interviewStatus: string | null;
}): { currentStage: string; studyStatus: "completed" | "dropped" } {
  const reached = [
    input.eventTypes.has("PAGE_VIEW"),
    input.eventTypes.has("CTA_CLICKED"),
    input.eventTypes.has("SPIN_CLICKED"),
    input.eventTypes.has("MODAL_OPENED"),
    input.hasContact || input.eventTypes.has("CONTACT_SUBMITTED"),
    input.eventTypes.has("STUDY_COMPLETED"),
    Boolean(input.debriefStatus && DEBRIEF_TERMINAL_STATUSES.includes(input.debriefStatus)),
    Boolean(input.interviewStatus && INTERVIEW_ACCEPTED_STATUSES.includes(input.interviewStatus)),
  ];
  let lastIndex = -1;
  reached.forEach((r, i) => {
    if (r) lastIndex = i;
  });
  return {
    currentStage: lastIndex >= 0 ? FUNNEL_STAGE_ORDER[lastIndex] : "No Activity",
    studyStatus: reached[5] ? "completed" : "dropped",
  };
}

type DataUsePermission = "pending" | "yes" | "no" | "withdrawn";

function deriveDataUsePermission(consent: { consentGiven: boolean; withdrawn: boolean } | null): DataUsePermission {
  if (!consent) return "pending";
  if (consent.withdrawn) return "withdrawn";
  return consent.consentGiven ? "yes" : "no";
}

/** Groups a participant's events by `page` in chronological order; a visit's duration is time-until-the-next-page's-first-event (the last/ongoing page has no known end, so null). */
function computePageDurations(
  events: { page: string | null; timestamp: Date }[],
): { page: string; enteredAt: string; leftAt: string | null; durationSeconds: number | null; visitCount: number }[] {
  const tagged = [...events].filter((e) => e.page).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const visits: { page: string; enteredAt: Date; leftAt: Date | null }[] = [];

  for (const e of tagged) {
    const last = visits[visits.length - 1];
    if (last && last.page === e.page && last.leftAt === null) continue;
    if (last && last.leftAt === null) last.leftAt = e.timestamp;
    if (!last || last.page !== e.page) visits.push({ page: e.page!, enteredAt: e.timestamp, leftAt: null });
  }

  const byPage = new Map<string, { totalSeconds: number; hasOngoing: boolean; visitCount: number; firstEnter: Date; lastLeft: Date | null }>();
  for (const v of visits) {
    const entry = byPage.get(v.page) ?? {
      totalSeconds: 0,
      hasOngoing: false,
      visitCount: 0,
      firstEnter: v.enteredAt,
      lastLeft: null,
    };
    entry.visitCount += 1;
    if (v.leftAt) {
      entry.totalSeconds += (v.leftAt.getTime() - v.enteredAt.getTime()) / 1000;
      entry.lastLeft = v.leftAt;
    } else {
      entry.hasOngoing = true;
    }
    if (v.enteredAt < entry.firstEnter) entry.firstEnter = v.enteredAt;
    byPage.set(v.page, entry);
  }

  return Array.from(byPage.entries()).map(([page, e]) => ({
    page,
    enteredAt: e.firstEnter.toISOString(),
    leftAt: e.lastLeft ? e.lastLeft.toISOString() : null,
    durationSeconds: e.totalSeconds > 0 ? Math.round(e.totalSeconds) : null,
    visitCount: e.visitCount,
  }));
}

export type ParticipantListFilters = {
  q?: string;
  experimentId?: string;
  streamerId?: string;
  entrySource?: EntrySourceValue;
  studyStatus?: "completed" | "dropped";
  contactSubmitted?: boolean;
  debriefStatus?: DebriefStatus;
  dataUsePermission?: DataUsePermission;
  interviewStatus?: InterviewCandidateStatus;
  eligibility?: "eligible" | "excluded";
  /** ISO date (yyyy-mm-dd) — inclusive, compared against Participant.createdAt. */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type ParticipantListRow = {
  id: string;
  anonymousCode: string;
  streamerName: string | null;
  streamSessionTitle: string | null;
  entrySource: EntrySourceValue;
  firstVisit: string;
  currentStage: string;
  studyStatus: "completed" | "dropped";
  contactSubmitted: boolean;
  debriefStatus: string;
  dataUsePermission: DataUsePermission;
  interviewStatus: string;
  eligibility: "eligible" | "excluded";
};

export type ParticipantListResult = {
  rows: ParticipantListRow[];
  total: number;
  page: number;
  pageSize: number;
};

/** Deliberately excludes emailOrPhone/phone — contact details live in a separate encrypted table and are never rendered in a list view. */
export async function getParticipantRows(filters: ParticipantListFilters = {}): Promise<ParticipantListResult> {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);

  const and: Prisma.ParticipantWhereInput[] = [];
  if (filters.experimentId) and.push({ experimentId: filters.experimentId });
  if (filters.q) {
    and.push({
      OR: [
        { anonymousCode: { contains: filters.q, mode: "insensitive" } },
        { streamer: { displayName: { contains: filters.q, mode: "insensitive" } } },
        { trackingLink: { streamer: { displayName: { contains: filters.q, mode: "insensitive" } } } },
      ],
    });
  }
  if (filters.streamerId) {
    and.push({ OR: [{ streamerId: filters.streamerId }, { trackingLink: { streamerId: filters.streamerId } }] });
  }
  if (filters.entrySource === "DIRECT") and.push({ trackingLinkId: null });
  else if (filters.entrySource) and.push({ trackingLink: { entrySource: filters.entrySource } });
  if (filters.studyStatus === "completed") and.push({ events: { some: { type: "STUDY_COMPLETED" } } });
  if (filters.studyStatus === "dropped") and.push({ events: { none: { type: "STUDY_COMPLETED" } } });
  if (filters.contactSubmitted === true) and.push({ contact: { isNot: null } });
  if (filters.contactSubmitted === false) and.push({ contact: null });
  if (filters.debriefStatus) and.push({ debrief: { debriefStatus: filters.debriefStatus } });
  if (filters.dataUsePermission === "pending") and.push({ consent: null });
  if (filters.dataUsePermission === "yes") and.push({ consent: { consentGiven: true, withdrawn: false } });
  if (filters.dataUsePermission === "no") and.push({ consent: { consentGiven: false, withdrawn: false } });
  if (filters.dataUsePermission === "withdrawn") and.push({ consent: { withdrawn: true } });
  if (filters.interviewStatus) and.push({ interviewConsent: { status: filters.interviewStatus } });
  if (filters.eligibility === "excluded") and.push({ researchEligibility: { eligible: false } });
  if (filters.eligibility === "eligible") {
    and.push({ OR: [{ researchEligibility: null }, { researchEligibility: { eligible: true } }] });
  }
  if (filters.from) and.push({ createdAt: { gte: new Date(`${filters.from}T00:00:00.000Z`) } });
  if (filters.to) and.push({ createdAt: { lte: new Date(`${filters.to}T23:59:59.999Z`) } });

  const where: Prisma.ParticipantWhereInput = and.length ? { AND: and } : {};

  const [total, participants] = await Promise.all([
    prisma.participant.count({ where }),
    prisma.participant.findMany({
      where,
      include: {
        streamer: { select: { displayName: true } },
        trackingLink: {
          include: {
            streamer: { select: { displayName: true } },
            streamSession: { select: { streamTitle: true } },
          },
        },
        contact: { select: { id: true } },
        debrief: { select: { debriefStatus: true } },
        consent: { select: { consentGiven: true, withdrawn: true } },
        interviewConsent: { select: { status: true } },
        researchEligibility: { select: { eligible: true } },
        events: { select: { type: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const rows: ParticipantListRow[] = participants.map((p) => {
    const eventTypes = new Set<string>(p.events.map((e) => e.type));
    const { currentStage, studyStatus } = deriveFunnel({
      eventTypes,
      hasContact: Boolean(p.contact),
      debriefStatus: p.debrief?.debriefStatus ?? null,
      interviewStatus: p.interviewConsent?.status ?? null,
    });

    return {
      id: p.id,
      anonymousCode: p.anonymousCode,
      streamerName: p.streamer?.displayName ?? p.trackingLink?.streamer?.displayName ?? null,
      streamSessionTitle: p.trackingLink?.streamSession?.streamTitle ?? null,
      entrySource: (p.trackingLinkId ? (p.trackingLink?.entrySource ?? "OTHER") : "DIRECT") as EntrySourceValue,
      firstVisit: p.createdAt.toISOString(),
      currentStage,
      studyStatus,
      contactSubmitted: Boolean(p.contact),
      debriefStatus: p.debrief?.debriefStatus ?? "PENDING",
      dataUsePermission: deriveDataUsePermission(p.consent),
      interviewStatus: p.interviewConsent?.status ?? "NOT_INVITED",
      eligibility: p.researchEligibility?.eligible === false ? "excluded" : "eligible",
    };
  });

  return { rows, total, page, pageSize };
}

/** Full research profile for one participant — the 7-section detail page reads straight off this. */
export async function getParticipantDetail(participantId: string) {
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: {
      experiment: { select: { title: true } },
      condition: { select: { name: true } },
      streamer: { select: { displayName: true } },
      trackingLink: {
        include: {
          streamer: { select: { displayName: true } },
          streamSession: { select: { streamTitle: true } },
        },
      },
      contact: { select: { id: true, createdAt: true } },
      contactWorkflow: { include: { researcherAssigned: { select: { name: true } } } },
      contactAttempts: { include: { researcher: { select: { name: true } } }, orderBy: { attemptedAt: "desc" } },
      debrief: true,
      consent: true,
      interviewConsent: true,
      interviews: { include: { interviewer: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      researchEligibility: { include: { excludedByUser: { select: { name: true } } } },
      responses: { include: { survey: { include: { questions: true } } } },
      events: { orderBy: { timestamp: "asc" } },
    },
  });
  if (!participant) return null;

  const eventTypes = new Set<string>(participant.events.map((e) => e.type));
  const { currentStage, studyStatus } = deriveFunnel({
    eventTypes,
    hasContact: Boolean(participant.contact),
    debriefStatus: participant.debrief?.debriefStatus ?? null,
    interviewStatus: participant.interviewConsent?.status ?? null,
  });

  const lastActivity = participant.events.length
    ? participant.events[participant.events.length - 1].timestamp.toISOString()
    : null;

  const responses = participant.responses.flatMap((r) => {
    const answers = r.answers as Record<string, string | number>;
    return r.survey.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .filter((q) => answers[q.id] !== undefined)
      .map((q) => ({
        surveyTitle: r.survey.title,
        questionOrder: q.order,
        questionText: q.questionText,
        answer: answers[q.id],
      }));
  });

  return {
    id: participant.id,
    anonymousCode: participant.anonymousCode,
    experimentTitle: participant.experiment.title,
    conditionName: participant.condition?.name ?? null,
    streamerName: participant.streamer?.displayName ?? null,
    linkStreamerName: participant.trackingLink?.streamer?.displayName ?? null,
    streamSessionTitle: participant.trackingLink?.streamSession?.streamTitle ?? null,
    entrySource: (participant.trackingLinkId
      ? (participant.trackingLink?.entrySource ?? "OTHER")
      : "DIRECT") as EntrySourceValue,
    firstVisit: participant.createdAt.toISOString(),
    lastActivity,
    currentStage,
    studyStatus,
    rewardLabel: participant.rewardLabel,
    rewardRarity: participant.rewardRarity,

    events: participant.events.map((e) => ({
      id: e.id,
      type: e.type as string,
      page: e.page,
      element: e.element,
      eventValue: e.eventValue,
      timestamp: e.timestamp.toISOString(),
    })),
    pageDurations: computePageDurations(participant.events),

    responses,

    hasContact: Boolean(participant.contact),
    contactSubmittedAt: participant.contact?.createdAt.toISOString() ?? null,
    contactWorkflow: participant.contactWorkflow
      ? {
          contactStatus: participant.contactWorkflow.contactStatus as string,
          preferredContactChannel: participant.contactWorkflow.preferredContactChannel,
          nextFollowupAt: participant.contactWorkflow.nextFollowupAt?.toISOString() ?? null,
          researcherAssignedName: participant.contactWorkflow.researcherAssigned?.name ?? null,
          prizeFulfillmentStatus: participant.contactWorkflow.prizeFulfillmentStatus as string | null,
          prizeDeliveredAt: participant.contactWorkflow.prizeDeliveredAt?.toISOString() ?? null,
          contactNotes: participant.contactWorkflow.contactNotes,
        }
      : null,
    contactAttempts: participant.contactAttempts.map((a) => ({
      id: a.id,
      attemptedAt: a.attemptedAt.toISOString(),
      outcome: a.outcome as string,
      note: a.note,
      researcherName: a.researcher?.name ?? null,
    })),

    debrief: participant.debrief
      ? {
          explanationShown: participant.debrief.explanationShown,
          permissionGiven: participant.debrief.permissionGiven,
          debriefStatus: participant.debrief.debriefStatus as string,
          debriefMethod: participant.debrief.debriefMethod as string | null,
          debriefSentAt: participant.debrief.debriefSentAt?.toISOString() ?? null,
          debriefNotes: participant.debrief.debriefNotes,
        }
      : null,

    dataUsePermission: deriveDataUsePermission(participant.consent),
    consentNotes: participant.consent?.notes ?? null,

    interviewConsent: participant.interviewConsent
      ? {
          invited: participant.interviewConsent.invited,
          invitedAt: participant.interviewConsent.invitedAt?.toISOString() ?? null,
          consent: participant.interviewConsent.consent as string,
          consentAt: participant.interviewConsent.consentAt?.toISOString() ?? null,
          status: participant.interviewConsent.status as string,
          preferredContactTime: participant.interviewConsent.preferredContactTime,
          notes: participant.interviewConsent.notes,
        }
      : null,
    interviews: participant.interviews.map((i) => ({
      id: i.id,
      interviewerName: i.interviewer?.name ?? null,
      interviewMode: i.interviewMode as string | null,
      status: i.status as string,
      scheduledAt: i.scheduledAt?.toISOString() ?? null,
      durationMinutes: i.durationMinutes,
      summary: i.summary,
      themes: i.themes,
      researcherNotes: i.researcherNotes,
      transcriptFileUrl: i.transcriptFileUrl,
      recordingFileUrl: i.recordingFileUrl,
    })),

    eligibility: {
      eligible: participant.researchEligibility?.eligible ?? true,
      exclusionReason: participant.researchEligibility?.exclusionReason as string | null,
      excludedAt: participant.researchEligibility?.excludedAt?.toISOString() ?? null,
      excludedByName: participant.researchEligibility?.excludedByUser?.name ?? null,
      reviewNotes: participant.researchEligibility?.reviewNotes ?? null,
    },
  };
}

export type ParticipantDetail = NonNullable<Awaited<ReturnType<typeof getParticipantDetail>>>;
