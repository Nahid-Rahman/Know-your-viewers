"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Revised study flow first; the factorial-condition tabs remain for legacy records.
const TABS = [
  { slug: "", label: "Overview" },
  { slug: "streams", label: "Sessions" },
  { slug: "policy", label: "Decisions & Access" },
  { slug: "draw", label: "Draw & Payouts" },
  { slug: "comparison", label: "A/B Comparison" },
  { slug: "links", label: "Tracking Links" },
  { slug: "participants", label: "Legacy Participants" },
  { slug: "conditions", label: "Legacy Conditions" },
  { slug: "surveys", label: "Legacy Surveys" },
  { slug: "analytics", label: "Legacy Analytics" },
];

export function ExperimentTabs({ experimentId }: { experimentId: string }) {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const href = `/researcher/experiments/${experimentId}${tab.slug ? `/${tab.slug}` : ""}`;
        const active = tab.slug ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
        return (
          <Link
            key={tab.slug}
            href={href}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
