"use client";

import { useEffect, useRef } from "react";
import { useVisit } from "./visit-provider";

/**
 * Homepage hook: starts (or resumes) the visit after hydration. Visibility,
 * heartbeats and per-route time are handled by VisitProvider in the public
 * layout, so they continue across About/Terms/Support/confirmation.
 */
export function useStudyVisit(opts: { refCode: string | null; renderedConfigId: string }) {
  const visit = useVisit();
  const { start } = visit;
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start({ refCode: opts.refCode, renderedConfigId: opts.renderedConfigId });
  }, [opts.refCode, opts.renderedConfigId, start]);
  return visit;
}

/**
 * Fires once when at least half of `ref` has been on screen for a full second
 * while the tab is visible — an actual view, not just a page load.
 */
export function useSectionViewed(ref: React.RefObject<HTMLElement | null>, enabled: boolean, onViewed: () => void) {
  const fired = useRef(false);
  const cb = useRef(onViewed);
  useEffect(() => {
    cb.current = onViewed;
  }, [onViewed]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || fired.current) return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === "visible") {
          timer = window.setTimeout(() => {
            if (!fired.current && document.visibilityState === "visible") {
              fired.current = true;
              cb.current();
              observer.disconnect();
            }
          }, 1000);
        } else if (timer) {
          window.clearTimeout(timer);
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [ref, enabled]);
}
