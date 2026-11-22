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

/**
 * Summary of durations (any unit). Median averages the two middle values for
 * an even count; percentiles interpolate linearly between ranks. Empty input
 * gives nulls, never zeros.
 */
export function describeDurations(xs: number[]) {
  const s = xs.filter((x) => Number.isFinite(x) && x >= 0).sort((a, b) => a - b);
  if (!s.length) return { n: 0, mean: null, median: null, p25: null, p75: null, p90: null };
  const q = (p: number) => {
    const pos = p * (s.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  };
  return { n: s.length, mean: s.reduce((a, b) => a + b, 0) / s.length, median: q(0.5), p25: q(0.25), p75: q(0.75), p90: q(0.9) };
}

/** Furthest stage a visit reached; mutually exclusive. */
export type FunnelGroup = "NEVER_REACHED_REWARD" | "REACHED_REWARD_NO_SUCCESSFUL_SUBMISSION" | "SUCCESSFULLY_SUBMITTED";
export const FUNNEL_GROUPS: FunnelGroup[] = ["NEVER_REACHED_REWARD", "REACHED_REWARD_NO_SUCCESSFUL_SUBMISSION", "SUCCESSFULLY_SUBMITTED"];

export function funnelGroupFor(v: { submitted: boolean; reachedReward: boolean }): FunnelGroup {
  if (v.submitted) return "SUCCESSFULLY_SUBMITTED";
  return v.reachedReward ? "REACHED_REWARD_NO_SUCCESSFUL_SUBMISSION" : "NEVER_REACHED_REWARD";
}
