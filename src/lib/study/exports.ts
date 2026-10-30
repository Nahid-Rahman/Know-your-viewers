import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptContact } from "@/lib/crypto";
import { toCsv } from "@/lib/csv";
import type { Prisma } from "@/generated/prisma/client";
import { audit, assertExperimentAccess, type Actor, type AccessLevel } from "./access";
import { AGE_GROUP_LABELS } from "./constants";
import { analyticsPhase } from "./session-state";
import { currentPermissions } from "./submission-admin";
import { sessionFunnel, submissionSummary, phaseSplit } from "./stats";

export const STUDY_EXPORTS = {
  "research-submissions": {
    label: "Research analysis — eligible submissions",
    description:
      "Canonical, non-test, adult (18–30 / 31+) submissions with website-data use GRANTED and not excluded or purged. No phone, email, IGN or social values — only whether optional fields were supplied.",
    level: "read" as AccessLevel,
    sensitive: false,
  },
  "research-interviews": {
    label: "Research analysis — interview answers",
    description: "Interview summaries/themes only where interview-answer use is GRANTED and the submission is research-eligible. No identifiers.",
    level: "read" as AccessLevel,
    sensitive: false,
  },
  "aggregate-funnel": {
    label: "Aggregate traffic and funnel",
    description:
      "Per-session distinct-visit funnel, live/post-stream split, saved/canonical/duplicate counts and the aggregate under-18 submission count. No row-level data.",
    level: "read" as AccessLevel,
    sensitive: false,
  },
  "duplicate-statistics": {
    label: "Duplicate statistics",
    description: "Each duplicate submission with its own code, the canonical code and timing. No phone values.",
    level: "read" as AccessLevel,
    sensitive: false,
  },
  "operational-followup": {
    label: "Operational follow-up (RESTRICTED — contains phone numbers)",
    description: "Canonical submissions with decrypted phone for authorized follow-up calls. Audited. Do not use for analysis.",
    level: "contact" as AccessLevel,
    sensitive: true,
  },
  "reward-administration": {
    label: "Reward administration (RESTRICTED — contains phone numbers)",
    description: "Finalized draw winners with payout status and decrypted phone for bKash payment. Audited.",
    level: "contact" as AccessLevel,
    sensitive: true,
  },
} as const;

export type StudyExportType = keyof typeof STUDY_EXPORTS;

/** The research-eligibility rule, in one place. */
export function researchEligibleWhere(experimentId: string): Prisma.SubmissionWhereInput {
  return {
    experimentId,
    isTest: false,
    status: "CANONICAL",
    ageGroup: { not: "BELOW_18" },
    researchExcluded: false,
    researchDataPurgedAt: null,
  };
}

export async function researchEligibleSubmissions(experimentId: string, opts: { includeTest?: boolean } = {}) {
  const where = researchEligibleWhere(experimentId);
  if (opts.includeTest) delete where.isTest;
  const rows = await prisma.submission.findMany({
    where,
    include: {
      permissions: { select: { type: true, status: true, recordedAt: true } },
      streamSession: { include: { streamer: { select: { displayName: true } } } },
      visit: { select: { startedAt: true, lastSeenAt: true, activeMs: true } },
      spinOutcome: { select: { resultKey: true, mechanism: true } },
      followUp: { select: { status: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
  // Permission-dependent: only GRANTED website-data use. Pending, declined,
  // withdrawn and unreachable (still pending) are all left out.
  return rows.filter((r) => currentPermissions(r.permissions).WEBSITE_DATA_USE === "GRANTED");
}

export async function buildStudyExport(actor: Actor, type: StudyExportType, experimentId: string, includeTest = false) {
  const def = STUDY_EXPORTS[type];
  await assertExperimentAccess(actor, experimentId, def.level);
  const exp = await prisma.experiment.findUniqueOrThrow({ where: { id: experimentId }, select: { title: true } });
  let headers: string[] = [];
  let rows: unknown[][] = [];
  const testFilter = includeTest ? {} : { isTest: false };

  if (type === "research-submissions") {
    const subs = await researchEligibleSubmissions(experimentId, { includeTest });
    headers = [
      "study_id", "session_id", "streamer", "session_title", "attribution", "phase", "submitted_at", "age_group",
      "email_provided", "ign_provided", "social_type", "social_provided", "spin_result", "spin_mechanism",
      "visit_elapsed_seconds", "visit_active_seconds_estimate", "follow_up_status", "is_test",
    ];
    rows = subs.map((s) => [
      s.id, s.streamSessionId, s.streamSession.streamer.displayName, s.streamSession.streamTitle, s.attributionSource,
      analyticsPhase(s.streamSession, s.submittedAt), s.submittedAt, AGE_GROUP_LABELS[s.ageGroup], s.emailProvided,
      s.ignProvided, s.socialType ?? "", s.socialProvided, s.spinOutcome?.resultKey ?? "", s.spinOutcome?.mechanism ?? "",
      Math.round((s.visit.lastSeenAt.getTime() - s.visit.startedAt.getTime()) / 1000), Math.round(s.visit.activeMs / 1000),
      s.followUp?.status ?? "NOT_CONTACTED", s.isTest,
    ]);
  } else if (type === "research-interviews") {
    const subs = await researchEligibleSubmissions(experimentId, { includeTest });
    const allowed = subs.filter((s) => currentPermissions(s.permissions).INTERVIEW_ANSWERS_USE === "GRANTED");
    const interviews = await prisma.submissionInterview.findMany({
      where: { submissionId: { in: allowed.map((s) => s.id) }, status: "COMPLETED" },
      orderBy: { createdAt: "asc" },
    });
    headers = ["study_id", "interview_id", "script_version", "duration_minutes", "themes", "summary"];
    rows = interviews.map((i) => [i.submissionId, i.id, i.scriptVersion ?? "", i.durationMinutes ?? "", i.themes, i.summary ?? ""]);
  } else if (type === "aggregate-funnel") {
    const sessions = await prisma.streamSession.findMany({
      where: { experimentId, sessionType: "STUDY", ...(includeTest ? {} : { collectionMode: "LIVE" }) },
      include: { streamer: { select: { displayName: true } } },
      orderBy: { createdAt: "asc" },
    });
    headers = ["session_id", "streamer", "title", "metric", "value", "denominator_note"];
    for (const s of sessions) {
      const [f, sum, ph] = await Promise.all([
        sessionFunnel(s.id),
        submissionSummary({ streamSessionId: s.id }),
        phaseSplit(s.id),
      ]);
      const base = [s.id, s.streamer.displayName, s.streamTitle ?? ""];
      rows.push([...base, "visits", f.visits, "distinct visits"]);
      rows.push([...base, "estimated_browsers", f.estimatedBrowsers, "distinct browser identifiers (not people)"]);
      for (const st of f.stages) rows.push([...base, `visits_${st.type.toLowerCase()}`, st.visits, "distinct visits reaching stage"]);
      rows.push([...base, "submissions_saved", sum.saved, "all saved submissions incl. duplicates"]);
      rows.push([...base, "submissions_canonical", sum.canonical, "one per phone per campaign"]);
      rows.push([...base, "submissions_duplicate", sum.duplicates, "repeat submissions"]);
      rows.push([...base, "under18_canonical_submissions", sum.ageGroups.BELOW_18 ?? 0, "aggregate count only"]);
      for (const [phase, n] of Object.entries(ph.visits)) rows.push([...base, `visits_${phase.toLowerCase()}`, n, "by visit start vs recorded actual times"]);
      for (const [phase, n] of Object.entries(ph.canonicalSubmissions)) {
        rows.push([...base, `canonical_submissions_${phase.toLowerCase()}`, n, "by submission time vs recorded actual times"]);
      }
    }
  } else if (type === "duplicate-statistics") {
    const dups = await prisma.submission.findMany({
      where: { experimentId, status: "DUPLICATE", ...testFilter },
      include: { canonical: { select: { responseCode: true, submittedAt: true, streamSessionId: true } } },
      orderBy: { submittedAt: "asc" },
    });
    headers = ["duplicate_code", "canonical_code", "duplicate_session_id", "canonical_session_id", "duplicate_submitted_at", "minutes_after_canonical", "same_browser_as_canonical"];
    const canonVisitors = new Map(
      (await prisma.submission.findMany({ where: { id: { in: dups.map((d) => d.canonicalId!).filter(Boolean) } }, select: { id: true, visitorId: true } })).map((c) => [c.id, c.visitorId]),
    );
    rows = dups.map((d) => [
      d.responseCode, d.canonical?.responseCode ?? "", d.streamSessionId, d.canonical?.streamSessionId ?? "", d.submittedAt,
      d.canonical ? Math.round((d.submittedAt.getTime() - d.canonical.submittedAt.getTime()) / 60000) : "",
      canonVisitors.get(d.canonicalId!) === d.visitorId,
    ]);
  } else if (type === "operational-followup") {
    const subs = await prisma.submission.findMany({
      where: { experimentId, status: "CANONICAL", ...testFilter },
      include: { contact: true, followUp: true, permissions: true },
      orderBy: { submittedAt: "asc" },
    });
    headers = ["response_code", "submitted_at", "phone", "age_group", "follow_up_status", "interview_proceed", "website_data_use", "interview_answers_use"];
    rows = subs.map((s) => {
      const p = currentPermissions(s.permissions);
      return [
        s.responseCode, s.submittedAt, s.contact?.encryptedPhone ? decryptContact(s.contact.encryptedPhone) : "(removed)",
        AGE_GROUP_LABELS[s.ageGroup], s.followUp?.status ?? "NOT_CONTACTED", p.INTERVIEW_PROCEED, p.WEBSITE_DATA_USE, p.INTERVIEW_ANSWERS_USE,
      ];
    });
  } else if (type === "reward-administration") {
    const winners = await prisma.drawWinner.findMany({
      where: { draw: { experimentId, status: "FINALIZED", ...(includeTest ? {} : { isTest: false }) } },
      include: { submission: { include: { contact: true } }, draw: { select: { executedAt: true, isTest: true } } },
      orderBy: [{ drawId: "asc" }, { rank: "asc" }],
    });
    headers = ["draw_executed_at", "is_test_draw", "rank", "response_code", "phone", "amount_bdt", "payout_status", "payment_ref", "paid_at"];
    rows = winners.map((w) => [
      w.draw.executedAt, w.draw.isTest, w.rank, w.submission.responseCode,
      w.submission.contact?.encryptedPhone ? decryptContact(w.submission.contact.encryptedPhone) : "(removed)",
      w.amountBdt, w.payoutStatus, w.paymentRef ?? "", w.paidAt ?? "",
    ]);
  }

  await audit(prisma, {
    actorId: actor.id,
    action: def.sensitive ? "SENSITIVE_EXPORT" : "EXPORT",
    entityType: "Experiment",
    entityId: experimentId,
    experimentId,
    detail: { type, rows: rows.length, includeTest },
  });

  const slug = exp.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return { filename: `${slug}-${type}${def.sensitive ? "-RESTRICTED" : ""}.csv`, csv: toCsv(headers, rows) };
}
