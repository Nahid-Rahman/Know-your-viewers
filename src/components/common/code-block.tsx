import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

export function CodeBlock({
  label,
  value,
  hint,
  copyable = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Show a Copy button next to the value. */
  copyable?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-secondary/40 p-4", className)}>
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-2xl font-semibold tracking-wide break-all text-accent-cyan select-all">{value}</p>
        {copyable && <CopyButton value={value} />}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
