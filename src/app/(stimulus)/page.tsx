import { loadPublicPage } from "@/lib/study/public-page";
import { StudyHome } from "@/features/study/study-home";
import { IdleHome } from "@/features/study/idle-home";

// Always rendered per request: which session is active, and whether its
// entry window is still open, is decided with server time.
export const dynamic = "force-dynamic";

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const ref = typeof params.ref === "string" ? params.ref.slice(0, 64) : null;
  const page = await loadPublicPage();
  if (page.kind === "idle") return <IdleHome {...page.props} />;
  return <StudyHome {...page.props} refCode={ref} />;
}
