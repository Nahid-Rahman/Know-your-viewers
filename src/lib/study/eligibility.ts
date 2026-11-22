// Research-data eligibility, in ONE place. Consumed by the submissions list,
// the submission detail page, the research export and the aggregate stats, so
// they can never disagree. Pure module (no database access) — safe to import
// anywhere and unit-tested directly.
//
// Research eligibility is NOT reward eligibility. Reward selection has its own
// rule in draw.ts (canonical, same TEST/LIVE mode, not draw-excluded, not
// under-18); declining research-data use never touches it.

import { currentPermissions, type PermissionStatusValue, type PermissionTypeValue } from "./permissions";

export const ELIGIBILITY_REASONS = {
  UNDER_18: "Self-reported under 18 (aggregate counts only)",
  DUPLICATE: "Duplicate of an earlier entry with the same phone in this campaign",
  TEST_CAMPAIGN: "TEST collection (synthetic data)",
  PERMISSION_PENDING: "Website-data permission not yet recorded",
  PERMISSION_DECLINED_OR_WITHDRAWN: "Website-data permission declined or withdrawn",
  RESEARCH_DATA_PURGED: "Research data removed after a decline/withdrawal",
  MANUALLY_EXCLUDED: "Manually excluded by a researcher",
} as const;
export type EligibilityReason = keyof typeof ELIGIBILITY_REASONS;
export const REASON_ORDER = Object.keys(ELIGIBILITY_REASONS) as EligibilityReason[];

/**
 * Flags that ask a researcher to look — never an automatic exclusion. Missing
 * optional fields are never a flag.
 */
export const REVIEW_FLAGS = {
  NO_SPIN_RECORDED: "Entry saved without a stored wheel spin for its visit",
  SAME_BROWSER_OTHER_PHONES: "The same browser also made entries with a different phone in this campaign (not proof of one person)",
} as const;
export type ReviewFlag = keyof typeof REVIEW_FLAGS;

/** ELIGIBLE: usable in detailed research analysis. PENDING: only the permission is missing. */
export type ResearchStatus = "ELIGIBLE" | "PENDING" | "NOT_ELIGIBLE";

export type EligibilityInput = {
  status: "CANONICAL" | "DUPLICATE";
  isTest: boolean;
  ageGroup: "BELOW_18" | "AGE_18_30" | "AGE_31_PLUS";
  researchExcluded: boolean;
  researchDataPurgedAt: Date | null;
  permissions: { type: PermissionTypeValue; status: PermissionStatusValue; recordedAt: Date }[];
  spinOutcomeId?: string | null;
  /** Other canonical entries from the same browser with a different phone (optional, list/detail only). */
  sameBrowserOtherPhones?: number;
};

export type Eligibility = {
  status: ResearchStatus;
  /** Every reason that applies — an entry can have several. */
  reasons: EligibilityReason[];
  manual: boolean;
  reviewFlags: ReviewFlag[];
  websiteDataUse: PermissionStatusValue;
};

export function evaluateResearchEligibility(s: EligibilityInput): Eligibility {
  const perm = currentPermissions(s.permissions).WEBSITE_DATA_USE;
  const reasons: EligibilityReason[] = [];
  if (s.ageGroup === "BELOW_18") reasons.push("UNDER_18");
  if (s.status !== "CANONICAL") reasons.push("DUPLICATE");
  if (s.isTest) reasons.push("TEST_CAMPAIGN");
  // Pending or unknown is never treated as granted.
  if (perm === "PENDING") reasons.push("PERMISSION_PENDING");
  if (perm === "DECLINED" || perm === "WITHDRAWN") reasons.push("PERMISSION_DECLINED_OR_WITHDRAWN");
  if (s.researchDataPurgedAt) reasons.push("RESEARCH_DATA_PURGED");
  if (s.researchExcluded) reasons.push("MANUALLY_EXCLUDED");

  const reviewFlags: ReviewFlag[] = [];
  if (s.spinOutcomeId === null) reviewFlags.push("NO_SPIN_RECORDED");
  if ((s.sameBrowserOtherPhones ?? 0) > 0) reviewFlags.push("SAME_BROWSER_OTHER_PHONES");

  const status: ResearchStatus =
    reasons.length === 0 ? "ELIGIBLE" : reasons.every((r) => r === "PERMISSION_PENDING") ? "PENDING" : "NOT_ELIGIBLE";
  return { status, reasons, manual: s.researchExcluded, reviewFlags, websiteDataUse: perm };
}

/**
 * Aggregate breakdown. `excludedUnique` counts records (each once, however
 * many reasons it has); `byReason` counts reasons, so its sum can exceed
 * `excludedUnique`. Denominator for everything: `total` saved submissions.
 */
export function summarizeEligibility(rows: Eligibility[]) {
  const byReason = Object.fromEntries(REASON_ORDER.map((r) => [r, 0])) as Record<EligibilityReason, number>;
  let eligible = 0;
  let pending = 0;
  let notEligible = 0;
  let needsReview = 0;
  for (const e of rows) {
    if (e.status === "ELIGIBLE") eligible++;
    else if (e.status === "PENDING") pending++;
    else notEligible++;
    if (e.reviewFlags.length) needsReview++;
    for (const r of e.reasons) byReason[r]++;
  }
  return {
    total: rows.length,
    eligible,
    pending,
    notEligible,
    // Unique records not currently research-eligible (pending + not eligible).
    excludedUnique: pending + notEligible,
    byReason,
    needsReview,
  };
}

export const RESEARCH_STATUS_FILTERS = ["research_eligible", "pending", "not_eligible", "manual", "needs_review"] as const;
export type ResearchStatusFilter = (typeof RESEARCH_STATUS_FILTERS)[number];

export function matchesResearchFilter(e: Eligibility, f: ResearchStatusFilter) {
  switch (f) {
    case "research_eligible":
      return e.status === "ELIGIBLE";
    case "pending":
      return e.status === "PENDING";
    case "not_eligible":
      return e.status === "NOT_ELIGIBLE";
    case "manual":
      return e.manual;
    case "needs_review":
      return e.reviewFlags.length > 0;
  }
}
