import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/study/phone";
import { parseStudyLocal, toStudyLocalInput } from "@/lib/study/time";
import { estimateActiveMs } from "@/lib/study/activity";
import { entryState, entryDeadlineFor } from "@/lib/study/session-state";
import { escapeCsvValue } from "@/lib/csv";
import { selectSpinResult, DEFAULT_REWARD_CONFIG, rewardConfigSchema } from "@/lib/study/reward";
import { selectWithoutReplacement } from "@/lib/study/draw";
import { entryFormSchema } from "@/lib/study/submission-schema";
import { approvedWinnerCount, blockingPoliciesForLive } from "@/lib/study/policy";
import { currentPermissions } from "@/lib/study/submission-admin";

describe("phone normalization", () => {
  it("treats Bangladesh local and international forms as the same number", () => {
    const forms = ["01712345678", "+8801712345678", "8801712345678", "008801712345678", "017 1234-5678", "+880 1712-345678"];
    for (const f of forms) expect(normalizePhone(f)).toEqual({ ok: true, e164: "+8801712345678" });
  });
  it("rejects malformed numbers", () => {
    expect(normalizePhone("0171234").ok).toBe(false);
    expect(normalizePhone("01212345678").ok).toBe(false);
    expect(normalizePhone("abc").ok).toBe(false);
    expect(normalizePhone("+88012345").ok).toBe(false);
  });
  it("keeps other international numbers as +digits", () => {
    expect(normalizePhone("+44 7700 900123")).toEqual({ ok: true, e164: "+447700900123" });
  });
});

describe("Asia/Dhaka date handling", () => {
  it("interprets datetime-local input as Dhaka time regardless of server zone", () => {
    const d = parseStudyLocal("2026-11-02T20:30")!;
    expect(d.toISOString()).toBe("2026-11-02T14:30:00.000Z");
    expect(toStudyLocalInput(d)).toBe("2026-11-02T20:30");
  });
  it("round-trips across midnight", () => {
    const d = parseStudyLocal("2026-11-03T02:15")!;
    expect(d.toISOString()).toBe("2026-11-02T20:15:00.000Z");
    expect(toStudyLocalInput(d)).toBe("2026-11-03T02:15");
  });
  it("rejects malformed input", () => {
    expect(() => parseStudyLocal("02/11/2026 20:30")).toThrow();
  });
});

describe("entry window", () => {
  const base = {
    status: "ACTIVE" as const,
    sessionType: "STUDY" as const,
    actualStartAt: new Date("2026-11-02T14:00:00Z"),
    actualEndAt: null as Date | null,
    entryDeadlineAt: null as Date | null,
    entriesClosedAt: null as Date | null,
  };
  it("has no deadline until an actual end is recorded", () => {
    const s = entryState(base, new Date("2026-11-05T00:00:00Z"));
    expect(s.accepting).toBe(true);
    expect(s.deadline).toBeNull();
  });
  it("closes exactly two hours after the actual end", () => {
    const end = new Date("2026-11-02T16:00:00Z");
    const s = { ...base, actualEndAt: end, entryDeadlineAt: entryDeadlineFor(end) };
    expect(entryState(s, new Date("2026-11-02T17:59:59Z")).accepting).toBe(true);
    expect(entryState(s, new Date("2026-11-02T18:00:00Z"))).toMatchObject({ accepting: false, reason: "DEADLINE_PASSED" });
  });
  it("manual close and non-active status stop entries", () => {
    expect(entryState({ ...base, entriesClosedAt: new Date("2026-11-02T15:00:00Z") }, new Date("2026-11-02T15:01:00Z")).accepting).toBe(false);
    expect(entryState({ ...base, status: "CLOSED" }, new Date()).accepting).toBe(false);
    expect(entryState({ ...base, sessionType: "NORMAL_BASELINE" }, new Date()).accepting).toBe(false);
  });
});

describe("active time estimate", () => {
  it("does not add overlapping time from two visible tabs", () => {
    const t0 = 1_000_000;
    // Two tabs both visible, heartbeats interleaved every 7.5 s for 60 s.
    const signals = [
      { at: t0, kind: "visible" as const },
      { at: t0 + 100, kind: "visible" as const },
      ...Array.from({ length: 8 }, (_, i) => ({ at: t0 + (i + 1) * 7500, kind: "heartbeat" as const })),
    ];
    expect(estimateActiveMs(signals)).toBe(60000);
  });
  it("does not invent time after a missing final heartbeat", () => {
    const t0 = 0;
    const signals = [
      { at: t0, kind: "visible" as const },
      { at: 15000, kind: "heartbeat" as const },
      { at: 30000, kind: "heartbeat" as const },
      // tab closed abruptly; next signal 10 minutes later from a new load
      { at: 630000, kind: "heartbeat" as const },
    ];
    expect(estimateActiveMs(signals)).toBe(30000 + 20000);
  });
  it("hidden time is not counted", () => {
    const signals = [
      { at: 0, kind: "visible" as const },
      { at: 10000, kind: "hidden" as const },
      { at: 300000, kind: "visible" as const },
      { at: 315000, kind: "heartbeat" as const },
    ];
    expect(estimateActiveMs(signals)).toBe(25000);
  });
});

describe("CSV export safety", () => {
  it("neutralizes formula-looking cells", () => {
    expect(escapeCsvValue("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsvValue("+8801712345678")).toBe("'+8801712345678");
    expect(escapeCsvValue("@cmd")).toBe("'@cmd");
    expect(escapeCsvValue(-5)).toBe("-5");
    expect(escapeCsvValue("plain")).toBe("plain");
  });
});

describe("reward selection", () => {
  it("a FIXED mechanism always returns the configured item and says so", () => {
    for (let i = 0; i < 20; i++) {
      const r = selectSpinResult(DEFAULT_REWARD_CONFIG, () => i);
      expect(r).toMatchObject({ mechanism: "FIXED", item: { key: "prize_draw_entry" } });
    }
  });
  it("weighted selection respects weights", () => {
    const cfg = rewardConfigSchema.parse({
      mechanism: "WEIGHTED_RANDOM",
      displayItems: [
        { key: "a", label: "A", weight: 1 },
        { key: "b", label: "B", weight: 0 },
        { key: "c", label: "C", weight: 3 },
      ],
      resultHeadline: "x",
      resultExplanation: "y",
    });
    expect(selectSpinResult(cfg, () => 0).item.key).toBe("a");
    expect(selectSpinResult(cfg, () => 1).item.key).toBe("c");
    expect(selectSpinResult(cfg, () => 3).item.key).toBe("c");
  });
});

describe("draw selection", () => {
  it("selects without replacement", () => {
    let seed = 7;
    const rnd = (max: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % max;
    const picked = selectWithoutReplacement(50, 20, rnd);
    expect(new Set(picked).size).toBe(20);
    expect(picked.every((i) => i >= 0 && i < 50)).toBe(true);
  });
  it("refuses to select more than are eligible", () => {
    expect(() => selectWithoutReplacement(5, 10)).toThrow();
  });
});

describe("entry form schema", () => {
  const ok = { phone: "01712345678", ageGroup: "AGE_31_PLUS" };
  it("requires phone and age group only", () => {
    expect(entryFormSchema.safeParse(ok).success).toBe(true);
    expect(entryFormSchema.safeParse({ ...ok, phone: "" }).success).toBe(false);
    expect(entryFormSchema.safeParse({ phone: "01712345678" }).success).toBe(false);
  });
  it("accepts exactly the three age groups", () => {
    for (const a of ["BELOW_18", "AGE_18_30", "AGE_31_PLUS"]) expect(entryFormSchema.safeParse({ ...ok, ageGroup: a }).success).toBe(true);
    expect(entryFormSchema.safeParse({ ...ok, ageGroup: "AGE_18_24" }).success).toBe(false);
  });
  it("validates optional fields only when supplied", () => {
    expect(entryFormSchema.safeParse({ ...ok, email: "nope" }).success).toBe(false);
    expect(entryFormSchema.safeParse({ ...ok, socialType: "DISCORD", socialHandle: "bad name!" }).success).toBe(false);
    expect(entryFormSchema.safeParse({ ...ok, socialType: "DISCORD", socialHandle: "good_name" }).success).toBe(true);
    expect(entryFormSchema.safeParse({ ...ok, socialType: "", socialHandle: "orphan" }).success).toBe(false);
    expect(entryFormSchema.safeParse({ ...ok, ign: "x".repeat(41) }).success).toBe(false);
  });
});

describe("policy gates", () => {
  it("everything required is pending by default and no winner count is assumed", () => {
    expect(blockingPoliciesForLive([]).length).toBeGreaterThan(0);
    expect(approvedWinnerCount([])).toBeNull();
    expect(approvedWinnerCount([{ key: "WINNER_COUNT", status: "PENDING", value: { winnerCount: 10 } }])).toBeNull();
    expect(approvedWinnerCount([{ key: "WINNER_COUNT", status: "APPROVED", value: { winnerCount: 20 } }])).toBe(20);
  });
});

describe("permission history", () => {
  it("takes the latest record per type and leaves other types pending", () => {
    const p = currentPermissions([
      { type: "WEBSITE_DATA_USE", status: "GRANTED", recordedAt: new Date(1) },
      { type: "WEBSITE_DATA_USE", status: "WITHDRAWN", recordedAt: new Date(2) },
      { type: "INTERVIEW_PROCEED", status: "GRANTED", recordedAt: new Date(1) },
    ]);
    expect(p).toEqual({ WEBSITE_DATA_USE: "WITHDRAWN", INTERVIEW_PROCEED: "GRANTED", INTERVIEW_ANSWERS_USE: "PENDING" });
  });
});

describe("uploaded image validation", () => {
  it("accepts real PNG/JPEG/WebP bytes and rejects anything else regardless of declared type", async () => {
    const { sniffImageType } = await import("@/lib/study/media");
    expect(sniffImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("image/png");
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "ascii"))).toBe("image/webp");
    expect(sniffImageType(Buffer.from("<svg onload=alert(1)>", "utf8"))).toBeNull();
    expect(sniffImageType(Buffer.from("GIF89a", "ascii"))).toBeNull();
  });
});
