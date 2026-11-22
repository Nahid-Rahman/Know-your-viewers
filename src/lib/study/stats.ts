import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { analyticsPhase } from "./session-state";
import { describeDurations, FUNNEL_GROUPS, funnelGroupFor, type FunnelGroup } from "./activity";
import { PUBLIC_ROUTE_KEYS, type PublicRouteKey } from "./constants";

/**
 * Website funnel for one study session. Every stage counts DISTINCT VISITS
 * that reached it (not raw event rows), so stages are comparable; event
 * totals are reported separately. Rates state their denominator.
 */
export async function sessionFunnel(sessionId: string) {
  const stageTypes = [
    ["Landing viewed", "LANDING_VIEWED"],
    ["Reward section viewed", "REWARD_SECTION_VIEWED"],
    ["Spin clicked", "SPIN_CLICKED"],
    ["Spin completed", "SPIN_COMPLETED"],
    ["Form opened", "FORM_OPENED"],
    ["Submission attempted", "SUBMISSION_ATTEMPTED"],
    ["Submission saved", "SUBMISSION_SAVED"],
    ["Confirmation viewed", "CONFIRMATION_VIEWED"],
  ] as const;

  const [visits, browsers, stageRows, eventTotals] = await Promise.all([
    prisma.visit.count({ where: { streamSessionId: sessionId } }),
    prisma.visit.groupBy({ by: ["visitorId"], where: { streamSessionId: sessionId } }).then((r) => r.length),
    prisma.$queryRaw<{ type: string; visits: bigint }[]>`
      SELECT type::text AS type, COUNT(DISTINCT "visitId") AS visits
      FROM study_events WHERE "streamSessionId" = ${sessionId} GROUP BY type`,
    prisma.studyEvent.groupBy({ by: ["type"], where: { streamSessionId: sessionId }, _count: { _all: true } }),
  ]);
  const byType = new Map(stageRows.map((r) => [r.type, Number(r.visits)]));
  const landing = byType.get("LANDING_VIEWED") ?? 0;
  let previous: number | null = null;
  const stages = stageTypes.map(([label, type]) => {
    const count = byType.get(type) ?? 0;
    const row = {
      label,
      type,
      visits: count,
      // Denominator: visits that viewed the landing page.
      ofLanding: landing ? count / landing : null,
      // Denominator: visits that reached the previous stage.
      ofPrevious: previous ? count / previous : null,
    };
    previous = count;
    return row;
  });

  return {
    visits,
    estimatedBrowsers: browsers,
    stages,
    eventTotals: Object.fromEntries(eventTotals.map((e) => [e.type, e._count._all])),
  };
}

export async function submissionSummary(where: Prisma.SubmissionWhereInput) {
  const [saved, canonical, duplicates, optional, age] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.count({ where: { ...where, status: "CANONICAL" } }),
    prisma.submission.count({ where: { ...where, status: "DUPLICATE" } }),
    prisma.submission.aggregate({
      where: { ...where, status: "CANONICAL" },
      _count: { _all: true },
    }).then(async (agg) => {
      const [email, ign, social, discord, facebook] = await Promise.all([
        prisma.submission.count({ where: { ...where, status: "CANONICAL", emailProvided: true } }),
        prisma.submission.count({ where: { ...where, status: "CANONICAL", ignProvided: true } }),
        prisma.submission.count({ where: { ...where, status: "CANONICAL", socialProvided: true } }),
        prisma.submission.count({ where: { ...where, status: "CANONICAL", discordProvided: true } }),
        prisma.submission.count({ where: { ...where, status: "CANONICAL", facebookProvided: true } }),
      ]);
      // Denominator for every rate: canonical submissions.
      return { denominator: agg._count._all, email, ign, social, discord, facebook };
    }),
    prisma.submission.groupBy({ by: ["ageGroup"], where: { ...where, status: "CANONICAL" }, _count: { _all: true } }),
  ]);
  const distinctPhonesWithDuplicates = await prisma.submission
    .groupBy({ by: ["canonicalId"], where: { ...where, status: "DUPLICATE" } })
    .then((r) => r.length);
  return {
    saved,
    canonical,
    duplicates,
    distinctPhonesWithDuplicates,
    optional,
    // Canonical submissions by self-reported age group — describes submitters
    // only; anonymous visitors' ages are unknown.
    ageGroups: Object.fromEntries(age.map((a) => [a.ageGroup, a._count._all])) as Record<string, number>,
  };
}

/** Elapsed vs estimated-active visit duration (seconds). Last-observed, not exact. */
export async function durationSummary(sessionId: string) {
  const rows = await prisma.$queryRaw<{ elapsed: number; active: number }[]>`
    SELECT EXTRACT(EPOCH FROM ("lastSeenAt" - "startedAt"))::float AS elapsed, ("activeMs" / 1000.0)::float AS active
    FROM visits WHERE "streamSessionId" = ${sessionId}`;
  const stat = (xs: number[]) => {
    if (!xs.length) return { n: 0, median: null, mean: null, p90: null };
    const s = [...xs].sort((a, b) => a - b);
    const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
    return { n: s.length, median: q(0.5), mean: s.reduce((a, b) => a + b, 0) / s.length, p90: q(0.9) };
  };
  return { elapsed: stat(rows.map((r) => r.elapsed)), active: stat(rows.map((r) => r.active)) };
}

export const BUCKET_OPTIONS = [1, 5, 15, 60] as const;

/** Visits started and submissions saved per time bucket (UTC-aligned). */
export async function trafficSeries(sessionId: string, bucketMinutes: number) {
  const seconds = (BUCKET_OPTIONS as readonly number[]).includes(bucketMinutes) ? bucketMinutes * 60 : 300;
  const [visits, subs] = await Promise.all([
    prisma.$queryRaw<{ bucket: Date; n: bigint }[]>`
      SELECT to_timestamp(floor(extract(epoch FROM "startedAt") / ${seconds}) * ${seconds}) AS bucket, COUNT(*) AS n
      FROM visits WHERE "streamSessionId" = ${sessionId} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ bucket: Date; n: bigint; canonical: bigint }[]>`
      SELECT to_timestamp(floor(extract(epoch FROM "submittedAt") / ${seconds}) * ${seconds}) AS bucket,
        COUNT(*) AS n, COUNT(*) FILTER (WHERE status = 'CANONICAL') AS canonical
      FROM submissions WHERE "streamSessionId" = ${sessionId} GROUP BY 1 ORDER BY 1`,
  ]);
  const map = new Map<number, { bucket: string; visits: number; submissions: number; canonical: number }>();
  for (const v of visits) {
    map.set(v.bucket.getTime(), { bucket: v.bucket.toISOString(), visits: Number(v.n), submissions: 0, canonical: 0 });
  }
  for (const s of subs) {
    const row = map.get(s.bucket.getTime()) ?? { bucket: s.bucket.toISOString(), visits: 0, submissions: 0, canonical: 0 };
    row.submissions = Number(s.n);
    row.canonical = Number(s.canonical);
    map.set(s.bucket.getTime(), row);
  }
  const series = [...map.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
  // Fill empty buckets so changes between consecutive buckets are honest.
  const filled: typeof series = [];
  for (let i = 0; i < series.length; i++) {
    filled.push(series[i]);
    const next = series[i + 1];
    if (!next) break;
    for (let t = new Date(series[i].bucket).getTime() + seconds * 1000; t < new Date(next.bucket).getTime(); t += seconds * 1000) {
      filled.push({ bucket: new Date(t).toISOString(), visits: 0, submissions: 0, canonical: 0 });
    }
  }
  const peak = filled.reduce<(typeof filled)[number] | null>((p, r) => (!p || r.visits > p.visits ? r : p), null);
  return { bucketMinutes: seconds / 60, series: filled, peak };
}

/** Visits and canonical submissions split by stream phase (from recorded actual times). */
export async function phaseSplit(sessionId: string) {
  const session = await prisma.streamSession.findUniqueOrThrow({ where: { id: sessionId } });
  const [visits, subs] = await Promise.all([
    prisma.visit.findMany({ where: { streamSessionId: sessionId }, select: { startedAt: true } }),
    prisma.submission.findMany({ where: { streamSessionId: sessionId, status: "CANONICAL" }, select: { submittedAt: true } }),
  ]);
  const empty = () => ({ PRE_STREAM: 0, LIVE: 0, POST_STREAM: 0, UNKNOWN: 0 });
  const v = empty();
  const s = empty();
  for (const x of visits) v[analyticsPhase(session, x.startedAt)]++;
  for (const x of subs) s[analyticsPhase(session, x.submittedAt)]++;
  return { visits: v, canonicalSubmissions: s, hasActualStart: Boolean(session.actualStartAt), hasActualEnd: Boolean(session.actualEndAt) };
}

/**
 * Outcome of submit attempts for one session. "Attempted" counts every
 * intentional submit since 2026-11-22 (valid or not); before that only
 * client-valid submits were logged, so older attempt counts are lower bounds.
 */
export async function attemptOutcomes(sessionId: string) {
  const types = ["SUBMISSION_ATTEMPTED", "SUBMISSION_VALIDATION_FAILED", "SUBMISSION_REJECTED", "SUBMISSION_SAVED"] as const;
  const [rows, reasons] = await Promise.all([
    prisma.$queryRaw<{ type: string; events: bigint; visits: bigint }[]>`
      SELECT type::text AS type, COUNT(*) AS events, COUNT(DISTINCT "visitId") AS visits
      FROM study_events
      WHERE "streamSessionId" = ${sessionId}
        AND type::text IN ('SUBMISSION_ATTEMPTED', 'SUBMISSION_VALIDATION_FAILED', 'SUBMISSION_REJECTED', 'SUBMISSION_SAVED')
      GROUP BY type`,
    prisma.$queryRaw<{ reason: string; n: bigint }[]>`
      SELECT r AS reason, COUNT(*) AS n
      FROM study_events, unnest(string_to_array(detail ->> 'reasons', ',')) AS r
      WHERE "streamSessionId" = ${sessionId} AND type::text = 'SUBMISSION_VALIDATION_FAILED'
      GROUP BY r ORDER BY r`,
  ]);
  const by = new Map(rows.map((r) => [r.type, { events: Number(r.events), visits: Number(r.visits) }]));
  return {
    stages: types.map((t) => ({ type: t, ...(by.get(t) ?? { events: 0, visits: 0 }) })),
    // Count of failed attempts mentioning each reason (an attempt can have several).
    validationReasons: reasons.map((r) => ({ reason: r.reason, attempts: Number(r.n) })),
  };
}

type GroupStats = {
  group: FunnelGroup;
  visits: number;
  /** Share of all comparable visits in scope (denominator: `comparableVisits`). */
  share: number | null;
  /** Estimated visible time on all public pages, seconds. */
  visible: ReturnType<typeof describeDurations>;
  /** Estimated visible time on the homepage only, seconds. */
  homeVisible: ReturnType<typeof describeDurations>;
  /** Elapsed visit duration (first to last signal), seconds. */
  elapsed: ReturnType<typeof describeDurations>;
};

/**
 * Engagement by furthest stage, per VISIT (not person, not submission):
 *   NEVER_REACHED_REWARD                     no reward-section view recorded
 *   REACHED_REWARD_NO_SUCCESSFUL_SUBMISSION  reward section viewed, nothing saved
 *   SUCCESSFULLY_SUBMITTED                   at least one submission saved
 * Each visit is in exactly one group. Only measurementVersion-2 visits (all
 * public pages, per-route split) are compared; older homepage-only visits are
 * counted separately as `legacyVisits` and never pooled in.
 */
export async function durationGroups(sessionIds: string[]) {
  if (!sessionIds.length) return { comparableVisits: 0, legacyVisits: 0, groups: emptyGroups(), routes: emptyRoutes() };
  const rows = await prisma.$queryRaw<{ id: string; ver: number; active: number; route: unknown; elapsed: number; submitted: boolean; reward: boolean }[]>`
    SELECT v.id, v."measurementVersion" AS ver, v."activeMs" AS active, v."routeActiveMs" AS route,
      (EXTRACT(EPOCH FROM (v."lastSeenAt" - v."startedAt")) * 1000)::float AS elapsed,
      EXISTS (SELECT 1 FROM submissions s WHERE s."visitId" = v.id) AS submitted,
      EXISTS (SELECT 1 FROM study_events e WHERE e."visitId" = v.id AND e.type::text = 'REWARD_SECTION_VIEWED') AS reward
    FROM visits v
    WHERE v."streamSessionId" = ANY(${sessionIds}::text[])`;
  const comparable = rows.filter((r) => r.ver >= 2);
  const routeMs = (r: (typeof rows)[number], k: PublicRouteKey) => {
    const v = (r.route as Record<string, unknown> | null)?.[k];
    return typeof v === "number" ? v : 0;
  };
  const groups: GroupStats[] = FUNNEL_GROUPS.map((group) => {
    const g = comparable.filter((r) => funnelGroupFor({ submitted: r.submitted, reachedReward: r.reward }) === group);
    return {
      group,
      visits: g.length,
      share: comparable.length ? g.length / comparable.length : null,
      visible: describeDurations(g.map((r) => r.active / 1000)),
      homeVisible: describeDurations(g.map((r) => routeMs(r, "home") / 1000)),
      elapsed: describeDurations(g.map((r) => r.elapsed / 1000)),
    };
  });
  const routes = Object.fromEntries(
    PUBLIC_ROUTE_KEYS.map((k) => {
      const seen = comparable.filter((r) => routeMs(r, k) > 0);
      return [k, { visitsWithTime: seen.length, visible: describeDurations(seen.map((r) => routeMs(r, k) / 1000)) }];
    }),
  ) as Record<PublicRouteKey, { visitsWithTime: number; visible: ReturnType<typeof describeDurations> }>;
  return { comparableVisits: comparable.length, legacyVisits: rows.length - comparable.length, groups, routes };
}

function emptyGroups(): GroupStats[] {
  return FUNNEL_GROUPS.map((group) => ({
    group,
    visits: 0,
    share: null,
    visible: describeDurations([]),
    homeVisible: describeDurations([]),
    elapsed: describeDurations([]),
  }));
}
function emptyRoutes() {
  return Object.fromEntries(PUBLIC_ROUTE_KEYS.map((k) => [k, { visitsWithTime: 0, visible: describeDurations([]) }])) as Record<
    PublicRouteKey,
    { visitsWithTime: number; visible: ReturnType<typeof describeDurations> }
  >;
}
