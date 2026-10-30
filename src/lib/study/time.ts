// Explicit Asia/Dhaka handling for admin date/time inputs. Browser
// <input type="datetime-local"> values carry no zone; they are interpreted as
// Asia/Dhaka wall-clock time here (never the server's own zone) and stored
// as UTC instants.

import { STUDY_TIME_ZONE } from "./constants";

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** "2026-11-02T20:30" (Asia/Dhaka wall clock) → UTC Date. Null for empty input; throws on malformed. */
export function parseStudyLocal(value: string | null | undefined, timeZone = STUDY_TIME_ZONE): Date | null {
  if (!value) return null;
  const m = LOCAL_RE.exec(value.trim());
  if (!m) throw new Error(`Invalid date/time "${value}" — expected YYYY-MM-DDTHH:mm.`);
  const [, y, mo, d, h, mi, s] = m;
  const wallAsUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0));
  // Two passes handle zones whose offset differs around the target instant.
  let guess = wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone);
  guess = wallAsUtc - zoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess);
}

/** UTC Date → "YYYY-MM-DDTHH:mm" in Asia/Dhaka, for a datetime-local input's value. */
export function toStudyLocalInput(date: Date | string | null | undefined, timeZone = STUDY_TIME_ZONE): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const local = new Date(d.getTime() + zoneOffsetMs(d, timeZone));
  return local.toISOString().slice(0, 16);
}

/** Human display in Asia/Dhaka, e.g. "2 Nov 2026, 20:30 (Dhaka)". */
export function formatStudyTime(date: Date | string | null | undefined, timeZone = STUDY_TIME_ZONE): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d)} (Dhaka)`;
}
