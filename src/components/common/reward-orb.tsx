import { cn } from "@/lib/utils";

/**
 * The hero trophy orb — an emoji glyph inside a gradient circle with a
 * softer glow ring behind it, matching the reference exactly (it does not
 * use an icon component, just the literal "🏆" character).
 */
export function RewardOrb({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-56 w-56 items-center justify-center", className)} aria-hidden>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundImage:
            "linear-gradient(to bottom right, color-mix(in oklch, var(--primary), transparent 60%), color-mix(in oklch, var(--primary), transparent 90%), transparent)",
        }}
      />
      <div
        className="relative flex h-40 w-40 items-center justify-center rounded-full text-6xl"
        style={{ backgroundImage: "linear-gradient(to bottom right, var(--primary), var(--primary-dark))" }}
      >
        🏆
      </div>
    </div>
  );
}
