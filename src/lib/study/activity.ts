// Active-time estimation. Pure reference implementation of the rule the
// database applies atomically in recordHeartbeat (src/lib/study/visits.ts):
//
// - Only heartbeats from a *visible* tab credit time.
// - Each credit is the time since the previous credit for the whole visit
//   (not per tab), capped at ACTIVE_CREDIT_CAP_MS — so two visible tabs never
//   double-count the same wall-clock seconds, and gaps (closed tab, sleep,
//   lost network) are not assumed active.
// - A tab becoming visible restarts the credit clock without crediting.
// - Hidden events credit up to that moment, then stop the clock.
//
// The result is an estimate of visible time, not verified attention.

import { ACTIVE_CREDIT_CAP_MS } from "./constants";

export type ActivitySignal = { at: number; kind: "visible" | "heartbeat" | "hidden" };

export function estimateActiveMs(signals: ActivitySignal[], cap = ACTIVE_CREDIT_CAP_MS): number {
  let active = 0;
  let creditAt: number | null = null;
  for (const s of [...signals].sort((a, b) => a.at - b.at)) {
    if (s.kind === "visible") {
      if (creditAt === null) creditAt = s.at;
      continue;
    }
    if (creditAt !== null) active += Math.min(Math.max(s.at - creditAt, 0), cap);
    creditAt = s.kind === "hidden" ? null : s.at;
  }
  return active;
}
