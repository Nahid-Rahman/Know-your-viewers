import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { currentPermissions, type PermissionStatusValue } from "./submission-admin";
import { entryState } from "./session-state";

export async function getStudySessions(experimentId: string) {
  const sessions = await prisma.streamSession.findMany({
    where: { experimentId },
    include: {
      streamer: { select: { displayName: true } },
      currentConfig: { select: { version: true } },
      _count: { select: { visits: true, submissions: true, platformMetrics: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const now = new Date();
  return sessions.map((s) => ({ ...s, entry: entryState(s, now) }));
}

export async function getSessionDetail(sessionId: string) {
  return prisma.streamSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      streamer: true,
      experiment: { select: { id: true, title: true, ethicsApprovalRef: true } },
      currentConfig: true,
      configs: { select: { id: true, version: true, createdAt: true, createdBy: { select: { name: true } } }, orderBy: { version: "desc" } },
      timingChanges: { orderBy: { changedAt: "desc" } },
      annotations: { orderBy: { occurredAt: "asc" } },
      platformMetrics: { orderBy: { measuredAt: "desc" } },
      trackingLinks: { select: { id: true, uniqueCode: true, entrySource: true } },
    },
  });
}

export type SubmissionListFilters = {
  scope: string[];
  q?: string;
  experimentId?: string;
  sessionId?: string;
  streamerId?: string;
  view?: "valid" | "duplicates" | "all";
  includeTest?: boolean;
  ageGroup?: "BELOW_18" | "AGE_18_30" | "AGE_31_PLUS";
  permission?: PermissionStatusValue;
  followUp?: string;
  research?: "eligible" | "excluded";
  winner?: "winner" | "not_winner";
  payout?: "PENDING" | "PAID" | "FAILED" | "UNREACHABLE";
  from?: string;
  to?: string;
  page?: number;
};

export const SUBMISSION_PAGE_SIZE = 25;

export async function listSubmissions(f: SubmissionListFilters) {
  const and: Prisma.SubmissionWhereInput[] = [{ experimentId: { in: f.scope } }];
  if (f.experimentId) and.push({ experimentId: f.experimentId });
  if (f.sessionId) and.push({ streamSessionId: f.sessionId });
  if (f.streamerId) and.push({ streamSession: { streamerId: f.streamerId } });
  // Valid entries (canonical) are the default view; duplicates are inspected separately.
  if ((f.view ?? "valid") === "valid") and.push({ status: "CANONICAL" });
  if (f.view === "duplicates") and.push({ status: "DUPLICATE" });
  if (!f.includeTest) and.push({ isTest: false });
  if (f.ageGroup) and.push({ ageGroup: f.ageGroup });
  if (f.q) {
    const q = f.q.trim().toUpperCase();
    and.push({ OR: [{ responseCode: { contains: q } }, { canonical: { responseCode: { contains: q } } }] });
  }
  if (f.followUp) {
    and.push(
      f.followUp === "NOT_CONTACTED"
        ? { OR: [{ followUp: null }, { followUp: { status: "NOT_CONTACTED" } }] }
        : { followUp: { status: f.followUp as Prisma.EnumFollowUpStatusFilter["equals"] } },
    );
  }
  if (f.research === "excluded") and.push({ OR: [{ researchExcluded: true }, { researchDataPurgedAt: { not: null } }] });
  if (f.research === "eligible") and.push({ researchExcluded: false, researchDataPurgedAt: null });
  if (f.winner === "winner") and.push({ drawWins: { some: { draw: { status: "FINALIZED" } } } });
  if (f.winner === "not_winner") and.push({ drawWins: { none: { draw: { status: "FINALIZED" } } } });
  if (f.payout) and.push({ drawWins: { some: { payoutStatus: f.payout, draw: { status: "FINALIZED" } } } });
  if (f.from) and.push({ submittedAt: { gte: new Date(`${f.from}T00:00:00+06:00`) } });
  if (f.to) and.push({ submittedAt: { lte: new Date(`${f.to}T23:59:59.999+06:00`) } });

  const where: Prisma.SubmissionWhereInput = { AND: and };
  const page = Math.max(f.page ?? 1, 1);
  const include = {
    streamSession: { select: { streamTitle: true, streamer: { select: { displayName: true } } } },
    canonical: { select: { responseCode: true } },
    permissions: { select: { type: true, status: true, recordedAt: true } },
    followUp: { select: { status: true } },
    drawWins: { where: { draw: { status: "FINALIZED" as const } }, select: { payoutStatus: true, rank: true } },
  } satisfies Prisma.SubmissionInclude;

  // Permission filter is on the derived latest status, so it is applied after loading.
  if (f.permission) {
    const all = await prisma.submission.findMany({ where, include, orderBy: { submittedAt: "desc" } });
    const filtered = all.filter((s) => currentPermissions(s.permissions).WEBSITE_DATA_USE === f.permission);
    return {
      rows: filtered.slice((page - 1) * SUBMISSION_PAGE_SIZE, page * SUBMISSION_PAGE_SIZE),
      total: filtered.length,
      page,
    };
  }
  const [total, rows] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.findMany({
      where,
      include,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * SUBMISSION_PAGE_SIZE,
      take: SUBMISSION_PAGE_SIZE,
    }),
  ]);
  return { rows, total, page };
}

export async function getSubmissionDetail(id: string) {
  return prisma.submission.findUniqueOrThrow({
    where: { id },
    include: {
      experiment: { select: { id: true, title: true } },
      streamSession: { include: { streamer: { select: { displayName: true } } } },
      config: { select: { version: true } },
      visit: true,
      trackingLink: { select: { uniqueCode: true, entrySource: true } },
      spinOutcome: true,
      contact: { select: { phoneTail: true, phonePurgedAt: true, optionalPurgedAt: true } },
      canonical: { select: { id: true, responseCode: true, submittedAt: true } },
      duplicates: { select: { id: true, responseCode: true, submittedAt: true }, orderBy: { submittedAt: "asc" } },
      permissions: { include: { recordedBy: { select: { name: true } } }, orderBy: { recordedAt: "desc" } },
      followUp: { include: { assignedTo: { select: { name: true } } } },
      attempts: { include: { researcher: { select: { name: true } } }, orderBy: { attemptedAt: "desc" } },
      interviews: { include: { interviewer: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      drawWins: { include: { draw: { select: { id: true, status: true, executedAt: true, isTest: true } } } },
    },
  });
}

/** Events of the submission's visit (bounded), for the detail timeline. */
export async function getVisitTimeline(visitId: string) {
  return prisma.studyEvent.findMany({
    where: { visitId },
    select: { id: true, type: true, element: true, occurredAt: true, submissionId: true },
    orderBy: { occurredAt: "asc" },
    take: 200,
  });
}

export async function getAuditEntries(where: Prisma.AuditLogWhereInput, take = 100) {
  return prisma.auditLog.findMany({ where, include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take });
}

export async function getPolicies(experimentId: string) {
  return prisma.studyPolicyDecision.findMany({ where: { experimentId }, include: { decidedBy: { select: { name: true } } } });
}

export async function getDraws(experimentId: string) {
  return prisma.rewardDraw.findMany({
    where: { experimentId },
    include: {
      executedBy: { select: { name: true } },
      winners: { include: { submission: { select: { id: true, responseCode: true, ageGroup: true } } }, orderBy: { rank: "asc" } },
    },
    orderBy: { executedAt: "desc" },
  });
}

export async function getExperimentAccessList(experimentId: string) {
  const [exp, collaborators] = await Promise.all([
    prisma.experiment.findUniqueOrThrow({ where: { id: experimentId }, select: { researcher: { select: { id: true, name: true, email: true } } } }),
    prisma.experimentCollaborator.findMany({ where: { experimentId }, include: { user: { select: { id: true, name: true, email: true } } } }),
  ]);
  return { owner: exp.researcher, collaborators };
}
