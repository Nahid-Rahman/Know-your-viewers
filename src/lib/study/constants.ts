// Shared constants for the revised (session-configured) study flow. Plain
// module — safe to import from client components.

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
  phoneRaw: 32,
  email: 254,
  ign: 40,
  discord: 40,
  facebook: 200,
  idempotencyKey: 64,
} as const;

/** Elements a FIELD_INTERACTED / section event may name — nothing else is accepted. */
export const TRACKABLE_FIELDS = ["phone", "ageGroup", "email", "ign", "socialType", "socialHandle"] as const;
export type TrackableField = (typeof TRACKABLE_FIELDS)[number];
