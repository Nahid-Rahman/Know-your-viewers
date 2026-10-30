"use client";

import { useRef, useState } from "react";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { Button } from "@/components/ui/button";
import { spinWheel } from "@/lib/actions/study-public";
import { RewardReel, type ReelItem } from "./reward-reel";
import { EntryFormDialog } from "./entry-form-dialog";
import { useSectionViewed, useStudyVisit } from "./use-study-visit";
import { StreamerHeader, type StudyBranding } from "./streamer-header";

export type StudyHomeProps = {
  configId: string;
  branding: StudyBranding;
  homepage: { heroHeadline: string; heroSubtext: string; howItWorks: string[]; faqItems: { q: string; a: string }[] };
  reel: { items: ReelItem[]; resultHeadline: string; resultExplanation: string };
  deadlineText: string | null;
  isTest: boolean;
  notice: { text: string; version: string } | null;
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
    }, 400);
  }

  return (
    <>
      {props.isTest && (
        <div className="border-b border-amber-400/40 bg-amber-400/15 px-4 py-2 text-center text-xs font-semibold text-amber-200" role="status">
          TEST SESSION — synthetic data only. Not a live study; do not share this page.
        </div>
      )}

      <StreamerHeader branding={props.branding} deadlineText={props.deadlineText} />

      <section className="mx-auto w-full max-w-3xl px-4 pt-4 pb-6 text-center sm:px-6">
        <h1 className="font-display text-4xl leading-tight font-bold sm:text-5xl">{props.homepage.heroHeadline}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">{props.homepage.heroSubtext}</p>
        {props.notice && (
          <p className="mx-auto mt-4 max-w-xl rounded-lg border border-border bg-card/60 p-3 text-left text-xs text-muted-foreground">
            {props.notice.text}
          </p>
        )}
      </section>

      <section ref={rewardRef} id="spin" className="scroll-mt-[69px] border-y border-border bg-background-deep/40 py-12">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
          <EyebrowLabel variant="primary" glyph="🎰" className="mb-4">
            REWARD WHEEL
          </EyebrowLabel>
          <RewardReel items={props.reel.items} target={target?.key ?? null} landed={landed} onLanded={handleLanded} />
          <Button
            size="lg"
            onClick={handleSpin}
            disabled={!visitId || spinning}
            className="mt-8 h-14 w-full max-w-xs rounded-full bg-gradient-primary text-base font-black tracking-wide text-white uppercase hover:opacity-90 sm:w-auto sm:px-14"
          >
            {spinning ? "Spinning…" : landed ? "Enter the draw" : "Spin the wheel"}
          </Button>
          <p className="mx-auto mt-4 max-w-md text-xs text-muted-foreground" aria-live="polite">
            {spinError ??
              (landed && target
                ? `Wheel result: ${target.label}. ${props.reel.resultHeadline}.`
                : "The wheel result is shown for fun — draw winners are chosen at random after the session.")}
          </p>
        </div>
      </section>

      {props.homepage.howItWorks.length > 0 && (
        <section id="how-it-works" className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
          <h2 className="mb-5 font-display text-2xl font-bold">How it works</h2>
          <ol className="space-y-3">
            {props.homepage.howItWorks.map((step, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-border bg-card/60 p-4 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {props.homepage.faqItems.length > 0 && (
        <section id="faq" className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
          <h2 className="mb-5 font-display text-2xl font-bold">FAQ</h2>
          <div className="space-y-3">
            {props.homepage.faqItems.map((f, i) => (
              <details key={i} className="rounded-xl border border-border bg-card/60 p-4">
                <summary className="cursor-pointer text-sm font-semibold">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

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
