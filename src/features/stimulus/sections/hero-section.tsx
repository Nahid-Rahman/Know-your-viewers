import { Fragment } from "react";
import Link from "next/link";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { CountdownChip } from "@/components/common/countdown-chip";
import { RewardOrb } from "@/components/common/reward-orb";
import { HeroContactCard } from "@/features/stimulus/components/hero-contact-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StimulusRuntimeConfig } from "@/features/stimulus/config";

/** Renders editable headline copy: "\n" breaks lines, **text** gets the gradient highlight. */
function HeroHeadline({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <span key={j} className="text-gradient-primary">
                {part.slice(2, -2)}
              </span>
            ) : (
              <Fragment key={j}>{part}</Fragment>
            ),
          )}
        </Fragment>
      ))}
    </>
  );
}

export function HeroSection({
  config,
  content,
}: {
  config: StimulusRuntimeConfig;
  content: { heroHeadline: string; heroSubtext: string; claimedCount: string; countdownSeconds: number };
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
        <div>
          {config.authorityBadgesEnabled && (
            <EyebrowLabel className="mb-5">OFFICIAL VIEWER REWARD EVENT</EyebrowLabel>
          )}

          <h1 className="font-display text-5xl leading-[1.05] font-bold sm:text-6xl">
            <HeroHeadline text={content.heroHeadline} />
          </h1>

          <p className="mt-5 max-w-md text-muted-foreground">{content.heroSubtext}</p>

          {config.urgencyEnabled && (
            <div className="mt-6">
              <CountdownChip durationSeconds={content.countdownSeconds} />
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Link
              href="/#spin"
              className={cn(buttonVariants({ size: "lg" }), "bg-gradient-primary px-6 text-white hover:opacity-90")}
            >
              TRY YOUR LUCK
            </Link>
            <Link href="/#how-it-works" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              How it works &rarr;
            </Link>
          </div>

          {config.socialProofEnabled && (
            <p className="mt-6 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{content.claimedCount}</span> players
              have already claimed rewards
            </p>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            🔒 No password needed &nbsp; 📱 Mobile friendly &nbsp; 👤 Follow-up by admin
          </p>
        </div>

        <div className="relative flex justify-center md:justify-end">
          <RewardOrb />
          <HeroContactCard />
        </div>
      </div>
    </section>
  );
}
