"use client";

import { LayoutDashboard, FlaskConical, Users, UserSearch, PhoneCall, DatabaseZap, Settings, ClipboardList, ScrollText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";

const NAV_ITEMS: NavItem[] = [
  { href: "/researcher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/researcher/experiments", label: "Campaigns", icon: FlaskConical },
  { href: "/researcher/submissions", label: "Submissions", icon: ClipboardList },
  { href: "/researcher/streamers", label: "Streamers", icon: Users },
  { href: "/researcher/research-dataset", label: "Research Dataset", icon: DatabaseZap },
  { href: "/researcher/participants", label: "Legacy Participants", icon: UserSearch },
  { href: "/researcher/outreach", label: "Legacy Outreach", icon: PhoneCall },
  { href: "/researcher/audit", label: "Audit Log", icon: ScrollText },
  { href: "/researcher/settings", label: "Settings", icon: Settings },
];

// Icon components can't cross the Server -> Client boundary as props, so
// this client component owns NAV_ITEMS itself; the server layout only ever
// passes it serializable data (userName).
export function ResearcherAppShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  return (
    <AppShell navItems={NAV_ITEMS} roleLabel="Researcher" roleAccent="researcher" userName={userName}>
      {children}
    </AppShell>
  );
}
