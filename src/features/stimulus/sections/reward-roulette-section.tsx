"use client";

import { useState } from "react";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { RarityBadge, type Rarity } from "@/components/common/rarity-badge";
import { Button } from "@/components/ui/button";
import { RewardClaimModal } from "@/features/stimulus/components/reward-claim-modal";
import type { StimulusRuntimeConfig } from "@/features/stimulus/config";
import { logEngagementEvent } from "@/lib/actions/participant";
import { cn } from "@/lib/utils";

type RewardPoolItem = { label: string; sub: string; rarity: Rarity };

const RARITY_ACCENT: Record<Rarity, string> = {
  common: "var(--blue)",
  rare: "var(--purple)",
  exceptional: "var(--primary)",
  premium: "var(--green)",
};

const RARITY_EMOJI: Record<Rarity, string> = {
  common: "⭐",
  rare: "💠",
  exceptional: "🔥",
  premium: "💎",
};

// Reel geometry — every tile is the same fixed size, so the strip position
// (not tile scale) is what carries the "landed" state. TILE_W/GAP must match
// the w-36/gap-3 classes below, and SPIN_DURATION_MS must match the
// duration-[…] transition class, since JS times the landing off of it.
const TILE_W = 144;
const GAP = 12;
const PITCH = TILE_W + GAP;
const SPIN_LOOPS = 4;
const LOOP_PAD = 3;
const REPEAT = 12;
const SPIN_DURATION_MS = 3200;
const REDUCED_MOTION_DURATION_MS = 400;

export function RewardRouletteSection({
  config,
  rewardPool,
  gameTypeOptions,
  watchFrequencyOptions,
}: {
  config: StimulusRuntimeConfig;
  rewardPool: RewardPoolItem[];
  gameTypeOptions: string[];
  watchFrequencyOptions: string[];
}) {
  const poolSize = rewardPool.length;
  const [reelIndex, setReelIndex] = useState(() => {
    const i = rewardPool.findIndex((r) => r.label === "Viewer Drop");
    return LOOP_PAD * poolSize + (i === -1 ? 0 : i);
  });
  const [spinning, setSpinning] = useState(false);
  const [instant, setInstant] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  function handleSpin() {
    if (spinning || poolSize === 0) return;
    setSpinning(true);
    void logEngagementEvent("SPIN_CLICKED");

    // The reveal is rigged, not random: it lands on a reward matching the
    // participant's assigned Condition.rewardRarity when one is available.
    const candidates = rewardPool.filter((r) => r.rarity === config.rewardRarity);
    const pool = candidates.length ? candidates : rewardPool;
    const target = pool[Math.floor(Math.random() * pool.length)];
    const targetIndex = rewardPool.indexOf(target);

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? REDUCED_MOTION_DURATION_MS : SPIN_DURATION_MS;
    const loops = reduced ? 1 : SPIN_LOOPS;

    setReelIndex((current) => {
      const currentMod = current % poolSize;
      const delta = ((targetIndex - currentMod) + poolSize) % poolSize || poolSize;
      return current + loops * poolSize + delta;
    });

    window.setTimeout(() => {
      setSpinning(false);
      // Snap the strip back to an early lap (same reward, since the strip
      // just repeats the pool) so the array position never grows unbounded.
      setReelIndex((current) => LOOP_PAD * poolSize + (current % poolSize));
      setInstant(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)));

      setTimeout(() => {
        setModalOpen(true);
        void logEngagementEvent("MODAL_OPENED");
      }, 250);
    }, duration);
  }

  const selected = rewardPool[reelIndex % poolSize] ?? rewardPool[0];
  const stripItems = Array.from({ length: REPEAT * poolSize }, (_, i) => rewardPool[i % poolSize]);

  return (
    <section
      id="spin"
      className="scroll-mt-[69px] border-y border-border bg-background-deep/40 py-16"
    >
      <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
        <EyebrowLabel variant="primary" glyph="🎰" className="mb-4">
          ROULETTE
        </EyebrowLabel>
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Spin Now and Win
          <br />
          <span className="text-gradient-primary">Amazing Rewards!</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Click the spin button to roll for your viewer reward.
        </p>

        <div
          className="relative mx-auto mt-10 max-w-2xl overflow-hidden py-2"
          style={{
            maskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
            WebkitMaskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
          }}
        >
          {/* Landing-slot pointer, like a prize wheel's fixed marker. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
            <div className="h-0 w-0 border-x-8 border-t-[10px] border-x-transparent border-t-primary" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
            <div className="h-0 w-0 border-x-8 border-b-[10px] border-x-transparent border-b-primary" />
          </div>

          <div
            className={cn("flex gap-3", !instant && "transition-transform ease-[cubic-bezier(0.15,0.85,0.25,1)]")}
            style={{
              transform: `translateX(calc(50% - ${TILE_W / 2}px - ${reelIndex * PITCH}px))`,
              transitionDuration: instant ? "0ms" : `${SPIN_DURATION_MS}ms`,
            }}
          >
            {stripItems.map((reward, i) => {
              const accent = RARITY_ACCENT[reward.rarity];
              const isActive = i === reelIndex;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex h-40 w-36 shrink-0 flex-col justify-between rounded-2xl border p-4 text-left",
                    isActive
                      ? cn("border-2", spinning ? "animate-tick-flash" : "animate-tile-land")
                      : "border-border-strong/50 opacity-50",
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
                    <span className="text-lg" aria-hidden>
                      {RARITY_EMOJI[reward.rarity]}
                    </span>
                    <RarityBadge rarity={reward.rarity} className="mt-1 block" />
                  </div>
                  <div>
                    <p className="line-clamp-2 font-display text-sm font-bold">{reward.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{reward.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Button
          size="lg"
          onClick={handleSpin}
          disabled={spinning}
          className={cn(
            "mt-10 h-16 w-full max-w-xs rounded-full bg-gradient-primary text-base font-black tracking-wide text-white uppercase shadow-[0_0_44px_-10px_var(--primary)] transition-transform hover:opacity-90 active:scale-95 disabled:opacity-90 sm:w-auto sm:px-16",
            !spinning && "animate-pulse-glow",
          )}
        >
          <span aria-hidden className={cn("mr-2 inline-block", spinning && "animate-spin-slow")}>
            🎰
          </span>
          {spinning ? "Spinning..." : "Spin to Win"}
        </Button>

        <p className="mt-4 text-xs text-muted-foreground">
          <span aria-hidden>✦</span> 100% Official &mdash; This is a certified viewer rewards distribution.
        </p>

        <p className="mt-2 text-xs text-muted-foreground">
          <span aria-hidden>☆</span> Selected preview: {selected.label}
        </p>
      </div>

      <RewardClaimModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        reward={selected}
        contactRequirement={config.contactRequirement}
        gameTypeOptions={gameTypeOptions}
        watchFrequencyOptions={watchFrequencyOptions}
      />
    </section>
  );
}
