/* eslint-disable @next/next/no-img-element -- photos are researcher uploads served from /api/media */
import { cn } from "@/lib/utils";
import type { StudyBranding } from "./streamer-header";

const ORBIT_BADGES = [
  { icon: "🎮", position: "top-2 left-2", delay: "0s" },
  { icon: "💎", position: "top-0 right-6", delay: "0.6s" },
  { icon: "⚡", position: "bottom-10 -right-2", delay: "1.2s" },
  { icon: "🔥", position: "bottom-6 left-4", delay: "1.8s" },
];

/**
 * Hero right column: the streamer's photo inside the same rotating gradient
 * ring and floating badges as the original reward orb, with their name below.
 */
export function StreamerSpotlight({ branding, className }: { branding: StudyBranding; className?: string }) {
  const initials = branding.streamerDisplayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative flex size-80 items-center justify-center sm:size-96 lg:size-[26rem]">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage:
              "linear-gradient(to bottom right, color-mix(in oklch, var(--primary), transparent 60%), color-mix(in oklch, var(--primary), transparent 90%), transparent)",
          }}
          aria-hidden
        />
        <div
          className="animate-spin-slow absolute inset-2 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, var(--primary) 0deg 40deg, transparent 40deg 90deg, var(--purple) 90deg 130deg, transparent 130deg 180deg, var(--pink) 180deg 220deg, transparent 220deg 270deg, var(--amber) 270deg 310deg, transparent 310deg 360deg)`,
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
            opacity: 0.8,
          }}
          aria-hidden
        />
        <div className="animate-pulse-glow relative size-60 overflow-hidden rounded-full border-4 border-primary/70 sm:size-72 lg:size-80">
          {branding.streamerImageUrl ? (
            <img src={branding.streamerImageUrl} alt={branding.streamerDisplayName} className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div
              className="flex size-full items-center justify-center font-display text-6xl font-bold text-white"
              style={{ backgroundImage: "linear-gradient(to bottom right, var(--primary), var(--primary-dark))" }}
            >
              {initials}
            </div>
          )}
        </div>
        {ORBIT_BADGES.map((badge) => (
          <span
            key={badge.icon}
            className={cn("animate-float-bob card-border absolute flex size-9 items-center justify-center rounded-full text-base shadow-lg", badge.position)}
            style={{ animationDelay: badge.delay }}
            aria-hidden
          >
            {badge.icon}
          </span>
        ))}
      </div>
      <p className="mt-4 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {branding.platform ? `${branding.platform} stream` : "Live stream"}
      </p>
      <p className="font-display text-3xl font-bold break-words text-center lg:text-4xl">{branding.streamerDisplayName}</p>
      {branding.channelUrl && (
        <a
          href={branding.channelUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-1 text-sm font-medium text-primary underline underline-offset-2"
        >
          Visit channel
        </a>
      )}
    </div>
  );
}
