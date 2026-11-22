import { ELIGIBILITY_REASONS, REASON_ORDER } from "@/lib/study/eligibility";
import type { EligibilityStats } from "@/lib/study/research-eligibility";

const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "—");

/**
 * Aggregate research-eligibility counts. Counts are submission records, not
 * people. "Excluded (unique)" counts each record once; the per-reason table
 * counts reasons, which overlap. Under-18 appears only as a count.
 */
export function EligibilityStatsCard({ stats, scopeLabel }: { stats: EligibilityStats; scopeLabel: string }) {
  const d = stats.saved;
  const tiles: [string, number, string][] = [
    ["Saved submissions", stats.saved, stats.includeTest ? "incl. TEST" : "LIVE only"],
    ["Canonical", stats.canonical, pct(stats.canonical, d)],
    ["Genuine duplicates", stats.duplicates, pct(stats.duplicates, d)],
    ["Research eligible", stats.eligible, pct(stats.eligible, d)],
    ["Pending permission", stats.pending, pct(stats.pending, d)],
    ["Excluded (unique)", stats.excludedUnique, pct(stats.excludedUnique, d)],
  ];
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-1 font-display text-lg font-bold">Research eligibility — {scopeLabel}</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Denominator for every percentage: {d} saved submission record(s){stats.includeTest ? " including TEST" : " (TEST excluded)"}. Records, not people.
        Reward-draw eligibility is separate. Self-reported under-18: {stats.under18Saved} saved / {stats.under18Canonical} canonical (aggregate count
        only). TEST records: {stats.test}.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([label, n, sub]) => (
          <div key={label} className="rounded-lg border border-border p-2">
            <p className="text-xl font-bold">{n}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 font-medium">Reason (records can have several)</th>
              <th className="py-1 text-right font-medium">Records</th>
              <th className="py-1 text-right font-medium">of saved</th>
            </tr>
          </thead>
          <tbody>
            {REASON_ORDER.map((r) => (
              <tr key={r} className="border-t border-border/60">
                <td className="py-1">{ELIGIBILITY_REASONS[r]}</td>
                <td className="py-1 text-right">{stats.byReason[r]}</td>
                <td className="py-1 text-right text-muted-foreground">{pct(stats.byReason[r], d)}</td>
              </tr>
            ))}
            <tr className="border-t border-border/60">
              <td className="py-1">Needs review (flag, not an exclusion)</td>
              <td className="py-1 text-right">{stats.needsReview}</td>
              <td className="py-1 text-right text-muted-foreground">{pct(stats.needsReview, d)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
