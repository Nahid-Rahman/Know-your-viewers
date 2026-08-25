import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = "w-full rounded-lg border border-transparent bg-input-surface px-3.5 py-2.5 text-sm text-input-surface-foreground placeholder:text-input-surface-foreground/45 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60";

export function LightInput({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(BASE, "h-11", className)} {...props} />;
}

export function LightTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(BASE, "min-h-24 resize-y", className)} {...props} />;
}

export function LightSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(BASE, "h-11 appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-input-surface-foreground/50" />
    </div>
  );
}

export function LightFieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1.5 block text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase", className)}
      {...props}
    />
  );
}
