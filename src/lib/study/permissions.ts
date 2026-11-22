// Permission types and the "latest decision per type" rule. Pure module —
// safe for client components and unit tests.

export const PERMISSION_TYPES = ["INTERVIEW_PROCEED", "WEBSITE_DATA_USE", "INTERVIEW_ANSWERS_USE"] as const;
export type PermissionTypeValue = (typeof PERMISSION_TYPES)[number];
export type PermissionStatusValue = "PENDING" | "GRANTED" | "DECLINED" | "WITHDRAWN";

/** Latest status per permission type; types never recorded are PENDING. */
export function currentPermissions(
  rows: { type: PermissionTypeValue; status: PermissionStatusValue; recordedAt: Date }[],
): Record<PermissionTypeValue, PermissionStatusValue> {
  const out = { INTERVIEW_PROCEED: "PENDING", WEBSITE_DATA_USE: "PENDING", INTERVIEW_ANSWERS_USE: "PENDING" } as Record<
    PermissionTypeValue,
    PermissionStatusValue
  >;
  const latest = new Map<string, Date>();
  for (const r of rows) {
    if (!latest.has(r.type) || latest.get(r.type)! <= r.recordedAt) {
      latest.set(r.type, r.recordedAt);
      out[r.type] = r.status;
    }
  }
  return out;
}
