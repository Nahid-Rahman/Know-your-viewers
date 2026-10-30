import { loadPublicPage } from "@/lib/study/public-page";
import { StudyHome } from "@/features/study/study-home";

// Always rendered per request: which session is active, and whether its
// entry window is still open, is decided with server time.
export const dynamic = "force-dynamic";

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const ref = typeof params.ref === "string" ? params.ref.slice(0, 64) : null;
  const page = await loadPublicPage();

  if (page.kind === "none") {
    return (
      <StatusPanel
        title="No stream is running right now"
        body="This page is only open during a collaborating streamer's session and for two hours after it ends. Please check back during the next stream."
      />
    );
  }
  if (page.kind === "closed") {
    return (
      <StatusPanel
        title={`Entries for ${page.streamerName}'s session are closed`}
        body={`${page.deadlineText ? `${page.deadlineText}. ` : ""}Thanks for watching — winners of the prize draw will be contacted by phone after the draw.`}
      />
    );
  }
  return <StudyHome {...page.props} refCode={ref} />;
}

function StatusPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-24 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full border border-border bg-card text-2xl" aria-hidden>
        ⏸
      </div>
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
