import { describe, expect, it } from "vitest";
import { evaluateResearchEligibility, summarizeEligibility, matchesResearchFilter, type EligibilityInput } from "@/lib/study/eligibility";

const t0 = new Date("2026-11-01T00:00:00Z");
const t1 = new Date("2026-11-02T00:00:00Z");
const granted = [{ type: "WEBSITE_DATA_USE" as const, status: "GRANTED" as const, recordedAt: t0 }];

const base = (over: Partial<EligibilityInput> = {}): EligibilityInput => ({
  status: "CANONICAL",
  isTest: false,
  ageGroup: "AGE_18_30",
  researchExcluded: false,
  researchDataPurgedAt: null,
  permissions: granted,
  spinOutcomeId: "spin",
  ...over,
});

describe("research eligibility evaluator", () => {
  it("adult canonical live entry with permission granted is eligible", () => {
    expect(evaluateResearchEligibility(base())).toMatchObject({ status: "ELIGIBLE", reasons: [], reviewFlags: [] });
    expect(evaluateResearchEligibility(base({ ageGroup: "AGE_31_PLUS" })).status).toBe("ELIGIBLE");
  });

  it("pending (never recorded) permission is PENDING, never treated as granted", () => {
    const e = evaluateResearchEligibility(base({ permissions: [] }));
    expect(e.status).toBe("PENDING");
    expect(e.reasons).toEqual(["PERMISSION_PENDING"]);
  });

  it("declined or withdrawn permission is not eligible; latest record wins", () => {
    expect(evaluateResearchEligibility(base({ permissions: [{ type: "WEBSITE_DATA_USE", status: "DECLINED", recordedAt: t0 }] })).reasons).toEqual([
      "PERMISSION_DECLINED_OR_WITHDRAWN",
    ]);
    const withdrawn = evaluateResearchEligibility(
      base({ permissions: [...granted, { type: "WEBSITE_DATA_USE", status: "WITHDRAWN", recordedAt: t1 }] }),
    );
    expect(withdrawn.status).toBe("NOT_ELIGIBLE");
    // Another permission type never stands in for website-data use.
    expect(evaluateResearchEligibility(base({ permissions: [{ type: "INTERVIEW_PROCEED", status: "GRANTED", recordedAt: t0 }] })).status).toBe("PENDING");
  });

  it("collects every applicable reason", () => {
    const e = evaluateResearchEligibility(
      base({ ageGroup: "BELOW_18", status: "DUPLICATE", isTest: true, researchExcluded: true, researchDataPurgedAt: t0, permissions: [] }),
    );
    expect(e.status).toBe("NOT_ELIGIBLE");
    expect(e.reasons).toEqual(["UNDER_18", "DUPLICATE", "TEST_CAMPAIGN", "PERMISSION_PENDING", "RESEARCH_DATA_PURGED", "MANUALLY_EXCLUDED"]);
    expect(e.manual).toBe(true);
  });

  it("under-18 with permission granted is still not eligible (hard rule)", () => {
    expect(evaluateResearchEligibility(base({ ageGroup: "BELOW_18" })).status).toBe("NOT_ELIGIBLE");
  });

  it("review flags never change the status, and missing optional fields are not a flag", () => {
    const e = evaluateResearchEligibility(base({ spinOutcomeId: null, sameBrowserOtherPhones: 2 }));
    expect(e.status).toBe("ELIGIBLE");
    expect(e.reviewFlags).toEqual(["NO_SPIN_RECORDED", "SAME_BROWSER_OTHER_PHONES"]);
    // spinOutcomeId not loaded (undefined) is not the same as "no spin".
    expect(evaluateResearchEligibility(base({ spinOutcomeId: undefined })).reviewFlags).toEqual([]);
  });

  it("summary counts unique excluded records once while reason counts overlap", () => {
    const rows = [
      base(),
      base({ permissions: [] }),
      base({ ageGroup: "BELOW_18", status: "DUPLICATE" }),
      base({ ageGroup: "BELOW_18", isTest: true, researchExcluded: true }),
    ].map(evaluateResearchEligibility);
    const s = summarizeEligibility(rows);
    expect(s).toMatchObject({ total: 4, eligible: 1, pending: 1, notEligible: 2, excludedUnique: 3 });
    expect(s.byReason.UNDER_18).toBe(2);
    expect(s.byReason.DUPLICATE).toBe(1);
    const reasonSum = Object.values(s.byReason).reduce((a, b) => a + b, 0);
    expect(reasonSum).toBeGreaterThan(s.excludedUnique);
  });

  it("filters map to the right records", () => {
    const manual = evaluateResearchEligibility(base({ researchExcluded: true }));
    expect(matchesResearchFilter(manual, "manual")).toBe(true);
    expect(matchesResearchFilter(manual, "not_eligible")).toBe(true);
    expect(matchesResearchFilter(manual, "research_eligible")).toBe(false);
    expect(matchesResearchFilter(evaluateResearchEligibility(base({ permissions: [] })), "pending")).toBe(true);
  });
});
