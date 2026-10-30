// Pending supervisor/ethics decisions. These are explicit records, not code
// defaults: nothing here chooses a winner count, a retention period or an
// under-18 rule. Pure module — safe for client components.

export type PolicyKey =
  | "COLLECTION_NOTICE"
  | "PARTIAL_DISCLOSURE"
  | "UNDER18_COLLECTION"
  | "UNDER18_CONTACT_AND_REWARD"
  | "RETENTION"
  | "REWARD_PRESENTATION"
  | "WINNER_COUNT"
  | "DRAW_INTERVIEW_ORDER"
  | "UNREACHABLE_HANDLING";

export const POLICY_DEFINITIONS: Record<
  PolicyKey,
  { title: string; description: string; requiredForLiveCollection: boolean; requiredForLiveDraw: boolean }
> = {
  COLLECTION_NOTICE: {
    title: "Initial collection notice and basis",
    description:
      "The notice shown before data collection and the approved basis for recording website events and submissions. Record the approved notice text and version.",
    requiredForLiveCollection: true,
    requiredForLiveDraw: false,
  },
  PARTIAL_DISCLOSURE: {
    title: "Partial disclosure / deception procedure",
    description: "Whether and how any information is withheld from participants, and how it is later explained.",
    requiredForLiveCollection: true,
    requiredForLiveDraw: false,
  },
  UNDER18_COLLECTION: {
    title: "Under-18 collection and handling",
    description:
      "How information from people who select “Below 18” may be collected and handled. Excluding them later does not by itself authorize collection.",
    requiredForLiveCollection: true,
    requiredForLiveDraw: false,
  },
  UNDER18_CONTACT_AND_REWARD: {
    title: "Under-18 contact and reward eligibility",
    description: "Whether under-18 submitters may be contacted and whether they are eligible for the reward draw.",
    requiredForLiveCollection: true,
    requiredForLiveDraw: true,
  },
  RETENTION: {
    title: "Retention periods (including backups)",
    description: "How long contact details, events, interview material, support requests and backups are kept.",
    requiredForLiveCollection: true,
    requiredForLiveDraw: false,
  },
  REWARD_PRESENTATION: {
    title: "Final public reward presentation",
    description:
      "What the reward wheel may display to real visitors (including any displayed prizes that are not awarded). Until approved, the configured wheel is a draft for test sessions only.",
    requiredForLiveCollection: true,
    requiredForLiveDraw: false,
  },
  WINNER_COUNT: {
    title: "Final winner count",
    description: "Number of BDT 100 bKash winners (10 or 20 under discussion). No default is assumed.",
    requiredForLiveCollection: false,
    requiredForLiveDraw: true,
  },
  DRAW_INTERVIEW_ORDER: {
    title: "Order of draw and follow-up interviews",
    description: "Whether the draw happens before or after follow-up interviews.",
    requiredForLiveCollection: false,
    requiredForLiveDraw: false,
  },
  UNREACHABLE_HANDLING: {
    title: "Handling of unreachable participants",
    description:
      "How submissions whose owners cannot be reached are treated. Until decided, unreachable submissions stay out of permission-dependent research exports.",
    requiredForLiveCollection: false,
    requiredForLiveDraw: false,
  },
};

export const POLICY_KEYS = Object.keys(POLICY_DEFINITIONS) as PolicyKey[];

export type PolicyRecord = { key: PolicyKey; status: "PENDING" | "APPROVED"; value: unknown };

/** Keys still blocking LIVE collection (missing rows count as pending). */
export function blockingPoliciesForLive(records: PolicyRecord[]): PolicyKey[] {
  return POLICY_KEYS.filter(
    (k) => POLICY_DEFINITIONS[k].requiredForLiveCollection && records.find((r) => r.key === k)?.status !== "APPROVED",
  );
}

export function blockingPoliciesForLiveDraw(records: PolicyRecord[]): PolicyKey[] {
  return POLICY_KEYS.filter(
    (k) => POLICY_DEFINITIONS[k].requiredForLiveDraw && records.find((r) => r.key === k)?.status !== "APPROVED",
  );
}

/** Approved winner count, or null — never a default. */
export function approvedWinnerCount(records: PolicyRecord[]): number | null {
  const r = records.find((x) => x.key === "WINNER_COUNT");
  if (r?.status !== "APPROVED") return null;
  const n = (r.value as { winnerCount?: unknown } | null)?.winnerCount;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
}

/** Approved under-18 reward eligibility, or null while pending. */
export function approvedUnder18RewardEligible(records: PolicyRecord[]): boolean | null {
  const r = records.find((x) => x.key === "UNDER18_CONTACT_AND_REWARD");
  if (r?.status !== "APPROVED") return null;
  const v = (r.value as { rewardEligible?: unknown } | null)?.rewardEligible;
  return typeof v === "boolean" ? v : null;
}

export type RetentionDays = {
  contactDays: number | null;
  optionalFieldDays: number | null;
  eventDays: number | null;
  supportDays: number | null;
};

export function approvedRetention(records: PolicyRecord[]): RetentionDays | null {
  const r = records.find((x) => x.key === "RETENTION");
  if (r?.status !== "APPROVED") return null;
  const v = (r.value ?? {}) as Record<string, unknown>;
  const num = (x: unknown) => (typeof x === "number" && Number.isInteger(x) && x > 0 ? x : null);
  return {
    contactDays: num(v.contactDays),
    optionalFieldDays: num(v.optionalFieldDays),
    eventDays: num(v.eventDays),
    supportDays: num(v.supportDays),
  };
}

export function approvedNotice(records: PolicyRecord[]): { version: string; text: string } | null {
  const r = records.find((x) => x.key === "COLLECTION_NOTICE");
  if (r?.status !== "APPROVED") return null;
  const v = (r.value ?? {}) as { noticeVersion?: unknown; noticeText?: unknown };
  return typeof v.noticeVersion === "string" && typeof v.noticeText === "string"
    ? { version: v.noticeVersion, text: v.noticeText }
    : null;
}
