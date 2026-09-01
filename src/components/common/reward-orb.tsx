import { cn } from "@/lib/utils";

const ORBIT_BADGES = [
  { icon: "🎮", position: "-top-2 -left-2", delay: "0s" },
  { icon: "💎", position: "-top-3 right-2", delay: "0.6s" },
  { icon: "⚡", position: "bottom-4 -right-4", delay: "1.2s" },
  { icon: "🔥", position: "-bottom-3 left-4", delay: "1.8s" },
];

const SPARKLES = [
  { position: "top-2 left-10", delay: "0.3s" },
  { position: "top-16 -right-1", delay: "1.1s" },
  { position: "bottom-6 left-2", delay: "1.7s" },
];

/**
 * The hero trophy orb: a rotating gradient ring, a breathing glow on the
 * trophy itself, small gaming-icon badges floating around it, and a
 * few twinkling sparkles — built with plain CSS animations (see
 * globals.css) to keep the hero visually alive without a motion library.
 */
export function RewardOrb({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-64 w-64 items-center justify-center", className)} aria-hidden>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundImage:
            "linear-gradient(to bottom right, color-mix(in oklch, var(--primary), transparent 60%), color-mix(in oklch, var(--primary), transparent 90%), transparent)",
        }}
      />

      {/* Rotating dashed ring */}
      <div
        className="animate-spin-slow absolute inset-2 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, var(--primary) 0deg 40deg, transparent 40deg 90deg, var(--purple) 90deg 130deg, transparent 130deg 180deg, var(--pink) 180deg 220deg, transparent 220deg 270deg, var(--amber) 270deg 310deg, transparent 310deg 360deg)`,
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          opacity: 0.8,
        }}
      />

      <div
        className="animate-pulse-glow relative flex h-40 w-40 items-center justify-center rounded-full text-6xl"
        style={{ backgroundImage: "linear-gradient(to bottom right, var(--primary), var(--primary-dark))" }}
      >
        🏆
      </div>

      {ORBIT_BADGES.map((badge) => (
        <span
          key={badge.icon}
          className={cn(
            "animate-float-bob card-border absolute flex size-9 items-center justify-center rounded-full text-base shadow-lg",
            badge.position,
          )}
          style={{ animationDelay: badge.delay }}
        >
          {badge.icon}
        </span>
      ))}

      {SPARKLES.map((sparkle, i) => (
        <span
          key={i}
          className={cn("animate-twinkle absolute text-lg text-primary", sparkle.position)}
          style={{ animationDelay: sparkle.delay }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
