import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "green" | "cyan" | "violet" | "primary";
  className?: string;
}) {
  const toneClass = {
    neutral: "bg-secondary/50 text-foreground",
    green: "bg-accent-green/10 text-accent-green",
    cyan: "bg-accent-cyan/10 text-accent-cyan",
    violet: "bg-accent-violet/10 text-accent-violet",
    primary: "bg-primary/10 text-primary",
  }[tone];

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        {icon && <span className={cn("flex size-8 items-center justify-center rounded-lg", toneClass)}>{icon}</span>}
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
