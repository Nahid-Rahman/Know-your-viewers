// Entry-window rules for a stream session. Pure — used by the server for
// enforcement (with server time) and by admin UI for display.

import { ENTRY_WINDOW_AFTER_END_MS } from "./constants";

export type SessionTiming = {
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  sessionType: "NORMAL_BASELINE" | "STUDY";
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  entryDeadlineAt: Date | null;
  entriesClosedAt: Date | null;
};

export type EntryState =
  | { accepting: true; phase: "PRE_STREAM" | "LIVE" | "POST_STREAM"; deadline: Date | null }
  | { accepting: false; reason: "NOT_ACTIVE" | "NOT_STUDY" | "DEADLINE_PASSED" | "CLOSED_MANUALLY"; deadline: Date | null };

export function entryDeadlineFor(actualEndAt: Date | null): Date | null {
  return actualEndAt ? new Date(actualEndAt.getTime() + ENTRY_WINDOW_AFTER_END_MS) : null;
}

export function entryState(s: SessionTiming, now: Date): EntryState {
  const deadline = s.entryDeadlineAt ?? entryDeadlineFor(s.actualEndAt);
  if (s.sessionType !== "STUDY") return { accepting: false, reason: "NOT_STUDY", deadline };
  if (s.status !== "ACTIVE") return { accepting: false, reason: "NOT_ACTIVE", deadline };
  if (s.entriesClosedAt && s.entriesClosedAt <= now) return { accepting: false, reason: "CLOSED_MANUALLY", deadline };
  if (deadline && now >= deadline) return { accepting: false, reason: "DEADLINE_PASSED", deadline };
  return { accepting: true, phase: trafficPhase(s, now), deadline };
}

/**
 * Where an instant falls relative to the recorded stream. UNKNOWN when no
 * actual start was recorded — never guessed from planned times.
 */
export function trafficPhase(
  s: Pick<SessionTiming, "actualStartAt" | "actualEndAt">,
  at: Date,
): "PRE_STREAM" | "LIVE" | "POST_STREAM" {
  if (s.actualEndAt && at >= s.actualEndAt) return "POST_STREAM";
  if (s.actualStartAt && at >= s.actualStartAt) return "LIVE";
  if (s.actualStartAt) return "PRE_STREAM";
  // No recorded start: an active study session is treated as live for the
  // participant-facing phase; analytics label this UNKNOWN instead.
  return "LIVE";
}

export function analyticsPhase(
  s: Pick<SessionTiming, "actualStartAt" | "actualEndAt">,
  at: Date,
): "PRE_STREAM" | "LIVE" | "POST_STREAM" | "UNKNOWN" {
  if (!s.actualStartAt) return s.actualEndAt && at >= s.actualEndAt ? "POST_STREAM" : "UNKNOWN";
  return trafficPhase(s, at);
}
