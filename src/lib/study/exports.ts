import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptContact } from "@/lib/crypto";
import { toCsv } from "@/lib/csv";
import type { Prisma } from "@/generated/prisma/client";
import { audit, assertExperimentAccess, type Actor, type AccessLevel } from "./access";
import { AGE_GROUP_LABELS } from "./constants";
import { analyticsPhase } from "./session-state";
import { currentPermissions } from "./permissions";
import { evaluateResearchEligibility, REASON_ORDER } from "./eligibility";
import { eligibilityStats } from "./research-eligibility";
import { attemptOutcomes, durationGroups, sessionFunnel, submissionSummary, phaseSplit } from "./stats";

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

/**
 * Database pre-filter for research eligibility. The final decision is always
 * evaluateResearchEligibility (eligibility.ts) — this only narrows the load.
 */
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
  // The shared evaluator decides. Pending, declined, withdrawn and unreachable
  // (still pending) website-data use are all left out. With includeTest, the
  // TEST reason alone does not exclude.
  return rows.filter((r) => {
    const e = evaluateResearchEligibility(r);
    return e.reasons.every((reason) => includeTestReason(reason, opts.includeTest));
  });
}

function includeTestReason(reason: string, includeTest?: boolean) {
  return includeTest === true && reason === "TEST_CAMPAIGN";
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
      "email_provided", "ign_provided", "social_provided", "discord_provided", "facebook_provided", "spin_result", "spin_mechanism",
      "visit_elapsed_seconds", "visit_active_seconds_estimate", "follow_up_status", "is_test",
    ];
    rows = subs.map((s) => [
      s.id, s.streamSessionId, s.streamSession.streamer.displayName, s.streamSession.streamTitle, s.attributionSource,
      analyticsPhase(s.streamSession, s.submittedAt), s.submittedAt, AGE_GROUP_LABELS[s.ageGroup], s.emailProvided,
      s.ignProvided, s.socialProvided, s.discordProvided, s.facebookProvided, s.spinOutcome?.resultKey ?? "", s.spinOutcome?.mechanism ?? "",
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
    // Campaign-level research-eligibility breakdown (records, not people).
    const el = await eligibilityStats({ experimentId, includeTest });
    const all = ["ALL_SESSIONS", "", "campaign total"];
    rows.push([...all, "submissions_saved", el.saved, "all saved submissions incl. duplicates"]);
    rows.push([...all, "submissions_canonical", el.canonical, "one per phone per campaign"]);
    rows.push([...all, "submissions_duplicate", el.duplicates, "genuine repeats (kept, linked to canonical)"]);
    rows.push([...all, "submissions_test", el.test, includeTest ? "TEST collection included" : "TEST excluded from this export"]);
    rows.push([...all, "under18_saved", el.under18Saved, "aggregate count only; of submissions_saved"]);
    rows.push([...all, "under18_canonical", el.under18Canonical, "aggregate count only; of submissions_canonical"]);
    rows.push([...all, "research_eligible", el.eligible, "of submissions_saved"]);
    rows.push([...all, "research_pending_permission", el.pending, "only website-data permission missing; of submissions_saved"]);
    rows.push([...all, "research_not_eligible", el.notEligible, "of submissions_saved"]);
    rows.push([...all, "research_excluded_unique", el.excludedUnique, "unique records not eligible (pending + not eligible)"]);
    for (const r of REASON_ORDER) rows.push([...all, `reason_${r.toLowerCase()}`, el.byReason[r], "records with this reason; reasons overlap"]);
    rows.push([...all, "needs_review", el.needsReview, "flagged for a researcher to look at; not an exclusion"]);
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
      const [att, dg] = await Promise.all([attemptOutcomes(s.id), durationGroups([s.id])]);
      for (const st of att.stages) {
        rows.push([...base, `${st.type.toLowerCase()}_events`, st.events, "event count (attempts include invalid submits since 2026-11-22)"]);
        rows.push([...base, `${st.type.toLowerCase()}_visits`, st.visits, "distinct visits"]);
      }
      for (const r of att.validationReasons) rows.push([...base, `validation_reason_${r.reason.toLowerCase()}`, r.attempts, "failed attempts with this reason; reasons overlap"]);
      rows.push([...base, "duration_comparable_visits", dg.comparableVisits, "visits measured on all public pages (v2); denominator for group shares"]);
      rows.push([...base, "duration_legacy_visits", dg.legacyVisits, "homepage-only visits before 2026-11-22; not in groups"]);
      const r1 = (x: number | null) => (x === null ? "" : Math.round(x * 10) / 10);
      for (const g of dg.groups) {
        const k = `group_${g.group.toLowerCase()}`;
        rows.push([...base, `${k}_visits`, g.visits, "distinct visits in this group"]);
        rows.push([...base, `${k}_share`, r1(g.share === null ? null : g.share * 100), "% of duration_comparable_visits"]);
        rows.push([...base, `${k}_visible_mean_s`, r1(g.visible.mean), "estimated visible time, all public pages"]);
        rows.push([...base, `${k}_visible_median_s`, r1(g.visible.median), "estimated visible time, all public pages"]);
        rows.push([...base, `${k}_visible_p90_s`, r1(g.visible.p90), "estimated visible time, all public pages"]);
        rows.push([...base, `${k}_home_visible_median_s`, r1(g.homeVisible.median), "estimated visible time, homepage only"]);
        rows.push([...base, `${k}_elapsed_median_s`, r1(g.elapsed.median), "elapsed visit duration (not attention)"]);
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
    // Under-18 entrants are never contacted (owner decision) — not even listed.
    const subs = await prisma.submission.findMany({
      where: { experimentId, status: "CANONICAL", ageGroup: { not: "BELOW_18" }, ...testFilter },
      include: { contact: true, followUp: true, permissions: true },
      orderBy: { submittedAt: "asc" },
    });
    headers = ["response_code", "submitted_at", "name", "phone", "age_group", "follow_up_status", "interview_proceed", "website_data_use", "interview_answers_use"];
    rows = subs.map((s) => {
      const p = currentPermissions(s.permissions);
      return [
        s.responseCode, s.submittedAt, s.contact?.encryptedName ? decryptContact(s.contact.encryptedName) : "",
        s.contact?.encryptedPhone ? decryptContact(s.contact.encryptedPhone) : "(removed)",
        AGE_GROUP_LABELS[s.ageGroup], s.followUp?.status ?? "NOT_CONTACTED", p.INTERVIEW_PROCEED, p.WEBSITE_DATA_USE, p.INTERVIEW_ANSWERS_USE,
      ];
    });
  } else if (type === "reward-administration") {
    const winners = await prisma.drawWinner.findMany({
      // Under-18 winners (only possible in draws made before the age rule) are never contacted.
      where: { draw: { experimentId, status: "FINALIZED", ...(includeTest ? {} : { isTest: false }) }, submission: { ageGroup: { not: "BELOW_18" } } },
      include: { submission: { include: { contact: true } }, draw: { select: { executedAt: true, isTest: true } } },
      orderBy: [{ drawId: "asc" }, { rank: "asc" }],
    });
    headers = ["draw_executed_at", "is_test_draw", "rank", "response_code", "name", "phone", "amount_bdt", "payout_status", "payment_ref", "paid_at"];
    rows = winners.map((w) => [
      w.draw.executedAt, w.draw.isTest, w.rank, w.submission.responseCode,
      w.submission.contact?.encryptedName ? decryptContact(w.submission.contact.encryptedName) : "",
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
