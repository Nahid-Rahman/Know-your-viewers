import { cn } from "@/lib/utils";

export function StepCard({
  step,
  icon,
  title,
  description,
  accent = "cyan",
  className,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: "cyan" | "violet" | "green";
  className?: string;
}) {
  const accentClass = {
    cyan: "text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30",
    violet: "text-accent-violet bg-accent-violet/10 border-accent-violet/30",
    green: "text-accent-green bg-accent-green/10 border-accent-green/30",
  }[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden card-border rounded-xl p-6",
        className,
      )}
    >
      <span className="pointer-events-none absolute -top-2 right-3 font-display text-6xl font-bold text-foreground/5">
        {String(step).padStart(2, "0")}
      </span>
      <div className={cn("mb-4 inline-flex size-10 items-center justify-center rounded-lg border", accentClass)}>
        {icon}
      </div>
      <p className={cn("mb-1 font-display text-[11px] font-semibold tracking-[0.14em] uppercase", accentClass.split(" ")[0])}>
        Step {String(step).padStart(2, "0")}
      </p>
      <h3 className="mb-1.5 text-base font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
