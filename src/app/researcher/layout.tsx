import { requireRoleOrRedirect } from "@/lib/auth";
import { ResearcherAppShell } from "@/features/researcher/researcher-app-shell";

export default async function ResearcherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoleOrRedirect("RESEARCHER");

  return <ResearcherAppShell userName={user.name}>{children}</ResearcherAppShell>;
}
