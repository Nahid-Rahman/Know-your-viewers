import { cn } from "@/lib/utils";

export function StatTile({
  value,
  label,
  tone = "neutral",
  className,
}: {
  value: React.ReactNode;
  label: string;
  tone?: "neutral" | "green" | "cyan" | "violet";
  className?: string;
}) {
  const toneClass = {
    neutral: "text-foreground",
    green: "text-accent-green",
    cyan: "text-accent-cyan",
    violet: "text-accent-violet",
  }[tone];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-border bg-secondary/40 px-6 py-5 text-center",
        className,
      )}
    >
      <span className={cn("font-display text-3xl font-bold", toneClass)}>{value}</span>
      <span className="mt-1 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}
