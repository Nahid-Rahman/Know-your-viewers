"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Zap, LogOut } from "lucide-react";
import { SidebarNav, type NavItem } from "@/components/layout/sidebar-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/common/page-transition";
import { cn } from "@/lib/utils";

export function AppShell({
  navItems,
  roleLabel,
  roleAccent,
  userName,
  children,
}: {
  navItems: NavItem[];
  roleLabel: string;
  roleAccent: "researcher" | "streamer";
  userName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const brand = (
    <Link href="/" prefetch={false} className="flex items-center gap-2 px-3 py-4">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-primary">
        <Zap className="size-4 text-white" fill="currentColor" />
      </span>
      <div>
        <p className="font-display text-sm font-bold leading-none">LiveDrop</p>
        <p
          className={cn(
            "text-[10px] font-semibold tracking-[0.12em] uppercase",
            roleAccent === "researcher" ? "text-role-researcher" : "text-role-streamer",
          )}
        >
          {roleLabel}
        </p>
      </div>
    </Link>
  );

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        {brand}
        <div className="flex-1 overflow-y-auto">
          <SidebarNav items={navItems} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <Link
            href="/"
            prefetch={false}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            Exit to event site
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur-md md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu />
                </Button>
              }
            />
            <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
              {brand}
              <SidebarNav items={navItems} />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                roleAccent === "researcher"
                  ? "bg-role-researcher/15 text-role-researcher"
                  : "bg-role-streamer/15 text-role-streamer",
              )}
            >
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden font-medium sm:inline">{userName}</span>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 md:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
