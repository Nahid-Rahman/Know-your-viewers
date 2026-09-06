import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

/**
 * A scannable top-to-bottom funnel — each stage's bar width is proportional
 * to its share of the top-of-funnel count, with the raw count and that
 * percentage shown alongside. Deliberately not a chart-library chart: the
 * researcher wants "how many entered vs. how many dropped" at a glance, not
 * a plotted line.
 */
export function FunnelSteps({
  title,
  description,
  stages,
  className,
}: {
  title: string;
  description?: string;
  stages: { stage: string; count: number }[];
  className?: string;
}) {
  const topCount = stages[0]?.count || 0;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      {topCount === 0 ? (
        <EmptyState
          className="mt-4 border-none bg-transparent py-10"
          title="No activity yet"
          description="The funnel fills in once participants start visiting."
        />
      ) : (
        <div className="mt-4 space-y-2.5">
          {stages.map((s) => {
            const widthPct = Math.max((s.count / topCount) * 100, s.count > 0 ? 3 : 0);
            const convPct = Math.round((s.count / topCount) * 100);
            return (
              <div key={s.stage}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">{s.stage}</span>
                  <span className="shrink-0 text-muted-foreground">
                    <span className="font-semibold text-foreground">{s.count.toLocaleString()}</span> &middot; {convPct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                  <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${widthPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
