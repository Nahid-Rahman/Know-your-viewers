"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logStudyEvent, startVisit } from "@/lib/actions/study-public";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/study/constants";
import type { ClientEvent } from "@/lib/study/events-client";

function sendActivity(visitId: string, kind: "visible" | "heartbeat" | "hidden", beacon = false) {
  const body = JSON.stringify({ visitId, kind });
  if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/study/activity", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/study/activity", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(
    () => {},
  );
}

/**
 * Starts (or resumes) the visit after hydration, then reports visibility and
 * a heartbeat every 15 s while the tab is visible. Hidden tabs send nothing,
 * so background time is not counted as active.
 */
export function useStudyVisit(opts: { refCode: string | null; renderedConfigId: string }) {
  const router = useRouter();
  const [visitId, setVisitId] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void startVisit({ ref: opts.refCode, referrer: document.referrer || null, renderedConfigId: opts.renderedConfigId }).then((r) => {
      if (!r.ok) return;
      if (r.configChanged) {
        router.refresh();
        return;
      }
      setVisitId(r.visitId);
      void logStudyEvent(r.visitId, { type: "LANDING_VIEWED" });
      if (opts.refCode) {
        // Drop ?ref= from the address bar so shared links don't carry it on.
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        window.history.replaceState(null, "", url.toString());
      }
    });
  }, [opts.refCode, opts.renderedConfigId, router]);

  useEffect(() => {
    if (!visitId) return;
    if (document.visibilityState === "visible") sendActivity(visitId, "visible");
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") sendActivity(visitId, "heartbeat");
    }, HEARTBEAT_INTERVAL_MS);
    const onVisibility = () => sendActivity(visitId, document.visibilityState === "visible" ? "visible" : "hidden");
    const onPageHide = () => sendActivity(visitId, "hidden", true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [visitId]);

  return {
    visitId,
    track: (event: ClientEvent) => {
      if (visitId) void logStudyEvent(visitId, event);
    },
  };
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
