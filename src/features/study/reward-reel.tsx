"use client";

import { useEffect, useRef, useState } from "react";
import { RarityBadge, type Rarity } from "@/components/common/rarity-badge";
import { cn } from "@/lib/utils";

export type ReelItem = { key: string; label: string; sub: string; tier: Rarity };

// Geometry must match the w-36 / gap-3 classes below. One persistent rAF loop
// drives the strip so the idle drift and the landing never fight each other.
const TILE_W = 144;
const GAP = 12;
const PITCH = TILE_W + GAP;
const REPEAT = 12;
const WRAP_PAD_LOOPS = 5;
const SPIN_LOOPS = 4;
const SPIN_MS = 2500;
const REDUCED_MOTION_SPIN_MS = 400;
const IDLE_SPEED_PX_PER_MS = 0.022;

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

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Purely presentational: drifts slowly while idle, and when `target` (a key
 * the SERVER already chose and stored) arrives it decelerates onto that tile
 * and calls onLanded. It never picks an outcome itself.
 */
export function RewardReel({
  items,
  target,
  landed,
  onLanded,
}: {
  items: ReelItem[];
  target: string | null;
  landed: boolean;
  onLanded?: () => void;
}) {
  const poolSize = items.length;
  const loopWidth = poolSize * PITCH;
  const initialOffset = WRAP_PAD_LOOPS * loopWidth;

  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(initialOffset);
  const spinRef = useRef<{ start: number; from: number; to: number; duration: number } | null>(null);
  const landedFor = useRef<string | null>(null);
  const onLandedRef = useRef(onLanded);
  const [activeAbs, setActiveAbs] = useState(WRAP_PAD_LOOPS * poolSize);
  const activeAbsRef = useRef(WRAP_PAD_LOOPS * poolSize);

  useEffect(() => {
    onLandedRef.current = onLanded;
  }, [onLanded]);

  // Start a landing whenever the server-chosen target arrives.
  useEffect(() => {
    if (!target || landedFor.current === target || !poolSize) return;
    const idx = Math.max(0, items.findIndex((i) => i.key === target));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = offsetRef.current;
    let to = Math.floor(from / loopWidth) * loopWidth + idx * PITCH;
    while (to < from + (reduced ? 1 : SPIN_LOOPS) * loopWidth) to += loopWidth;
    spinRef.current = { start: performance.now(), from, to, duration: reduced ? REDUCED_MOTION_SPIN_MS : SPIN_MS };
    landedFor.current = target;
  }, [target, items, poolSize, loopWidth]);

  useEffect(() => {
    if (!poolSize) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = performance.now();
    let id = 0;

    const apply = (px: number) => {
      if (trackRef.current) trackRef.current.style.transform = `translateX(calc(50% - ${TILE_W / 2}px - ${px}px))`;
      const abs = Math.round(px / PITCH);
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
        // Idle drift until a result exists; after landing the strip holds still.
        offsetRef.current += IDLE_SPEED_PX_PER_MS * (now - last);
        if (offsetRef.current >= (WRAP_PAD_LOOPS + 1) * loopWidth) offsetRef.current -= loopWidth;
        apply(offsetRef.current);
      }
      last = now;
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [poolSize, loopWidth]);

  const strip = Array.from({ length: REPEAT * poolSize }, (_, i) => items[i % poolSize]);
  const spinning = Boolean(target) && !landed;

  return (
    <div
      className="relative mx-auto max-w-2xl overflow-hidden py-2"
      style={{
        maskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
      }}
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
        className="flex gap-3 will-change-transform"
        style={{ transform: `translateX(calc(50% - ${TILE_W / 2}px - ${initialOffset}px))` }}
      >
        {strip.map((item, i) => {
          const isActive = i === activeAbs;
          const accent = ACCENT[item.tier];
          return (
            <div
              key={i}
              className={cn(
                "flex h-40 w-36 shrink-0 flex-col justify-between rounded-2xl border p-4 text-left",
                isActive ? cn("border-2", spinning ? "animate-tick-flash" : "animate-tile-land") : "border-border-strong/50 opacity-50",
              )}
              style={
                isActive
                  ? {
                      borderColor: accent,
                      boxShadow: `0 0 32px -6px ${accent}`,
                      background: `linear-gradient(160deg, color-mix(in oklch, ${accent}, transparent 85%), var(--card))`,
                    }
                  : undefined
              }
            >
              <div>
                <span className="text-lg">{EMOJI[item.tier]}</span>
                <RarityBadge rarity={item.tier} className="mt-1 block" />
              </div>
              <div>
                <p className="line-clamp-2 font-display text-sm font-bold">{item.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
