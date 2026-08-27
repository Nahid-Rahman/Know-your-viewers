"use client";

import { LayoutDashboard, ListVideo, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";

const NAV_ITEMS: NavItem[] = [
  { href: "/streamer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/streamer/studies", label: "Assigned Studies", icon: ListVideo },
  { href: "/streamer/profile", label: "Profile", icon: UserRound },
];

// Icon components can't cross the Server -> Client boundary as props, so
// this client component owns NAV_ITEMS itself; the server layout only ever
// passes it serializable data (userName).
export function StreamerAppShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  return (
    <AppShell navItems={NAV_ITEMS} roleLabel="Streamer" roleAccent="streamer" userName={userName}>
      {children}
    </AppShell>
  );
}
