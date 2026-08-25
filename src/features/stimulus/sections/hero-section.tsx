import Link from "next/link";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { CountdownChip } from "@/components/common/countdown-chip";
import { RewardOrb } from "@/components/common/reward-orb";
import { HeroContactCard } from "@/features/stimulus/components/hero-contact-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { defaultStimulusConfig } from "@/features/stimulus/config";

export function HeroSection() {
  const config = defaultStimulusConfig;

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
        <div>
          {config.authorityBadgesEnabled && (
            <EyebrowLabel className="mb-5">OFFICIAL VIEWER REWARD EVENT</EyebrowLabel>
          )}

          <h1 className="font-display text-5xl leading-[1.05] font-bold sm:text-6xl">
            UNLOCK
            <br />
            YOUR
            <br />
            <span className="text-gradient-primary">VIEWER DROP</span>
            <br />
            TODAY!
          </h1>

          <p className="mt-5 max-w-md text-muted-foreground">
            Spin the reward roll for a chance to unlock exclusive viewer bonuses before the
            event closes. Verified event access. No password required.
          </p>

          {config.urgencyEnabled && (
            <div className="mt-6">
              <CountdownChip durationSeconds={config.countdownSeconds} />
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
              <span className="font-semibold text-foreground">{config.claimedCount}</span> players
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
