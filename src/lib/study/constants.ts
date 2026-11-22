// Shared constants for the revised (session-configured) study flow. Plain
// module — safe to import from client components.

/**
 * Approved draw-timing copy (2026-11-22). Keep the meaning unchanged wherever
 * draw timing is described: one draw per campaign, after collection closes.
 * It promises when the DRAW happens, not when prizes are paid.
 */
export const DRAW_TIMING_COPY = "Winners will be selected through a random draw after the campaign's entry collection has closed. The draw will take place within one week of that closure.";

/** A visit ends after this long without any event or heartbeat from the browser. */
export const VISIT_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/** Visible tabs send a heartbeat this often. */
export const HEARTBEAT_INTERVAL_MS = 15 * 1000;

/**
 * Maximum active time credited for one heartbeat gap. Anything longer (tab
 * closed, device asleep, network loss) is not assumed to be active time.
 */
export const ACTIVE_CREDIT_CAP_MS = 20 * 1000;

/** Entries stay open this long after the recorded actual stream end. */
export const ENTRY_WINDOW_AFTER_END_MS = 2 * 60 * 60 * 1000;

/** Admin date/time inputs are entered and displayed in this zone; storage is UTC. */
export const STUDY_TIME_ZONE = "Asia/Dhaka";

export const AGE_GROUP_OPTIONS = [
  { value: "BELOW_18", label: "Below 18" },
  { value: "AGE_18_30", label: "18–30" },
  { value: "AGE_31_PLUS", label: "31+" },
] as const;

export type AgeGroupValue = (typeof AGE_GROUP_OPTIONS)[number]["value"];

export const AGE_GROUP_LABELS: Record<AgeGroupValue, string> = {
  BELOW_18: "Below 18",
  AGE_18_30: "18–30",
  AGE_31_PLUS: "31+",
};

/** Server-side length limits for the public form. */
export const FIELD_LIMITS = {
  name: 80,
  phoneRaw: 32,
  email: 254,
  ign: 40,
  discord: 40,
  facebook: 200,
  idempotencyKey: 64,
} as const;

/** Elements a FIELD_INTERACTED / section event may name — nothing else is accepted. */
// "socialType"/"socialHandle" are legacy (single-social form, before 2026-11-15).
export const TRACKABLE_FIELDS = ["name", "phone", "ageGroup", "email", "ign", "discord", "facebook", "socialType", "socialHandle"] as const;
export type TrackableField = (typeof TRACKABLE_FIELDS)[number];

/**
 * Public pages whose visible time is measured, by route key. Anything not
 * listed (researcher/admin pages, legacy survey/debrief, query strings) is
 * never reported. Keys, not URLs, are what get stored.
 */
export const PUBLIC_ROUTES = {
  home: "/",
  about: "/about",
  terms: "/terms",
  support: "/support",
  confirmation: "/entry/received",
} as const;
export type PublicRouteKey = keyof typeof PUBLIC_ROUTES;
export const PUBLIC_ROUTE_KEYS = Object.keys(PUBLIC_ROUTES) as [PublicRouteKey, ...PublicRouteKey[]];

export function routeKeyFor(pathname: string | null | undefined): PublicRouteKey | null {
  if (!pathname) return null;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  for (const k of PUBLIC_ROUTE_KEYS) if (PUBLIC_ROUTES[k] === path) return k;
  return null;
}

/**
 * Visible-time measurement version stored on each new visit.
 * 1 = homepage only (before 2026-11-22). 2 = every allow-listed public page,
 * split per route, with the last partial interval flushed on navigation/hide.
 */
export const MEASUREMENT_VERSION = 2;

/** Why a submit attempt failed client validation. Codes only, never values. */
export const INVALID_REASON_CODES = [
  "NAME_MISSING",
  "NAME_INVALID",
  "PHONE_MISSING",
  "PHONE_INVALID",
  "AGE_MISSING",
  "EMAIL_INVALID",
  "IGN_INVALID",
  "DISCORD_INVALID",
  "FACEBOOK_INVALID",
] as const;
export type InvalidReasonCode = (typeof INVALID_REASON_CODES)[number];
