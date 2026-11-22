import { describe, expect, it } from "vitest";
import { describeDurations, funnelGroupFor } from "@/lib/study/activity";
import { routeKeyFor } from "@/lib/study/constants";
import { entryFormSchema, invalidReasonCodes } from "@/lib/study/submission-schema";
import { clientEventSchema } from "@/lib/study/events";

describe("duration summary", () => {
  it("median averages the two middle values for an even count", () => {
    expect(describeDurations([1, 2, 3, 4]).median).toBe(2.5);
    expect(describeDurations([5, 1, 3]).median).toBe(3);
    expect(describeDurations([10]).median).toBe(10);
  });
  it("interpolates percentiles and ignores invalid values; empty gives nulls, not zeros", () => {
    const d = describeDurations([0, 10, 20, 30, 40, Number.NaN, -5]);
    expect(d).toMatchObject({ n: 5, mean: 20, median: 20, p25: 10, p75: 30, p90: 36 });
    expect(describeDurations([])).toEqual({ n: 0, mean: null, median: null, p25: null, p75: null, p90: null });
  });
});

describe("funnel groups", () => {
  it("are mutually exclusive by furthest stage", () => {
    expect(funnelGroupFor({ submitted: false, reachedReward: false })).toBe("NEVER_REACHED_REWARD");
    expect(funnelGroupFor({ submitted: false, reachedReward: true })).toBe("REACHED_REWARD_NO_SUCCESSFUL_SUBMISSION");
    expect(funnelGroupFor({ submitted: true, reachedReward: true })).toBe("SUCCESSFULLY_SUBMITTED");
    // A saved entry wins even if the reward-section view wasn't recorded.
    expect(funnelGroupFor({ submitted: true, reachedReward: false })).toBe("SUCCESSFULLY_SUBMITTED");
  });
});

describe("route allow-list", () => {
  it("maps only public pages to keys, never admin routes or query strings", () => {
    expect(routeKeyFor("/")).toBe("home");
    expect(routeKeyFor("/about")).toBe("about");
    expect(routeKeyFor("/terms/")).toBe("terms");
    expect(routeKeyFor("/entry/received")).toBe("confirmation");
    expect(routeKeyFor("/researcher/submissions")).toBeNull();
    expect(routeKeyFor("/debrief")).toBeNull();
    expect(routeKeyFor("/entry/received?s=abc")).toBeNull();
  });
});

describe("invalid submit attempts", () => {
  const codesFor = (values: Record<string, unknown>) => {
    const r = entryFormSchema.safeParse(values);
    const fields = r.success ? [] : [...new Set(r.error.issues.map((i) => String(i.path[0])))];
    return invalidReasonCodes(fields, values);
  };
  const ok = { name: "Nahid", phone: "01712345678", ageGroup: "AGE_18_30", email: "", ign: "", discord: "", facebook: "" };

  it("gives bounded codes for each kind of failure", () => {
    expect(codesFor({ ...ok, name: "", phone: "", ageGroup: undefined })).toEqual(["AGE_MISSING", "NAME_MISSING", "PHONE_MISSING"]);
    expect(codesFor({ ...ok, name: "" })).toEqual(["NAME_MISSING"]);
    expect(codesFor({ ...ok, phone: "12345" })).toEqual(["PHONE_INVALID"]);
    expect(codesFor({ ...ok, email: "not-an-email" })).toEqual(["EMAIL_INVALID"]);
    expect(codesFor({ ...ok, discord: "a" })).toEqual(["DISCORD_INVALID"]);
    expect(codesFor(ok)).toEqual([]);
  });

  it("the event schema accepts only known codes and drops anything else", () => {
    const parsed = clientEventSchema.safeParse({ type: "SUBMISSION_VALIDATION_FAILED", reasons: ["PHONE_INVALID"], phone: "01712345678" });
    expect(parsed.success).toBe(true);
    expect(JSON.stringify(parsed.data)).not.toContain("01712345678");
    expect(clientEventSchema.safeParse({ type: "SUBMISSION_VALIDATION_FAILED", reasons: ["01712345678"] }).success).toBe(false);
    expect(clientEventSchema.safeParse({ type: "ROUTE_VIEWED", element: "/researcher" }).success).toBe(false);
    expect(clientEventSchema.safeParse({ type: "ROUTE_VIEWED", element: "terms" }).success).toBe(true);
  });
});
