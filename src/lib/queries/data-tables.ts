import "server-only";
import { prisma } from "@/lib/prisma";
import { getBehavioralDatasetRows } from "@/lib/queries/research";
import type { DataTableKey } from "@/lib/data-table-options";

export type { DataTableKey } from "@/lib/data-table-options";
export { DATA_TABLE_OPTIONS } from "@/lib/data-table-options";

export type DataTableResult = {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  total: number;
};

const PAGE_SIZE = 30;

function fmtDate(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

async function participantsTable(page: number): Promise<DataTableResult> {
  const [total, rows] = await Promise.all([
    prisma.participant.count(),
    prisma.participant.findMany({
      include: {
        experiment: { select: { title: true } },
        condition: { select: { name: true } },
        streamer: { select: { displayName: true } },
        trackingLink: { select: { uniqueCode: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return {
    columns: ["Participant", "Experiment", "Condition", "Streamer", "Tracking Link", "Consent Status", "Reward", "Rarity", "Created At"],
    rows: rows.map((p) => [
      p.anonymousCode,
      p.experiment.title,
      p.condition?.name ?? null,
      p.streamer?.displayName ?? null,
      p.trackingLink?.uniqueCode ?? null,
      p.consentStatus,
      p.rewardLabel,
      p.rewardRarity,
      fmtDate(p.createdAt),
    ]),
    total,
  };
}

async function participantSessionsTable(page: number): Promise<DataTableResult> {
  const all = await getBehavioralDatasetRows();
  const total = all.length;
  const slice = all.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE);
  return {
    columns: ["Participant", "Entry Source", "Current Stage", "Study Status", "First Visit"],
    rows: slice.map((r) => [r.participantId, r.entrySource, r.currentStage, r.studyStatus, r.firstVisit]),
    total,
  };
}

async function participantEventsTable(page: number): Promise<DataTableResult> {
  const [total, rows] = await Promise.all([
    prisma.engagementEvent.count(),
    prisma.engagementEvent.findMany({
      include: { participant: { select: { anonymousCode: true } } },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return {
    columns: ["Participant", "Type", "Page", "Element", "Event Value", "Timestamp"],
    rows: rows.map((e) => [e.participant.anonymousCode, e.type, e.page, e.element, e.eventValue, fmtDate(e.timestamp)]),
    total,
  };
}

async function participantResponsesTable(page: number): Promise<DataTableResult> {
  const [total, rows] = await Promise.all([
    prisma.response.count(),
    prisma.response.findMany({
      include: {
        participant: { select: { anonymousCode: true } },
        survey: { select: { title: true, questions: { select: { id: true, order: true, questionText: true } } } },
      },
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const out: (string | number | boolean | null)[][] = [];
  for (const r of rows) {
    const answers = r.answers as Record<string, string | number>;
    for (const q of r.survey.questions.slice().sort((a, b) => a.order - b.order)) {
      const answer = answers[q.id] !== undefined ? answers[q.id] : answers[`q${q.order}`];
      if (answer === undefined) continue;
      out.push([r.participant.anonymousCode, r.survey.title, q.order, q.questionText, answer, fmtDate(r.submittedAt)]);
    }
  }
  return {
    columns: ["Participant", "Survey", "Q#", "Question", "Answer", "Submitted At"],
    rows: out,
    total,
  };
}

async function streamersTable(page: number): Promise<DataTableResult> {
  const [total, rows] = await Promise.all([
    prisma.streamer.count(),
    prisma.streamer.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return {
    columns: ["Streamer", "Platform", "Channel URL", "Category", "Status", "Created At"],
    rows: rows.map((s) => [s.displayName, s.platform, s.channelUrl, s.category, s.status, fmtDate(s.createdAt)]),
    total,
  };
}

async function streamSessionsTable(page: number): Promise<DataTableResult> {
  const [total, rows] = await Promise.all([
    prisma.streamSession.count(),
    prisma.streamSession.findMany({
      include: { streamer: { select: { displayName: true } }, experiment: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return {
    columns: [
      "Streamer",
      "Experiment",
      "Platform",
      "Game",
      "Stream Title",
      "Stream Start",
      "Stream End",
      "Est. Viewers",
      "QR Displayed",
      "Chat Link Posted",
    ],
    rows: rows.map((s) => [
      s.streamer.displayName,
      s.experiment.title,
      s.platform,
      s.gameName,
      s.streamTitle,
      fmtDate(s.streamStartTime),
      fmtDate(s.streamEndTime),
      s.estimatedViewerCount,
      s.qrDisplayed,
      s.chatLinkPosted,
    ]),
    total,
  };
}

async function recruitmentSourcesTable(page: number): Promise<DataTableResult> {
  const [total, links] = await Promise.all([
    prisma.trackingLink.count(),
    prisma.trackingLink.findMany({
      include: { streamer: { select: { displayName: true } }, streamSession: { select: { streamTitle: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const rows = await Promise.all(
    links.map(async (l) => {
      const [visits, conversions] = await Promise.all([
        prisma.participant.count({ where: { trackingLinkId: l.id } }),
        prisma.participant.count({ where: { trackingLinkId: l.id, contact: { isNot: null } } }),
      ]);
      return [
        l.uniqueCode,
        l.entrySource,
        l.streamer?.displayName ?? null,
        l.streamSession?.streamTitle ?? null,
        visits,
        conversions,
      ];
    }),
  );
  return {
    columns: ["Code", "Entry Source", "Streamer", "Stream Session", "Visits", "Conversions"],
    rows,
    total,
  };
}

async function participantContactsTable(page: number): Promise<DataTableResult> {
  const [total, rows] = await Promise.all([
    prisma.participantContact.count(),
    prisma.participantContact.findMany({
      include: { participant: { select: { anonymousCode: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return {
    // Never decrypted here — see Research Dataset -> Contact export (restricted) for that.
    columns: ["Participant", "Stream Nickname", "Favourite Game Type", "Livestream Frequency", "Has Phone", "Submitted At"],
    rows: rows.map((c) => [
      c.participant.anonymousCode,
      c.streamNickname,
      c.favouriteGameType,
      c.livestreamFrequency,
      c.encryptedPhone !== null,
      fmtDate(c.createdAt),
    ]),
    total,
  };
}

async function debriefRecordsTable(page: number): Promise<DataTableResult> {
  const [total, rows] = await Promise.all([
    prisma.debrief.count(),
    prisma.debrief.findMany({
      include: { participant: { select: { anonymousCode: true } } },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return {
    columns: ["Participant", "Debrief Status", "Method", "Explanation Shown", "Permission Given", "Sent At", "Timestamp"],
    rows: rows.map((d) => [
      d.participant.anonymousCode,
      d.debriefStatus,
      d.debriefMethod,
      d.explanationShown,
      d.permissionGiven,
      fmtDate(d.debriefSentAt),
      fmtDate(d.timestamp),
    ]),
    total,
  };
}

async function dataUsePermissionsTable(page: number): Promise<DataTableResult> {
  const [total, rows] = await Promise.all([
    prisma.consent.count(),
    prisma.consent.findMany({
      include: { participant: { select: { anonymousCode: true } } },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return {
    columns: ["Participant", "Consent Given", "Consent Version", "Withdrawn", "Withdrawn At", "Timestamp", "Notes"],
    rows: rows.map((c) => [
      c.participant.anonymousCode,
      c.consentGiven,
      c.consentVersion,
      c.withdrawn,
      fmtDate(c.withdrawnAt),
      fmtDate(c.timestamp),
      c.notes,
    ]),
    total,
  };
}

async function interviewConsentsTable(page: number): Promise<DataTableResult> {
  const [total, rows] = await Promise.all([
    prisma.interviewConsent.count(),
    prisma.interviewConsent.findMany({
      include: { participant: { select: { anonymousCode: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return {
    columns: ["Participant", "Invited", "Invited At", "Consent", "Consent At", "Status", "Preferred Contact Time"],
    rows: rows.map((c) => [
      c.participant.anonymousCode,
      c.invited,
      fmtDate(c.invitedAt),
      c.consent,
      fmtDate(c.consentAt),
      c.status,
      c.preferredContactTime,
    ]),
    total,
  };
}

async function interviewsTable(page: number): Promise<DataTableResult> {
  const [total, rows] = await Promise.all([
    prisma.interview.count(),
    prisma.interview.findMany({
      include: { participant: { select: { anonymousCode: true } }, interviewer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return {
    columns: ["Participant", "Interviewer", "Mode", "Status", "Scheduled At", "Duration (min)", "Themes", "Summary"],
    rows: rows.map((i) => [
      i.participant.anonymousCode,
      i.interviewer?.name ?? null,
      i.interviewMode,
      i.status,
      fmtDate(i.scheduledAt),
      i.durationMinutes,
      i.themes.join("; "),
      i.summary,
    ]),
    total,
  };
}

async function researchEligibilityTable(page: number): Promise<DataTableResult> {
  const [total, rows] = await Promise.all([
    prisma.researchEligibility.count(),
    prisma.researchEligibility.findMany({
      include: { participant: { select: { anonymousCode: true } }, excludedByUser: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return {
    columns: ["Participant", "Eligible", "Exclusion Reason", "Excluded At", "Excluded By", "Review Notes"],
    rows: rows.map((r) => [
      r.participant.anonymousCode,
      r.eligible,
      r.exclusionReason,
      fmtDate(r.excludedAt),
      r.excludedByUser?.name ?? null,
      r.reviewNotes,
    ]),
    total,
  };
}

const TABLE_LOADERS: Record<DataTableKey, (page: number) => Promise<DataTableResult>> = {
  participants: participantsTable,
  participant_sessions: participantSessionsTable,
  participant_events: participantEventsTable,
  participant_responses: participantResponsesTable,
  streamers: streamersTable,
  stream_sessions: streamSessionsTable,
  recruitment_sources: recruitmentSourcesTable,
  participant_contacts: participantContactsTable,
  debrief_records: debriefRecordsTable,
  data_use_permissions: dataUsePermissionsTable,
  interview_consents: interviewConsentsTable,
  interviews: interviewsTable,
  research_eligibility: researchEligibilityTable,
};

export async function getDataTable(key: DataTableKey, page: number): Promise<DataTableResult> {
  return TABLE_LOADERS[key](Math.max(page, 1));
}

export { PAGE_SIZE as DATA_TABLE_PAGE_SIZE };
