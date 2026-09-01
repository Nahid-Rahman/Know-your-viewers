"use client";

import { usePathname } from "next/navigation";

/** Fades each new page in on navigation instead of an instant, jarring swap. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out">
      {children}
    </div>
  );
}
