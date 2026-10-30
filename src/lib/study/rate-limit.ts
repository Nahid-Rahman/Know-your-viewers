import "server-only";
import { prisma } from "@/lib/prisma";
import { hashRateLimitKey } from "./keys";

/**
 * Fixed-window counter in Postgres (works across serverless instances).
 * Returns false when `limit` is exceeded for this window. Keys are HMACs, so
 * neither visitor ids nor IP addresses are stored in readable form.
 */
export async function allowRequest(scope: string, identity: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = new Date(now - (now % windowMs));
  const key = `${scope}:${hashRateLimitKey(`${scope}|${identity}`)}`;
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limit_buckets (key, "windowStart", count)
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit_buckets."windowStart" = EXCLUDED."windowStart"
                   THEN rate_limit_buckets.count + 1 ELSE 1 END,
      "windowStart" = EXCLUDED."windowStart"
    RETURNING count`;
  return (rows[0]?.count ?? 0) <= limit;
}

/** Limits applied to public (unauthenticated) actions. */
export const PUBLIC_LIMITS = {
  visitStartPerIp: { limit: 120, windowMs: 60 * 60 * 1000 },
  eventsPerVisit: { limit: 400, windowMs: 60 * 60 * 1000 },
  spinPerVisit: { limit: 30, windowMs: 60 * 60 * 1000 },
  submitPerVisitor: { limit: 10, windowMs: 60 * 60 * 1000 },
  submitPerIp: { limit: 60, windowMs: 60 * 60 * 1000 },
  supportPerIp: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;
