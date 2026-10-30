import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { analyticsPhase } from "./session-state";

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
        prisma.submission.count({ where: { ...where, status: "CANONICAL", socialType: "DISCORD" } }),
        prisma.submission.count({ where: { ...where, status: "CANONICAL", socialType: "FACEBOOK" } }),
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
