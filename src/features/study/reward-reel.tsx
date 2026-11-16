"use client";

import { useEffect, useRef, useState } from "react";
import { RarityBadge, type Rarity } from "@/components/common/rarity-badge";
import { cn } from "@/lib/utils";

export type ReelItem = { key: string; label: string; sub: string; tier: Rarity };

// Tile width and gap are responsive CSS variables (--tile / --gap on the reel
// root). All positions here are in TILES, not pixels; the transform converts
// them with calc(), so the strip stays correct at any breakpoint or on resize.
// One persistent rAF loop drives the strip so the idle drift and the landing
// never fight each other.
const REPEAT = 12;
const WRAP_PAD_LOOPS = 5;
const SPIN_LOOPS = 4;
const SPIN_MS = 2500;
const REDUCED_MOTION_SPIN_MS = 400;
// ≈ the old 0.022 px/ms drift at the original 156 px tile pitch.
const IDLE_SPEED_TILES_PER_MS = 0.022 / 156;
// While the server is choosing the result (`pending`), the strip spins up to
// this speed right away so the click feels instant instead of waiting on the
// network round trip.
const PENDING_SPEED_TILES_PER_MS = 0.03;
// Time constant for easing the speed between idle and pending.
const SPEED_EASE_MS = 180;

const translate = (tiles: number) =>
  `translateX(calc(50% - var(--tile) / 2 - ${tiles} * (var(--tile) + var(--gap))))`;

const ACCENT: Record<Rarity, string> = {
  common: "var(--blue)",
  rare: "var(--purple)",
  exceptional: "var(--primary)",
  premium: "var(--green)",
};

const EMOJI: Record<Rarity, string> = {
  common: "⭐",
  rare: "💠",
  exceptional: "🔥",
  premium: "💎",
};

// Illustrations for the default reward keys (public/images/rewards/<key>.svg).
// Any other key a session config adds falls back to the tier emoji.
const REWARD_IMAGES = new Set([
  "bkash_reward",
  "gift_card",
  "battle_pass",
  "in_game_skin",
  "in_game_currency",
  "gaming_mouse",
  "rgb_mouse_pad",
  "earbuds",
  "1v1_me",
  "party_up",
]);

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Purely presentational: drifts slowly while idle, and when `target` (a key
 * the SERVER already chose and stored) arrives it decelerates onto that tile
 * and calls onLanded. It never picks an outcome itself.
 */
export function RewardReel({
  items,
  target,
  pending = false,
  landed,
  onLanded,
}: {
  items: ReelItem[];
  target: string | null;
  /** The spin was clicked and the server result hasn't arrived yet. */
  pending?: boolean;
  landed: boolean;
  onLanded?: () => void;
}) {
  const poolSize = items.length;
  // Offsets are measured in tiles, so one full loop is poolSize tiles.
  const loopWidth = poolSize;
  const initialOffset = WRAP_PAD_LOOPS * loopWidth;

  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(initialOffset);
  const spinRef = useRef<{ start: number; from: number; to: number; duration: number } | null>(null);
  const landedFor = useRef<string | null>(null);
  const onLandedRef = useRef(onLanded);
  const pendingRef = useRef(pending);
  const velocityRef = useRef(IDLE_SPEED_TILES_PER_MS);
  const [activeAbs, setActiveAbs] = useState(WRAP_PAD_LOOPS * poolSize);
  const activeAbsRef = useRef(WRAP_PAD_LOOPS * poolSize);

  useEffect(() => {
    onLandedRef.current = onLanded;
  }, [onLanded]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // Start a landing whenever the server-chosen target arrives.
  useEffect(() => {
    if (!target || landedFor.current === target || !poolSize) return;
    const idx = Math.max(0, items.findIndex((i) => i.key === target));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = offsetRef.current;
    const v = velocityRef.current;
    let to = Math.floor(from / loopWidth) * loopWidth + idx;
    let duration = reduced ? REDUCED_MOTION_SPIN_MS : SPIN_MS;
    if (!reduced && v > IDLE_SPEED_TILES_PER_MS * 4) {
      // Already spinning fast: pick a stop far enough ahead and a duration
      // whose ease-out starts at the current speed, so there's no jolt.
      // easeOutCubic starts at 3x the average speed, hence the factor of 3.
      while (to < from + (v * SPIN_MS) / 3) to += loopWidth;
      duration = (3 * (to - from)) / v;
    } else {
      while (to < from + (reduced ? 1 : SPIN_LOOPS) * loopWidth) to += loopWidth;
    }
    spinRef.current = { start: performance.now(), from, to, duration };
    landedFor.current = target;
  }, [target, items, poolSize, loopWidth]);

  useEffect(() => {
    if (!poolSize) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = performance.now();
    let id = 0;

    const apply = (tiles: number) => {
      if (trackRef.current) trackRef.current.style.transform = translate(tiles);
      const abs = Math.round(tiles);
      if (abs !== activeAbsRef.current) {
        activeAbsRef.current = abs;
        setActiveAbs(abs);
      }
    };

    const frame = (now: number) => {
      const spin = spinRef.current;
      if (spin) {
        const t = Math.min(1, (now - spin.start) / spin.duration);
        offsetRef.current = spin.from + (spin.to - spin.from) * easeOutCubic(t);
        apply(offsetRef.current);
        if (t >= 1) {
          // Snap back into the padded band (same tile) so offsets stay bounded.
          offsetRef.current = (((spin.to % loopWidth) + loopWidth) % loopWidth) + WRAP_PAD_LOOPS * loopWidth;
          apply(offsetRef.current);
          spinRef.current = null;
          onLandedRef.current?.();
        }
      } else if (!reduced && !landedFor.current) {
        // Idle drift until a result exists (fast while the server is
        // choosing); after landing the strip holds still.
        const dt = now - last;
        const goal = pendingRef.current ? PENDING_SPEED_TILES_PER_MS : IDLE_SPEED_TILES_PER_MS;
        velocityRef.current += (goal - velocityRef.current) * Math.min(1, dt / SPEED_EASE_MS);
        offsetRef.current += velocityRef.current * dt;
        while (offsetRef.current >= (WRAP_PAD_LOOPS + 1) * loopWidth) offsetRef.current -= loopWidth;
        apply(offsetRef.current);
      }
      last = now;
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [poolSize, loopWidth]);

  const strip = Array.from({ length: REPEAT * poolSize }, (_, i) => items[i % poolSize]);
  const spinning = (pending || Boolean(target)) && !landed;

  return (
    // py-6 leaves room for the landing pop (scales the tile up to 1.18x).
    // Phones: 176px tiles, 12px gap. sm+: 256px tiles, 20px gap.
    <div
      className="relative mx-auto max-w-6xl overflow-hidden py-5 [--gap:12px] [--tile:176px] sm:py-6 sm:[--gap:20px] sm:[--tile:256px]"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
        <div className="h-0 w-0 border-x-8 border-t-[10px] border-x-transparent border-t-primary" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
        <div className="h-0 w-0 border-x-8 border-b-[10px] border-x-transparent border-b-primary" />
      </div>
      <div
        ref={trackRef}
        className="flex gap-(--gap) will-change-transform"
        style={{ transform: translate(initialOffset) }}
      >
        {/* Tiles mirror the Featured Game Categories cards: cover area with a
            tag pill, then title + description below. */}
        {strip.map((item, i) => {
          const isActive = i === activeAbs;
          const accent = ACCENT[item.tier];
          return (
            <div
              key={i}
              className={cn(
                "card-border w-(--tile) shrink-0 overflow-hidden rounded-xl text-left",
                isActive && cn("ring-2 ring-purple/60", spinning ? "animate-tick-flash" : "animate-tile-land"),
              )}
            >
              <div
                className="relative flex h-24 items-center justify-center sm:h-36"
                style={{ background: `linear-gradient(160deg, color-mix(in oklch, ${accent}, transparent 70%), var(--card))` }}
              >
                {REWARD_IMAGES.has(item.key) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing for the optimizer to do
                  <img src={`/images/rewards/${item.key}.svg`} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
                ) : (
                  <span className="text-4xl drop-shadow-lg sm:text-5xl">{EMOJI[item.tier]}</span>
                )}
                <span className="absolute top-2 left-2 rounded-full bg-black/40 px-2 py-0.5 backdrop-blur-sm">
                  <RarityBadge rarity={item.tier} className="tracking-wide" />
                </span>
              </div>
              <div className="p-3 sm:p-5">
                <p className="line-clamp-1 font-display text-sm font-bold sm:text-base">{item.label}</p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
