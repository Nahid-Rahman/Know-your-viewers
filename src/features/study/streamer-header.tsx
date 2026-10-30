/* eslint-disable @next/next/no-img-element -- researcher-approved image URLs are arbitrary https hosts */
export type StudyBranding = {
  streamerDisplayName: string;
  streamerImageUrl: string | null;
  welcomeText: string;
  channelUrl: string | null;
  platform: string | null;
};

export function StreamerHeader({ branding, deadlineText }: { branding: StudyBranding; deadlineText: string | null }) {
  const initials = branding.streamerDisplayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-10 sm:px-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/60 p-5 text-center sm:flex-row sm:text-left">
        {branding.streamerImageUrl ? (
          <img
            src={branding.streamerImageUrl}
            alt={branding.streamerDisplayName}
            className="size-20 shrink-0 rounded-full border-2 border-primary/50 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/15 font-display text-2xl font-bold text-primary">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            {branding.platform ? `${branding.platform} stream` : "Live stream"}
          </p>
          <p className="font-display text-2xl font-bold break-words">{branding.streamerDisplayName}</p>
          <p className="mt-1 text-sm text-muted-foreground">{branding.welcomeText}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs sm:justify-start">
            {branding.channelUrl && (
              <a href={branding.channelUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2">
                Visit channel
              </a>
            )}
            {deadlineText && <span className="text-muted-foreground">{deadlineText}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
