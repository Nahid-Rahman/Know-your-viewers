import { RichHeadline } from "@/components/common/rich-headline";
import { RewardOrb } from "@/components/common/reward-orb";
import { CountdownChip } from "@/components/common/countdown-chip";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudyBranding } from "./streamer-header";
import { StreamerSpotlight } from "./streamer-spotlight";

/**
 * The original two-column hero. The right column shows the session's
 * streamer (photo + name) — or the trophy orb when there is no streamer to
 * show — and the countdown only runs to the real entry deadline.
 */
export function StudyHero({
  headline,
  subtext,
  branding,
  deadlineIso,
  ctaLabel,
  notice,
}: {
  headline: string;
  subtext: string;
  branding: StudyBranding | null;
  deadlineIso: string | null;
  ctaLabel: string;
  notice?: { text: string } | null;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <h1 className="font-display text-5xl leading-[1.05] font-bold sm:text-6xl">
            <RichHeadline text={headline} />
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground">{subtext}</p>
          {branding && <p className="mt-3 max-w-md text-sm text-muted-foreground">{branding.welcomeText}</p>}

          {deadlineIso && (
            <div className="mt-6">
              <CountdownChip durationSeconds={0} expiresAt={new Date(deadlineIso)} />
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-5">
            <a href="#spin" className={cn(buttonVariants({ size: "lg" }), "bg-gradient-primary px-6 text-white uppercase hover:opacity-90")}>
              {ctaLabel}
            </a>
            <a href="#how-it-works" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              How it works &rarr;
            </a>
          </div>

          {notice && (
            <p className="mt-6 max-w-md rounded-lg border border-border bg-card/60 p-3 text-xs text-muted-foreground">{notice.text}</p>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            🔒 No password needed &nbsp; 📱 Mobile friendly &nbsp; 👥 Viewers study
          </p>
        </div>

        {/* On phones the streamer comes first so viewers see who they're watching without scrolling. */}
        <div className="relative order-first flex justify-center md:order-none md:justify-end">
          {branding ? <StreamerSpotlight branding={branding} /> : <RewardOrb />}
        </div>
      </div>
    </section>
  );
}
