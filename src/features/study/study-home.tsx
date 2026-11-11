"use client";

import { useRef, useState } from "react";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { Button } from "@/components/ui/button";
import { spinWheel } from "@/lib/actions/study-public";
import { RewardReel, type ReelItem } from "./reward-reel";
import { ResultReveal } from "./result-reveal";
import { EntryFormDialog } from "./entry-form-dialog";
import { useSectionViewed, useStudyVisit } from "./use-study-visit";
import type { StudyBranding } from "./streamer-header";
import { Faq, HowItWorks } from "./info-sections";
import { StudyHero } from "./study-hero";
import { TrustBadgesSection } from "@/features/stimulus/sections/trust-badges-section";
import { CategoriesSection } from "@/features/stimulus/sections/categories-section";
import { cn } from "@/lib/utils";

export type SiteSections = {
  trustBadges: { icon: string; title: string; description: string }[];
  gameCategories: { icon: string; image: string; tag: string; title: string; description: string }[];
};

export type StudyHomeProps = {
  configId: string;
  branding: StudyBranding;
  homepage: { heroHeadline: string; heroSubtext: string; howItWorks: string[]; faqItems: { q: string; a: string }[] };
  reel: { items: ReelItem[]; resultHeadline: string; resultExplanation: string };
  /** Real entry deadline (actual end + 2 h), or null until the actual end is recorded. */
  deadlineIso: string | null;
  isTest: boolean;
  notice: { text: string; version: string } | null;
  sections: SiteSections;
  refCode: string | null;
};

export function StudyHome(props: StudyHomeProps) {
  const { visitId, track } = useStudyVisit({ refCode: props.refCode, renderedConfigId: props.configId });
  const rewardRef = useRef<HTMLElement>(null);
  useSectionViewed(rewardRef, Boolean(visitId), () => track({ type: "REWARD_SECTION_VIEWED" }));

  const [target, setTarget] = useState<{ key: string; label: string } | null>(null);
  const [landed, setLanded] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function handleSpin() {
    if (!visitId || spinning) return;
    if (landed) {
      setFormOpen(true);
      track({ type: "FORM_OPENED" });
      return;
    }
    setSpinning(true);
    setSpinError(null);
    const r = await spinWheel(visitId);
    if (!r.ok) {
      setSpinError(r.error);
      setSpinning(false);
      return;
    }
    setTarget({ key: r.resultKey, label: r.resultLabel });
  }

  function handleLanded() {
    setSpinning(false);
    setLanded(true);
    track({ type: "SPIN_COMPLETED" });
    window.setTimeout(() => {
      setFormOpen(true);
      track({ type: "FORM_OPENED" });
    }, 2200);
  }

  return (
    <>
      {props.isTest && (
        <div className="border-b border-amber-400/40 bg-amber-400/15 px-4 py-2 text-center text-xs font-semibold text-amber-200" role="status">
          TEST SESSION — synthetic data only. Not a live study; do not share this page.
        </div>
      )}

      <StudyHero
        headline={props.homepage.heroHeadline}
        subtext={props.homepage.heroSubtext}
        branding={props.branding}
        deadlineIso={props.deadlineIso}
        ctaLabel="Try your luck"
        notice={props.notice}
      />
      <TrustBadgesSection badges={props.sections.trustBadges} />
      <CategoriesSection gameCategories={props.sections.gameCategories} />

      <section ref={rewardRef} id="spin" className="scroll-mt-[69px] overflow-x-clip border-y border-border bg-background-deep/40 py-16">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
          <EyebrowLabel variant="primary" glyph="🎰" className="mb-4">
            ROULETTE
          </EyebrowLabel>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Spin the Wheel for Your
            <br />
            <span className="text-gradient-primary">Viewer Drop!</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">Click the spin button, then leave your details to enter the prize draw.</p>
          <div className="mt-10">
            <RewardReel items={props.reel.items} target={target?.key ?? null} landed={landed} onLanded={handleLanded} />
          </div>
          {landed && target && <ResultReveal label={target.label} headline={props.reel.resultHeadline} />}
          <Button
            size="lg"
            onClick={handleSpin}
            disabled={!visitId || spinning}
            className={cn(
              "mt-10 h-16 w-full max-w-xs rounded-full bg-gradient-primary text-base font-black tracking-wide text-white uppercase shadow-[0_0_44px_-10px_var(--primary)] transition-transform hover:opacity-90 active:scale-95 disabled:opacity-90 sm:w-auto sm:px-16",
              !spinning && visitId && "animate-pulse-glow",
            )}
          >
            <span aria-hidden className={cn("mr-2 inline-block", spinning && "animate-spin-slow")}>
              🎰
            </span>
            {spinning ? "Spinning…" : landed ? "Enter the draw" : "Spin the wheel"}
          </Button>
          <p className="mx-auto mt-4 max-w-md text-xs text-muted-foreground" aria-live="polite">
            {spinError ??
              (landed && target
                ? "Enter the draw with your details — winners are picked at random after the session."
                : "The wheel result is shown for fun — draw winners are chosen at random after the session.")}
          </p>
        </div>
      </section>

      <HowItWorks steps={props.homepage.howItWorks} />
      <Faq items={props.homepage.faqItems} />

      <EntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        visitId={visitId}
        result={target ? { label: target.label, headline: props.reel.resultHeadline, explanation: props.reel.resultExplanation } : null}
        track={track}
      />
    </>
  );
}
