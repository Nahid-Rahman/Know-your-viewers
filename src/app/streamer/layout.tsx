"use client";

import { LayoutDashboard, ListVideo, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";

const NAV_ITEMS: NavItem[] = [
  { href: "/streamer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/streamer/studies", label: "Assigned Studies", icon: ListVideo },
  { href: "/streamer/profile", label: "Profile", icon: UserRound },
];

export default function StreamerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navItems={NAV_ITEMS} roleLabel="Streamer" roleAccent="streamer" userName="RafiqPlaysBD">
      {children}
    </AppShell>
  );
}
