import { cn } from "@/lib/utils";

const GLOW_CLASSES = {
  none: "",
  primary: "shadow-[0_0_60px_-20px_var(--primary)]",
  cyan: "shadow-[0_0_60px_-20px_var(--accent-cyan)]",
  green: "shadow-[0_0_60px_-20px_var(--accent-green)]",
  violet: "shadow-[0_0_60px_-20px_var(--accent-violet)]",
} as const;

export type GlowVariant = keyof typeof GLOW_CLASSES;

export function GlowCard({
  children,
  glow = "none",
  className,
  ...props
}: React.ComponentProps<"div"> & { glow?: GlowVariant }) {
  return (
    <div
      className={cn(
        "card-border rounded-xl p-6",
        GLOW_CLASSES[glow],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
