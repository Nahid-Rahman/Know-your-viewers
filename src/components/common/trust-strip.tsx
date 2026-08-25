import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

export function TrustStrip({
  items,
  tone = "neutral",
  className,
}: {
  items: string[];
  tone?: "neutral" | "safe";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-2 gap-y-2 rounded-xl border px-4 py-3 text-xs font-semibold tracking-wide",
        tone === "safe"
          ? "border-accent-green/25 bg-accent-green/10 text-accent-green"
          : "border-border bg-muted/30 text-muted-foreground",
        className,
      )}
    >
      {items.map((item, i) => (
        <span key={item} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="opacity-40">&bull;</span>}
          <ShieldCheck className="size-3.5" aria-hidden />
          {item}
        </span>
      ))}
    </div>
  );
}
