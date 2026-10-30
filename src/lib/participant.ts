import "server-only";

/**
 * httpOnly cookie that identified a LEGACY (pre-revision, factorial-condition)
 * participant. New visitors are no longer assigned one — the revised flow
 * uses the opaque visitor cookie in src/lib/study/visits.ts — but existing
 * legacy browsers still use it to reach /debrief and /survey.
 */
export const PARTICIPANT_COOKIE = "ldp_pid";
