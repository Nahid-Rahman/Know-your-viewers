import { cn } from "@/lib/utils";

/**
 * Simple horizontal distribution bars for aggregate survey/rating results —
 * intentionally not a pie chart, since ordered categories (e.g. Likert
 * scales) read better as ranked bars.
 */
export function DistributionChart({
  title,
  description,
  data,
  className,
}: {
  title: string;
  description?: string;
  data: { label: string; count: number }[];
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-4 space-y-3">
        {data.map((d) => (
          <div key={d.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-semibold">{d.count}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-gradient-primary"
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
