"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Fades each new page in on navigation instead of an instant, jarring swap. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // The site's global `scroll-behavior: smooth` (for in-page anchor jumps
    // like the "FAQ"/"Spin & Win" nav links) also intercepts the browser's
    // scroll-to-top on a real route change, turning it into a slow animated
    // scroll instead of an instant reset — so a new page can render still
    // partway down the previous page's scroll position. Force an instant
    // reset here, but only when the new URL has no hash: a hash means this
    // navigation is itself an intentional anchor jump (e.g. clicking "FAQ"
    // from another page), which should still scroll smoothly to that section.
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div key={pathname} className="animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out">
      {children}
    </div>
  );
}
