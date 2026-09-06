"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { logEngagementEvent } from "@/lib/actions/participant";

/**
 * `hero-section.tsx` and `site-navbar.tsx` (the two CTA call sites) are
 * Server Components — a `logEngagementEvent` closure can't be passed as an
 * `onClick` prop to `Link` from there. This tiny Client Component wraps
 * `Link` and fires the event itself instead.
 */
export function CtaLink({
  element,
  ...props
}: ComponentProps<typeof Link> & { element: string }) {
  return (
    <Link
      {...props}
      onClick={() => void logEngagementEvent("CTA_CLICKED", { page: "landing", element })}
    />
  );
}
