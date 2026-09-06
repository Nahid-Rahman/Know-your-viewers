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
import { DEFAULT_SITE_CONTENT, type SiteContentValues } from "@/lib/site-content-defaults";

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
        uniqueCode: link.uniqueCode,
        visits,
        conversions,
        createdAt: toDateOnly(link.createdAt),
      };
    }),
  );
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
  source: "STREAM_QR" | "STREAM_CHAT_LINK" | "STREAM_DESCRIPTION" | "DIRECT" | "OTHER";
  visits: number;
  studyStarts: number;
  completions: number;
  completionRate: number;
};

export const RECRUITMENT_SOURCE_LABELS: Record<RecruitmentSourceRow["source"], string> = {
  STREAM_QR: "QR Code",
  STREAM_CHAT_LINK: "Chat Link",
  STREAM_DESCRIPTION: "Stream Description",
  DIRECT: "Direct",
  OTHER: "Other",
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

export type ParticipantRow = {
  anonymousCode: string;
  conditionName: string;
  streamerName: string | null;
  consentStatus: "PENDING" | "GRANTED" | "DECLINED";
  spun: boolean;
  submittedContact: boolean;
  debriefed: boolean;
  permissionGiven: boolean | null;
};

/** Deliberately excludes emailOrPhone / streamNickname — contact details live in a separate encrypted table and are never rendered here. */
export async function getParticipantRows(experimentId: string): Promise<ParticipantRow[]> {
  const participants = await prisma.participant.findMany({
    where: { experimentId },
    include: {
      condition: { select: { name: true } },
      streamer: { select: { displayName: true } },
      contact: { select: { id: true } },
      debrief: { select: { permissionGiven: true } },
      events: { where: { type: "SPIN_CLICKED" }, select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  return participants.map((p) => ({
    anonymousCode: p.anonymousCode,
    conditionName: p.condition?.name ?? "Unassigned",
    streamerName: p.streamer?.displayName ?? null,
    consentStatus: p.consentStatus,
    spun: p.events.length > 0,
    submittedContact: Boolean(p.contact),
    debriefed: Boolean(p.debrief),
    permissionGiven: p.debrief?.permissionGiven ?? null,
  }));
}
