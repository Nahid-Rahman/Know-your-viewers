import "server-only";
import { prisma } from "@/lib/prisma";
import { ACTIVE_CREDIT_CAP_MS, VISIT_INACTIVITY_TIMEOUT_MS } from "./constants";
import { hashVisitorToken, newVisitorToken } from "./keys";

export const VISITOR_COOKIE = "ldv";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

/**
 * The single public study session: ACTIVE, STUDY-type, with a config. Sessions
 * run sequentially and activation refuses overlap (see activateSession), so
 * there is at most one. Returns null when nothing is running.
 */
export async function getActiveStudySession() {
  return prisma.streamSession.findFirst({
    where: { status: "ACTIVE", sessionType: "STUDY", currentConfigId: { not: null } },
    include: { currentConfig: true, experiment: { select: { id: true, title: true } } },
    orderBy: { activatedAt: "desc" },
  });
}

export type ActiveSession = NonNullable<Awaited<ReturnType<typeof getActiveStudySession>>>;

export async function resolveAttribution(ref: string | null | undefined, session: { id: string }) {
  const code = ref?.trim().slice(0, 64) || null;
  if (!code) return { attributionSource: "ACTIVE_SESSION" as const, trackingLinkId: null, receivedRefCode: null };
  const link = await prisma.trackingLink.findUnique({ where: { uniqueCode: code } });
  if (!link) return { attributionSource: "UNKNOWN_TRACKING_CODE" as const, trackingLinkId: null, receivedRefCode: code };
  if (link.streamSessionId === session.id) {
    return { attributionSource: "TRACKING_LINK" as const, trackingLinkId: link.id, receivedRefCode: null };
  }
  // A link for another (older) session: never credited to the current one.
  return { attributionSource: "STALE_TRACKING_LINK" as const, trackingLinkId: null, receivedRefCode: code };
}

export async function findVisitorByToken(token: string | null | undefined) {
  if (!token || token.length > 100) return null;
  return prisma.browserVisitor.findUnique({ where: { tokenHash: hashVisitorToken(token) } });
}

/**
 * Starts a visit, or resumes this browser's visit to the same session if it
 * was active within the inactivity timeout (refresh / second tab). Returns a
 * new cookie token when the browser had none (or an unknown one).
 */
export async function startOrResumeVisit(input: {
  token: string | null;
  ref: string | null;
  referrerHost: string | null;
  session: ActiveSession;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  let visitor = await findVisitorByToken(input.token);
  let newToken: string | null = null;
  if (!visitor) {
    newToken = newVisitorToken();
    visitor = await prisma.browserVisitor.create({ data: { tokenHash: hashVisitorToken(newToken) } });
  } else {
    await prisma.browserVisitor.update({ where: { id: visitor.id }, data: { lastSeenAt: now } });
  }

  const recent = await prisma.visit.findFirst({
    where: {
      visitorId: visitor.id,
      streamSessionId: input.session.id,
      // A config edit mid-visit starts a new visit, so each visit records
      // exactly the configuration version that was on screen.
      configId: input.session.currentConfigId!,
      lastSeenAt: { gte: new Date(now.getTime() - VISIT_INACTIVITY_TIMEOUT_MS) },
    },
    orderBy: { lastSeenAt: "desc" },
  });
  if (recent) {
    await prisma.visit.update({ where: { id: recent.id }, data: { lastSeenAt: now } });
    return { visit: recent, visitorId: visitor.id, newToken, resumed: true };
  }

  const attribution = await resolveAttribution(input.ref, input.session);
  const visit = await prisma.visit.create({
    data: {
      visitorId: visitor.id,
      experimentId: input.session.experimentId,
      streamSessionId: input.session.id,
      configId: input.session.currentConfigId!,
      ...attribution,
      referrerHost: input.referrerHost?.slice(0, 120) ?? null,
      startedAt: now,
      lastSeenAt: now,
    },
  });
  return { visit, visitorId: visitor.id, newToken, resumed: false };
}

/** A visit owned by this browser that has not timed out. */
export async function getLiveVisit(visitId: string, visitorId: string, now = new Date()) {
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit || visit.visitorId !== visitorId) return null;
  if (now.getTime() - visit.lastSeenAt.getTime() > VISIT_INACTIVITY_TIMEOUT_MS) return null;
  return visit;
}

/**
 * Atomic active-time credit (same rule as estimateActiveMs in activity.ts),
 * using database time so concurrent tabs serialize on the row. Columns are
 * `timestamp without time zone` holding UTC (Prisma's convention), so the
 * SQL writes `now() AT TIME ZONE 'UTC'` rather than relying on the database
 * session's timezone being UTC.
 */
export async function recordActivity(visitId: string, kind: "visible" | "heartbeat" | "hidden") {
  if (kind === "visible") {
    await prisma.$executeRaw`
      UPDATE visits SET "lastSeenAt" = (now() AT TIME ZONE 'UTC'),
        "activeCreditAt" = COALESCE("activeCreditAt", (now() AT TIME ZONE 'UTC'))
      WHERE id = ${visitId}`;
    return;
  }
  await prisma.$executeRaw`
    UPDATE visits SET
      "activeMs" = "activeMs" + CASE WHEN "activeCreditAt" IS NULL THEN 0
        ELSE LEAST(GREATEST((EXTRACT(EPOCH FROM ((now() AT TIME ZONE 'UTC') - "activeCreditAt")) * 1000)::int, 0), ${ACTIVE_CREDIT_CAP_MS}) END,
      "activeCreditAt" = CASE WHEN ${kind} = 'hidden' THEN NULL ELSE (now() AT TIME ZONE 'UTC') END,
      "lastSeenAt" = (now() AT TIME ZONE 'UTC')
    WHERE id = ${visitId}`;
}
