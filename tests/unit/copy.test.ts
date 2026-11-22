import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";
import { DEFAULT_HOMEPAGE_CONTENT } from "@/lib/study/sessions";
import { DEFAULT_REWARD_CONFIG } from "@/lib/study/reward";
import { DRAW_TIMING_COPY } from "@/lib/study/constants";

const APPROVED =
  "Winners will be selected through a random draw after the campaign's entry collection has closed. The draw will take place within one week of that closure.";
const CONFLICTING = /after (the|each|this) (session|stream)|stream ends|session ends|within 1 week|reward within/i;

describe("draw-timing copy", () => {
  it("the shared constant is exactly the approved wording", () => {
    expect(DRAW_TIMING_COPY).toBe(APPROVED);
  });

  it("no default public text promises a per-session draw or a payout date", () => {
    const all = JSON.stringify([DEFAULT_SITE_CONTENT, DEFAULT_HOMEPAGE_CONTENT, DEFAULT_REWARD_CONFIG]);
    expect(all).not.toMatch(CONFLICTING);
    expect(all).toContain(APPROVED);
    for (const f of ["src/features/study/study-home.tsx", "src/app/(stimulus)/entry/received/page.tsx", "src/lib/study/public-page.ts"]) {
      expect(readFileSync(path.resolve(__dirname, "../..", f), "utf8")).not.toMatch(CONFLICTING);
    }
  });

  it("leaves the optional-information study wording untouched (pending ethics review)", () => {
    const faq = DEFAULT_HOMEPAGE_CONTENT.faqItems.find((f) => f.q === "Do optional fields improve my chances?");
    expect(faq?.a).toMatch(/can slightly increase your chance of winning/);
    const form = readFileSync(path.resolve(__dirname, "../../src/features/study/entry-form-dialog.tsx"), "utf8");
    expect(form).toContain("Skipping does not affect your entry or your chance in the draw.");
    expect(form).toMatch(/increases your chance of\s+winning the reward/);
  });
});
