"use client";

import { useRef, useState } from "react";
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
  const [activeIndex, setActiveIndex] = useState(() => {
    const i = rewardPool.findIndex((r) => r.label === "Viewer Drop");
    return i === -1 ? 0 : i;
  });
  const [spinning, setSpinning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSpin() {
    if (spinning) return;
    setSpinning(true);
    void logEngagementEvent("SPIN_CLICKED");

    // The reveal is rigged, not random: it lands on a reward matching the
    // participant's assigned Condition.rewardRarity when one is available.
    const candidates = rewardPool.filter((r) => r.rarity === config.rewardRarity);
    const pool = candidates.length ? candidates : rewardPool;
    const target = pool[Math.floor(Math.random() * pool.length)];
    const targetIndex = rewardPool.indexOf(target);
    let ticks = 0;
    const totalTicks = 18;
    const tick = () => {
      ticks += 1;
      setActiveIndex((i) => (i + 1) % rewardPool.length);
      if (ticks >= totalTicks) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setActiveIndex(targetIndex);
        setSpinning(false);
        setTimeout(() => {
          setModalOpen(true);
          void logEngagementEvent("MODAL_OPENED");
        }, 350);
        return;
      }
    };

    let delay = 70;
    const step = () => {
      tick();
      if (ticks < totalTicks) {
        delay += 12;
        timerRef.current = setTimeout(step, delay);
      }
    };
    step();
  }

  const selected = rewardPool[activeIndex];

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

        <div className="scrollbar-none mt-10 flex items-center justify-center gap-3 overflow-x-auto pb-2">
          {rewardPool.map((reward, i) => {
            const accent = RARITY_ACCENT[reward.rarity];
            const isActive = i === activeIndex;
            return (
              <div
                key={reward.label}
                className={cn(
                  "relative w-36 shrink-0 rounded-2xl border p-4 text-left transition-all duration-300",
                  isActive
                    ? cn(
                        "scale-110 border-2",
                        spinning ? "animate-tick-flash" : "animate-tile-land",
                      )
                    : "scale-95 border-border-strong/50 opacity-60",
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
                <span className="text-lg" aria-hidden>
                  {RARITY_EMOJI[reward.rarity]}
                </span>
                <RarityBadge rarity={reward.rarity} className="mt-1 block" />
                <p className="mt-2 text-sm font-bold font-display">{reward.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{reward.sub}</p>
              </div>
            );
          })}
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
