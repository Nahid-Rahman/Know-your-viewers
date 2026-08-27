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

export async function getFunnel(experimentId: string): Promise<FunnelStage[]> {
  const [landed, spun, opened, submitted, debriefed, granted] = await Promise.all([
    prisma.engagementEvent.count({ where: { type: "PAGE_VIEW", participant: { experimentId } } }),
    prisma.engagementEvent.count({ where: { type: "SPIN_CLICKED", participant: { experimentId } } }),
    prisma.engagementEvent.count({ where: { type: "MODAL_OPENED", participant: { experimentId } } }),
    prisma.participant.count({ where: { experimentId, contact: { isNot: null } } }),
    prisma.debrief.count({ where: { participant: { experimentId } } }),
    prisma.debrief.count({ where: { participant: { experimentId }, permissionGiven: true } }),
  ]);

  return [
    { stage: "Landed", count: landed },
    { stage: "Spun", count: spun },
    { stage: "Opened entry form", count: opened },
    { stage: "Submitted contact", count: submitted },
    { stage: "Reached debrief", count: debriefed },
    { stage: "Granted permission", count: granted },
  ];
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
      contact: { select: { id: true } },
      debrief: { select: { permissionGiven: true } },
      events: { where: { type: "SPIN_CLICKED" }, select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  return participants.map((p) => ({
    anonymousCode: p.anonymousCode,
    conditionName: p.condition?.name ?? "Unassigned",
    consentStatus: p.consentStatus,
    spun: p.events.length > 0,
    submittedContact: Boolean(p.contact),
    debriefed: Boolean(p.debrief),
    permissionGiven: p.debrief?.permissionGiven ?? null,
  }));
}
