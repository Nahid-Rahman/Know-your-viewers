"use client";

import { useRef, useState } from "react";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { RarityBadge } from "@/components/common/rarity-badge";
import { Button } from "@/components/ui/button";
import { RewardClaimModal } from "@/features/stimulus/components/reward-claim-modal";
import { rewardPool } from "@/features/stimulus/config";
import { cn } from "@/lib/utils";

const DEFAULT_INDEX = rewardPool.findIndex((r) => r.label === "Viewer Drop");

export function RewardRouletteSection() {
  const [activeIndex, setActiveIndex] = useState(DEFAULT_INDEX);
  const [spinning, setSpinning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSpin() {
    if (spinning) return;
    setSpinning(true);

    const targetIndex = Math.floor(Math.random() * rewardPool.length);
    let ticks = 0;
    const totalTicks = 18;
    const tick = () => {
      ticks += 1;
      setActiveIndex((i) => (i + 1) % rewardPool.length);
      if (ticks >= totalTicks) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setActiveIndex(targetIndex);
        setSpinning(false);
        setTimeout(() => setModalOpen(true), 350);
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
        <EyebrowLabel variant="primary" glyph={null} className="mb-4">
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

        <div className="mt-10 flex items-center justify-center gap-3 overflow-x-auto pb-2">
          {rewardPool.map((reward, i) => (
            <div
              key={reward.label}
              className={cn(
                "card-border w-32 shrink-0 rounded-xl p-4 text-left transition-all",
                i === activeIndex
                  ? "border-primary! shadow-[0_0_30px_-8px_var(--primary)] scale-105"
                  : "opacity-70",
              )}
            >
              <RarityBadge rarity={reward.rarity} />
              <p className="mt-2 text-xs font-semibold">{reward.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{reward.sub}</p>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          onClick={handleSpin}
          disabled={spinning}
          className="mt-8 h-11 w-full max-w-xs bg-gradient-primary text-sm font-bold tracking-wide text-white hover:opacity-90 sm:w-auto sm:px-10"
        >
          {spinning ? "SPINNING..." : "SPIN"}
        </Button>

        <p className="mt-4 text-xs text-muted-foreground">
          <span aria-hidden>✦</span> 100% Official &mdash; This is a certified viewer rewards distribution.
        </p>

        <p className="mt-2 text-xs text-muted-foreground">
          <span aria-hidden>☆</span> Selected preview: {selected.label}
        </p>
      </div>

      <RewardClaimModal open={modalOpen} onOpenChange={setModalOpen} reward={selected} />
    </section>
  );
}
