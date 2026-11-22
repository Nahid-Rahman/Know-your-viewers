// Platform-metric validation and CSV import parsing. Pure (no database) so the
// whole import can be validated before anything is written, and unit-tested.

import { z } from "zod";
import { parseCsv } from "@/lib/csv";
import { parseStudyLocal } from "./time";

const optInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || (typeof v === "string" && v.trim() === "")) return null; // missing stays missing, never 0
    const text = typeof v === "number" ? null : String(v).trim();
    // Plain digits only (thousands commas allowed): rejects 0x10, 1e3, 0b11, +5, 1.0.
    if (text !== null && !/^\d{1,3}(,\d{3})*$|^\d+$/.test(text)) {
      ctx.addIssue({ code: "custom", message: "Metrics must be whole numbers (or left blank)." });
      return z.NEVER;
    }
    const n = typeof v === "number" ? v : Number(text!.replace(/,/g, ""));
    if (!Number.isInteger(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Metrics must be whole numbers (or left blank)." });
      return z.NEVER;
    }
    return n;
  });

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
/** A real calendar date/time in YYYY-MM-DDTHH:mm (rejects 2026-02-31, 25:00, …). */
function isRealLocal(v: string) {
  const m = LOCAL_RE.exec(v.trim());
  if (!m) return false;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi, s || 0));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d && t.getUTCHours() === h && t.getUTCMinutes() === mi;
}
const localTime = (required: boolean) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      const t = v?.trim() ?? "";
      if (!t) {
        if (required) ctx.addIssue({ code: "custom", message: "Enter a date/time as YYYY-MM-DDTHH:mm (Dhaka time)." });
        return required ? z.NEVER : "";
      }
      if (!isRealLocal(t)) {
        ctx.addIssue({ code: "custom", message: "Use a real date/time as YYYY-MM-DDTHH:mm (Dhaka time)." });
        return z.NEVER;
      }
      return t;
    });

export const metricSchema = z.object({
  platform: z.string().trim().min(1, "Platform is required.").max(40),
  platformStreamId: z.string().trim().max(120).optional(),
  durationMinutes: optInt,
  views: optInt,
  avgConcurrentViewers: optInt,
  peakConcurrentViewers: optInt,
  watchTimeMinutes: optInt,
  avgViewDurationSeconds: optInt,
  likes: optInt,
  comments: optInt,
  shares: optInt,
  newFollowers: optInt,
  source: z.string().trim().min(1, "Say where the numbers came from.").max(120),
  measuredAt: localTime(true),
  windowStart: localTime(false),
  windowEnd: localTime(false),
  notes: z.string().trim().max(1000).optional(),
});

export type PlatformMetricInput = z.input<typeof metricSchema>;
export type PlatformMetricValues = z.output<typeof metricSchema>;

/** Prisma create data (without session/recorder) from validated values. */
export function metricData(v: PlatformMetricValues) {
  return {
    ...v,
    platformStreamId: v.platformStreamId || null,
    notes: v.notes || null,
    measuredAt: parseStudyLocal(v.measuredAt)!,
    windowStart: parseStudyLocal(v.windowStart),
    windowEnd: parseStudyLocal(v.windowEnd),
  };
}

export const METRIC_COLUMNS = Object.keys(metricSchema.shape) as (keyof typeof metricSchema.shape)[];
const REQUIRED_COLUMNS = ["platform", "source", "measuredAt"] as const;
const MAX_ERRORS = 20;
export const MAX_IMPORT_BYTES = 100_000;
export const MAX_IMPORT_ROWS = 500;

export type MetricsImportResult = { ok: true; rows: PlatformMetricValues[] } | { ok: false; errors: string[] };

/**
 * Validates a whole CSV before anything is saved: header names (unknown,
 * duplicate, missing required), row width, and every cell. Errors name the
 * line and column but never repeat cell contents. Blank metric cells become
 * null (unknown), never 0.
 */
export function parseMetricsCsv(text: string): MetricsImportResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, errors: ["File too large (max 100 KB)."] };
  const parsed = parseCsv(text);
  if (!parsed.ok) return { ok: false, errors: [`Line ${parsed.line}: ${parsed.error}`] };
  const [header, ...body] = parsed.rows;
  if (!header || body.length === 0) return { ok: false, errors: ["Expected a header row and at least one data row."] };
  if (body.length > MAX_IMPORT_ROWS) return { ok: false, errors: [`Too many rows (max ${MAX_IMPORT_ROWS}).`] };

  const errors: string[] = [];
  const headers = header.map((h) => h.trim());
  const allowed = new Set<string>(METRIC_COLUMNS);
  const seen = new Set<string>();
  headers.forEach((h, i) => {
    if (!h) errors.push(`Header column ${i + 1} is empty.`);
    else if (!allowed.has(h)) errors.push(`Unknown column "${h.slice(0, 40)}". Allowed: ${METRIC_COLUMNS.join(", ")}.`);
    else if (seen.has(h)) errors.push(`Column "${h}" appears more than once.`);
    seen.add(h);
  });
  for (const r of REQUIRED_COLUMNS) if (!seen.has(r)) errors.push(`Missing required column "${r}".`);
  if (errors.length) return { ok: false, errors };

  const rows: PlatformMetricValues[] = [];
  body.forEach((cells, i) => {
    if (errors.length >= MAX_ERRORS) return;
    const line = parsed.lines[i + 1];
    if (cells.length !== headers.length) {
      errors.push(`Line ${line}: expected ${headers.length} values but found ${cells.length}. Quote any value that contains a comma.`);
      return;
    }
    const obj = Object.fromEntries(headers.map((h, j) => [h, cells[j]]));
    const r = metricSchema.safeParse(obj);
    if (!r.success) {
      for (const issue of r.error.issues.slice(0, 3)) {
        const col = String(issue.path[0] ?? "row");
        errors.push(`Line ${line}, ${col}: ${issue.message.replace(/\.$/, "")}.`);
      }
      return;
    }
    rows.push(r.data);
  });
  if (errors.length) {
    if (errors.length >= MAX_ERRORS) errors.push("Stopped after 20 errors.");
    return { ok: false, errors };
  }
  return { ok: true, rows };
}
