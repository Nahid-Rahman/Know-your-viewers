/* eslint-disable @next/next/no-img-element -- researcher-approved image URLs are arbitrary https hosts */
import { RichHeadline } from "@/components/common/rich-headline";
import { RewardOrb } from "@/components/common/reward-orb";
import { CountdownChip } from "@/components/common/countdown-chip";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudyBranding } from "./streamer-header";

/**
 * The original two-column hero (headline + reward orb), with the streamer's
 * branding where the old "OFFICIAL" eyebrow was, and a countdown only to the
 * real entry deadline (never a simulated one).
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
  const initials = branding?.streamerDisplayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
        <div>
          {branding && (
            <div className="mb-6 flex items-center gap-3">
              {branding.streamerImageUrl ? (
                <img
                  src={branding.streamerImageUrl}
                  alt={branding.streamerDisplayName}
                  className="size-12 shrink-0 rounded-full border-2 border-primary/50 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/15 font-display font-bold text-primary">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                  {branding.platform ? `${branding.platform} stream` : "Live stream"}
                </p>
                <p className="font-display text-lg font-bold break-words">
                  {branding.streamerDisplayName}
                  {branding.channelUrl && (
                    <a
                      href={branding.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="ml-2 text-xs font-medium text-primary underline underline-offset-2"
                    >
                      Visit channel
                    </a>
                  )}
                </p>
              </div>
            </div>
          )}

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
            🔒 No password needed &nbsp; 📱 Mobile friendly &nbsp; 🎓 University research study
          </p>
        </div>

        <div className="relative flex justify-center md:justify-end">
          <RewardOrb />
        </div>
      </div>
    </section>
  );
}
