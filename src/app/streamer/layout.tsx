import { requireRoleOrRedirect } from "@/lib/auth";
import { getStreamerByUserId } from "@/lib/queries/research";
import { StreamerAppShell } from "@/features/streamer/streamer-app-shell";

export default async function StreamerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoleOrRedirect("STREAMER");
  const streamer = await getStreamerByUserId(user.id);

  return <StreamerAppShell userName={streamer?.displayName ?? user.name}>{children}</StreamerAppShell>;
}
