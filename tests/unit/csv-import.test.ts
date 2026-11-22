import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";
import { parseMetricsCsv } from "@/lib/study/metrics-import";

const H = "platform,source,measuredAt,views,notes";

describe("RFC 4180 CSV parser", () => {
  it("handles quoted commas, embedded newlines, doubled quotes, CRLF and a BOM", () => {
    const text = '﻿a,b,c\r\n"x, y","line1\nline2","say ""hi"""\r\n1,,3\r\n';
    const r = parseCsv(text);
    expect(r).toEqual({ ok: true, rows: [["a", "b", "c"], ["x, y", "line1\nline2", 'say "hi"'], ["1", "", "3"]], lines: [1, 2, 4] });
  });
  it("round-trips what toCsv writes", () => {
    const rows = [["a,b", 'q"t', "multi\nline", ""]];
    const r = parseCsv(toCsv(["h1", "h2", "h3", "h4"], rows));
    expect(r.ok && r.rows[1]).toEqual(rows[0]);
  });
  it("rejects malformed quotes instead of guessing", () => {
    expect(parseCsv('a,b\n"open,1\n').ok).toBe(false);
    expect(parseCsv('a,b\n"x"y,1\n').ok).toBe(false);
    expect(parseCsv('a,b\nx"y,1\n').ok).toBe(false);
  });
});

describe("platform-metric CSV import", () => {
  it("imports ordinary rows; blank metrics stay unknown (null), never 0", () => {
    const r = parseMetricsCsv(`${H}\nYouTube,Studio,2026-11-20T21:00,1200,\nYouTube,Studio,2026-11-20T22:00,,ok`);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toHaveLength(2);
      expect(r.rows[0].views).toBe(1200);
      expect(r.rows[1].views).toBeNull();
      expect(r.rows[1].likes).toBeNull();
    }
  });
  it("keeps a quoted note with commas and line breaks in ONE row, and accepts a quoted 1,234", () => {
    const r = parseMetricsCsv(`${H}\nYouTube,Studio,2026-11-20T21:00,"1,234","Ranked game, then Q&A\nchat was slow"`);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toHaveLength(1);
      expect(r.rows[0].views).toBe(1234);
      expect(r.rows[0].notes).toBe("Ranked game, then Q&A\nchat was slow");
    }
  });
  it("handles an escaped quote, CRLF and a BOM", () => {
    const r = parseMetricsCsv(`﻿${H}\r\nYouTube,Studio,2026-11-20T21:00,5,"the ""raid"" started"\r\n`);
    expect(r.ok && r.rows[0].notes).toBe('the "raid" started');
  });
  it("rejects duplicate, unknown or missing columns", () => {
    expect(parseMetricsCsv("platform,source,measuredAt,views,views\nY,S,2026-11-20T21:00,1,2")).toMatchObject({ ok: false, errors: [expect.stringMatching(/more than once/)] });
    expect(parseMetricsCsv("platform,source,measuredAt,viewz\nY,S,2026-11-20T21:00,1")).toMatchObject({ ok: false, errors: [expect.stringMatching(/Unknown column "viewz"/)] });
    expect(parseMetricsCsv("platform,views\nY,1")).toMatchObject({ ok: false });
  });
  it("reports a wrong-width row and invalid values by line and column, without echoing the value", () => {
    const r = parseMetricsCsv(`${H}\nYouTube,Studio,2026-11-20T21:00,12,a,b\nYouTube,Studio,2026-02-31T21:00,-3,\nYouTube,Studio,2026-11-20T21:00,12.5,`);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0]).toMatch(/^Line 2: expected 5 values but found 6/);
      expect(r.errors.some((e) => /^Line 3, measuredAt:/.test(e))).toBe(true);
      expect(r.errors.some((e) => /^Line 3, views:/.test(e))).toBe(true);
      expect(r.errors.some((e) => /^Line 4, views:/.test(e))).toBe(true);
      expect(r.errors.join(" ")).not.toContain("12.5");
    }
  });
  it("rejects hex, exponent, binary, signed and decimal-looking numbers instead of converting them", () => {
    for (const bad of ["0x10", "1e3", "0b11", "+5", "1.0", "1,23", " 12 3"]) {
      const r = parseMetricsCsv(`${H}
YouTube,Studio,2026-11-20T21:00,"${bad}",`);
      expect([bad, r.ok]).toEqual([bad, false]);
    }
    const ok = parseMetricsCsv(`${H}
YouTube,Studio,2026-11-20T21:00,"12,345",
YouTube,Studio,2026-11-20T22:00,0,`);
    expect(ok.ok && ok.rows.map((x) => x.views)).toEqual([12345, 0]);
  });
  it("is all-or-nothing: one bad row means no rows are returned", () => {
    const r = parseMetricsCsv(`${H}\nYouTube,Studio,2026-11-20T21:00,1,\nYouTube,,2026-11-20T22:00,2,`);
    expect(r.ok).toBe(false);
    expect("rows" in r).toBe(false);
  });
  it("reports a malformed quote with its line", () => {
    expect(parseMetricsCsv(`${H}\nYouTube,Studio,2026-11-20T21:00,1,"unterminated`)).toEqual({ ok: false, errors: ["Line 2: A quoted field is never closed."] });
  });
});
