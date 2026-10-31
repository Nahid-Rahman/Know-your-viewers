import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { RewardReel, type ReelItem } from "./reward-reel";
import type { StudyBranding } from "./streamer-header";
import { Faq, HowItWorks } from "./info-sections";
import { StudyHero } from "./study-hero";
import type { SiteSections } from "./study-home";
import { TrustBadgesSection } from "@/features/stimulus/sections/trust-badges-section";
import { CategoriesSection } from "@/features/stimulus/sections/categories-section";

export type IdleHomeProps = {
  /** The session's streamer when its entries just closed; null when no session is running. */
  branding: StudyBranding | null;
  homepage: { heroHeadline: string; heroSubtext: string; howItWorks: string[]; faqItems: { q: string; a: string }[] };
  reelItems: ReelItem[];
  statusTitle: string;
  statusText: string;
  sections: SiteSections;
};

/**
 * Homepage while entries aren't open: the same full site, but the wheel is a
 * drifting preview with no spin button, there is no form, and no visit or
 * event is recorded (there is no session to attribute it to).
 */
export function IdleHome(props: IdleHomeProps) {
  return (
    <>
      <StudyHero
        headline={props.homepage.heroHeadline}
        subtext={props.homepage.heroSubtext}
        branding={props.branding}
        deadlineIso={null}
        ctaLabel="See the wheel"
      />
      <TrustBadgesSection badges={props.sections.trustBadges} />
      <CategoriesSection gameCategories={props.sections.gameCategories} />

      <section id="spin" className="scroll-mt-[69px] border-y border-border bg-background-deep/40 py-16">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
          <EyebrowLabel variant="primary" glyph="🎰" className="mb-4">
            ROULETTE
          </EyebrowLabel>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Spin the Wheel for Your
            <br />
            <span className="text-gradient-primary">Viewer Drop!</span>
          </h2>
          <div className="mt-10">
            <RewardReel items={props.reelItems} target={null} landed={false} />
          </div>
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card/70 p-5" role="status">
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
