"use client";

import { LayoutDashboard, FlaskConical, Users, FileBarChart, Settings } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";

const NAV_ITEMS: NavItem[] = [
  { href: "/researcher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/researcher/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/researcher/streamers", label: "Streamers", icon: Users },
  { href: "/researcher/reports", label: "Reports", icon: FileBarChart },
  { href: "/researcher/settings", label: "Settings", icon: Settings },
];

export default function ResearcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navItems={NAV_ITEMS} roleLabel="Researcher" roleAccent="researcher" userName="M. Rahman">
      {children}
    </AppShell>
  );
}
