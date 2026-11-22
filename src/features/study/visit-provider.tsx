"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logStudyEvent, resumeVisit, startVisit } from "@/lib/actions/study-public";
import { HEARTBEAT_INTERVAL_MS, routeKeyFor, type PublicRouteKey } from "@/lib/study/constants";
import type { ClientEvent } from "@/lib/study/events-client";

type Kind = "visible" | "heartbeat" | "hidden";

/** Fire-and-forget. A failed telemetry request never blocks navigation or the form. */
function sendActivity(visitId: string, kind: Kind, route: PublicRouteKey | null, beacon = false) {
  const body = JSON.stringify(route ? { visitId, kind, route } : { visitId, kind });
  try {
    if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/study/activity", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/study/activity", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch {
    // ignore
  }
}

const visible = () => typeof document !== "undefined" && document.visibilityState === "visible";

type StartOpts = { refCode: string | null; renderedConfigId: string };
type VisitState = {
  visitId: string | null;
  status: "idle" | "starting" | "ready" | "error";
  error: string | null;
  start: (opts: StartOpts) => void;
  retry: () => void;
  track: (event: ClientEvent) => void;
};

const VisitContext = createContext<VisitState | null>(null);

const START_ERRORS: Record<string, string> = {
  NO_ACTIVE_SESSION: "This page isn't accepting entries right now. Reload the page to check again.",
  RATE_LIMITED: "Too many requests from your network. Wait a moment, then try again.",
};

/**
 * One visit for the whole public site. Mounted in the (stimulus) layout, so
 * researcher/admin pages are never measured, and it survives client-side
 * navigation between the homepage, About, Terms, Support and the confirmation
 * page. Visits START only on the homepage (StudyHome calls `start`); other
 * public pages only resume a live visit.
 *
 * Visible time: a "visible" signal starts the shared credit clock; heartbeats
 * every 15 s while visible, a route change, and tab hide/pagehide each credit
 * the time since the last credit (capped server-side) to the route that was on
 * screen. So the last partial interval is flushed instead of lost, without a
 * write per second. Delivery on abrupt disconnects is best-effort.
 */
export function VisitProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const route = routeKeyFor(pathname);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [status, setStatus] = useState<VisitState["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const lastStart = useRef<StartOpts | null>(null);
  const inFlight = useRef(false);
  // Set when the server says the page shows an outdated configuration.
  const needsReload = useRef(false);
  const reloadTimer = useRef<number | undefined>(undefined);
  // Route whose time is currently being credited (null = untracked page).
  const creditedRoute = useRef<PublicRouteKey | null>(route);
  const loggedRoute = useRef<PublicRouteKey | null>(null);

  const start = useCallback(
    (opts: StartOpts) => {
      if (inFlight.current) return;
      inFlight.current = true;
      lastStart.current = opts;
      needsReload.current = false;
      window.clearTimeout(reloadTimer.current);
      setStatus("starting");
      setError(null);
      startVisit({ ref: opts.refCode, referrer: document.referrer || null, renderedConfigId: opts.renderedConfigId })
        .then((r) => {
          if (!r.ok) {
            setStatus("error");
            setError(START_ERRORS[r.reason] ?? "Something went wrong. Please try again.");
            return;
          }
          if (r.configChanged) {
            // Re-render with the current configuration; the homepage then
            // starts again with the new config id (useStudyVisit). If nothing
            // changes, don't leave the button stuck: offer a reload.
            needsReload.current = true;
            router.refresh();
            reloadTimer.current = window.setTimeout(() => {
              if (!needsReload.current) return;
              setStatus("error");
              setError("This page was updated. Press Try again to reload it.");
            }, 8000);
            return;
          }
          setVisitId(r.visitId);
          setStatus("ready");
          void logStudyEvent(r.visitId, { type: "LANDING_VIEWED" }).catch(() => {});
          if (opts.refCode) {
            // Drop ?ref= from the address bar so shared links don't carry it on.
            const url = new URL(window.location.href);
            url.searchParams.delete("ref");
            window.history.replaceState(null, "", url.toString());
          }
        })
        .catch(() => {
          setStatus("error");
          setError("Couldn't reach the server. Check your connection and try again.");
        })
        .finally(() => {
          inFlight.current = false;
        });
    },
    [router],
  );

  const retry = useCallback(() => {
    if (needsReload.current) {
      window.location.reload();
      return;
    }
    if (lastStart.current) start(lastStart.current);
  }, [start]);

  useEffect(() => () => window.clearTimeout(reloadTimer.current), []);

  // Non-home public pages: continue an existing live visit, never create one.
  useEffect(() => {
    if (visitId || route === null || route === "home") return;
    resumeVisit()
      .then((r) => {
        if (r.ok) {
          setVisitId(r.visitId);
          setStatus("ready");
        }
      })
      .catch(() => {});
  }, [route, visitId]);

  // Heartbeat and visibility, for the lifetime of the visit.
  useEffect(() => {
    if (!visitId) return;
    if (visible() && creditedRoute.current) sendActivity(visitId, "visible", creditedRoute.current);
    const timer = window.setInterval(() => {
      if (visible() && creditedRoute.current) sendActivity(visitId, "heartbeat", creditedRoute.current);
    }, HEARTBEAT_INTERVAL_MS);
    const onVisibility = () => {
      if (visible()) {
        if (creditedRoute.current) sendActivity(visitId, "visible", creditedRoute.current);
      } else {
        sendActivity(visitId, "hidden", creditedRoute.current);
      }
    };
    const onPageHide = () => sendActivity(visitId, "hidden", creditedRoute.current, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [visitId]);

  // Route transitions: flush the partial interval to the page being left, then
  // credit the new page. Runs on pathname changes, not on re-renders.
  useEffect(() => {
    if (!visitId) {
      creditedRoute.current = route;
      return;
    }
    const prev = creditedRoute.current;
    if (prev !== route) {
      if (visible()) {
        if (prev && route) sendActivity(visitId, "heartbeat", prev);
        else if (prev && !route) sendActivity(visitId, "hidden", prev); // untracked page: stop the clock
        else if (!prev && route) sendActivity(visitId, "visible", route);
      }
      creditedRoute.current = route;
    }
    if (route && loggedRoute.current !== route) {
      loggedRoute.current = route;
      void logStudyEvent(visitId, { type: "ROUTE_VIEWED", element: route }).catch(() => {});
    }
  }, [route, visitId]);

  const value = useMemo<VisitState>(
    () => ({
      visitId,
      status,
      error,
      start,
      retry,
      track: (event) => {
        if (visitId) void logStudyEvent(visitId, event).catch(() => {});
      },
    }),
    [visitId, status, error, start, retry],
  );
  return <VisitContext.Provider value={value}>{children}</VisitContext.Provider>;
}

export function useVisit() {
  const ctx = useContext(VisitContext);
  if (!ctx) throw new Error("useVisit must be used inside <VisitProvider>.");
  return ctx;
}
