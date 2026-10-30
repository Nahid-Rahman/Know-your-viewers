"use client";

import { useEffect, useRef } from "react";
import { RarityBadge, type Rarity } from "@/components/common/rarity-badge";
import { cn } from "@/lib/utils";

export type ReelItem = { key: string; label: string; sub: string; tier: Rarity };

const TILE_W = 144;
const GAP = 12;
const PITCH = TILE_W + GAP;
const REPEAT = 10;
const SPIN_MS = 2600;

const ACCENT: Record<Rarity, string> = {
  common: "var(--blue)",
  rare: "var(--purple)",
  exceptional: "var(--primary)",
  premium: "var(--green)",
};

/**
 * Purely presentational: it animates to `target` (a key the SERVER chose and
 * already stored) and calls onLanded. It never picks an outcome itself.
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
  onLanded: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(2 * items.length * PITCH);
  const landedFor = useRef<string | null>(null);
  const onLandedRef = useRef(onLanded);
  useEffect(() => {
    onLandedRef.current = onLanded;
  }, [onLanded]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transform = `translateX(calc(50% - ${TILE_W / 2}px - ${offsetRef.current}px))`;
  }, []);

  useEffect(() => {
    if (!target || landedFor.current === target || !items.length) return;
    const idx = Math.max(0, items.findIndex((i) => i.key === target));
    const loop = items.length * PITCH;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = offsetRef.current;
    let end = Math.floor(start / loop) * loop + idx * PITCH;
    while (end < start + (reduced ? 0 : 3) * loop) end += loop;
    const duration = reduced ? 1 : SPIN_MS;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const px = start + (end - start) * (1 - Math.pow(1 - t, 3));
      offsetRef.current = px;
      if (trackRef.current) trackRef.current.style.transform = `translateX(calc(50% - ${TILE_W / 2}px - ${px}px))`;
      if (t < 1) raf = requestAnimationFrame(frame);
      else {
        // Re-centre into the repeated band so the strip never runs out.
        offsetRef.current = 2 * loop + idx * PITCH;
        if (trackRef.current) trackRef.current.style.transform = `translateX(calc(50% - ${TILE_W / 2}px - ${offsetRef.current}px))`;
        landedFor.current = target;
        onLandedRef.current();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, items]);

  const strip = Array.from({ length: REPEAT * items.length }, (_, i) => items[i % items.length]);
  const landedIdx = target ? items.findIndex((i) => i.key === target) : -1;

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
      <div ref={trackRef} className="flex gap-3 will-change-transform">
        {strip.map((item, i) => {
          const highlight = landed && i % items.length === landedIdx;
          return (
            <div
              key={i}
              className={cn(
                "flex h-36 w-36 shrink-0 flex-col justify-between rounded-2xl border p-4 text-left",
                highlight ? "border-2" : "border-border-strong/50",
              )}
              style={
                highlight
                  ? { borderColor: ACCENT[item.tier], boxShadow: `0 0 28px -6px ${ACCENT[item.tier]}` }
                  : undefined
              }
            >
              <RarityBadge rarity={item.tier} className="block" />
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
