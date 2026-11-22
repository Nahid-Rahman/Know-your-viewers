import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { evaluateResearchEligibility, summarizeEligibility, type Eligibility } from "./eligibility";

/** Columns the evaluator needs. Include alongside whatever a page already loads. */
export const ELIGIBILITY_FIELDS = {
  id: true,
  experimentId: true,
  visitorId: true,
  phoneHash: true,
  status: true,
  isTest: true,
  ageGroup: true,
  researchExcluded: true,
  researchDataPurgedAt: true,
  spinOutcomeId: true,
  permissions: { select: { type: true, status: true, recordedAt: true } },
} satisfies Prisma.SubmissionSelect;

type EvalRow = Prisma.SubmissionGetPayload<{ select: typeof ELIGIBILITY_FIELDS }>;

/**
 * For each row: how many OTHER phones the same browser used for canonical
 * entries in the same campaign. A review hint only — a browser is not a person.
 */
async function sameBrowserOtherPhones(rows: Pick<EvalRow, "id" | "experimentId" | "visitorId" | "phoneHash">[]) {
  const out = new Map<string, number>();
  if (!rows.length) return out;
  const pairs = [...new Map(rows.map((r) => [`${r.experimentId}|${r.visitorId}`, { experimentId: r.experimentId, visitorId: r.visitorId }])).values()];
  const peers = await prisma.submission.findMany({
    where: { status: "CANONICAL", OR: pairs },
    select: { experimentId: true, visitorId: true, phoneHash: true },
  });
  const phonesByPair = new Map<string, Set<string>>();
  for (const p of peers) {
    const k = `${p.experimentId}|${p.visitorId}`;
    if (!phonesByPair.has(k)) phonesByPair.set(k, new Set());
    phonesByPair.get(k)!.add(p.phoneHash);
  }
  for (const r of rows) {
    const set = phonesByPair.get(`${r.experimentId}|${r.visitorId}`);
    out.set(r.id, set ? [...set].filter((h) => h !== r.phoneHash).length : 0);
  }
  return out;
}

/** Evaluates rows that were loaded with ELIGIBILITY_FIELDS (plus anything else). */
export async function evaluateRows<T extends EvalRow>(rows: T[]): Promise<Map<string, Eligibility>> {
  const others = await sameBrowserOtherPhones(rows);
  return new Map(rows.map((r) => [r.id, evaluateResearchEligibility({ ...r, sameBrowserOtherPhones: others.get(r.id) ?? 0 })]));
}

export async function evaluateSubmission(id: string) {
  const row = await prisma.submission.findUniqueOrThrow({ where: { id }, select: ELIGIBILITY_FIELDS });
  return (await evaluateRows([row])).get(id)!;
}

/**
 * Aggregate counts for one campaign (optionally one session). Every count is
 * of submission records; denominators are explicit. Under-18 appears only as a
 * count here, never as rows.
 */
export async function eligibilityStats(where: { experimentId: string; streamSessionId?: string; includeTest?: boolean }) {
  const rows = await prisma.submission.findMany({
    where: {
      experimentId: where.experimentId,
      ...(where.streamSessionId ? { streamSessionId: where.streamSessionId } : {}),
      ...(where.includeTest ? {} : { isTest: false }),
    },
    select: ELIGIBILITY_FIELDS,
  });
  const evals = await evaluateRows(rows);
  const summary = summarizeEligibility([...evals.values()]);
  return {
    ...summary,
    saved: rows.length,
    canonical: rows.filter((r) => r.status === "CANONICAL").length,
    duplicates: rows.filter((r) => r.status === "DUPLICATE").length,
    test: rows.filter((r) => r.isTest).length,
    under18Saved: rows.filter((r) => r.ageGroup === "BELOW_18").length,
    under18Canonical: rows.filter((r) => r.ageGroup === "BELOW_18" && r.status === "CANONICAL").length,
    includeTest: Boolean(where.includeTest),
  };
}

export type EligibilityStats = Awaited<ReturnType<typeof eligibilityStats>>;
