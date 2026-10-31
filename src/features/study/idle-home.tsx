import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { RewardReel, type ReelItem } from "./reward-reel";
import { StreamerHeader, type StudyBranding } from "./streamer-header";
import { Faq, HowItWorks } from "./info-sections";

export type IdleHomeProps = {
  /** The session's streamer when its entries just closed; null when no session is running. */
  branding: StudyBranding | null;
  homepage: { heroHeadline: string; heroSubtext: string; howItWorks: string[]; faqItems: { q: string; a: string }[] };
  reelItems: ReelItem[];
  statusTitle: string;
  statusText: string;
};

/**
 * Homepage while entries aren't open. The site stays fully visible, but the
 * wheel is a static preview, there is no form, and no visit or event is
 * recorded (there is no session to attribute it to).
 */
export function IdleHome(props: IdleHomeProps) {
  return (
    <>
      {props.branding && <StreamerHeader branding={props.branding} deadlineText={null} />}

      <section className="mx-auto w-full max-w-3xl px-4 pt-10 pb-6 text-center sm:px-6">
        <h1 className="font-display text-4xl leading-tight font-bold sm:text-5xl">{props.homepage.heroHeadline}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">{props.homepage.heroSubtext}</p>
      </section>

      <section id="spin" className="scroll-mt-[69px] border-y border-border bg-background-deep/40 py-12">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
          <EyebrowLabel variant="primary" glyph="🎰" className="mb-4">
            REWARD WHEEL
          </EyebrowLabel>
          <div className="opacity-60">
            <RewardReel items={props.reelItems} target={null} landed={false} />
          </div>
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-card/70 p-5" role="status">
            <p className="font-display text-lg font-bold">{props.statusTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">{props.statusText}</p>
          </div>
        </div>
      </section>

      <HowItWorks steps={props.homepage.howItWorks} />
      <Faq items={props.homepage.faqItems} />
    </>
  );
}
