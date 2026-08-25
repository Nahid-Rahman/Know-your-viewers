import { LayoutDashboard, ListVideo, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";
import { requireRoleOrRedirect } from "@/lib/auth";
import { getStreamerByUserId } from "@/lib/queries/research";

const NAV_ITEMS: NavItem[] = [
  { href: "/streamer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/streamer/studies", label: "Assigned Studies", icon: ListVideo },
  { href: "/streamer/profile", label: "Profile", icon: UserRound },
];

export default async function StreamerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoleOrRedirect("STREAMER");
  const streamer = await getStreamerByUserId(user.id);

  return (
    <AppShell
      navItems={NAV_ITEMS}
      roleLabel="Streamer"
      roleAccent="streamer"
      userName={streamer?.displayName ?? user.name}
    >
      {children}
    </AppShell>
  );
}
