"use server";

import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clientEventSchema, recordStudyEvent } from "@/lib/study/events";
import { allowRequest, PUBLIC_LIMITS } from "@/lib/study/rate-limit";
import { spinForVisit, submitEntryForVisit, type SubmitResult } from "@/lib/study/submissions";
import {
  findVisitorByToken,
  getActiveStudySession,
  getLiveVisit,
  startOrResumeVisit,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
} from "@/lib/study/visits";

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

async function currentVisitor() {
  const token = (await cookies()).get(VISITOR_COOKIE)?.value ?? null;
  return findVisitorByToken(token);
}

/**
 * Called by the homepage after hydration (so link previews and plain server
 * renders never create visits). Sets the opaque first-party visitor cookie.
 */
export async function startVisit(input: { ref?: string | null; referrer?: string | null; renderedConfigId?: string | null }) {
  const session = await getActiveStudySession();
  if (!session) return { ok: false as const, reason: "NO_ACTIVE_SESSION" };
  if (!(await allowRequest("visit-start", await clientIp(), PUBLIC_LIMITS.visitStartPerIp.limit, PUBLIC_LIMITS.visitStartPerIp.windowMs))) {
    return { ok: false as const, reason: "RATE_LIMITED" };
  }

  let referrerHost: string | null = null;
  try {
    referrerHost = input.referrer ? new URL(input.referrer).hostname.slice(0, 120) : null;
  } catch {
    referrerHost = null;
  }

  const cookieStore = await cookies();
  const result = await startOrResumeVisit({
    token: cookieStore.get(VISITOR_COOKIE)?.value ?? null,
    ref: typeof input.ref === "string" ? input.ref : null,
    referrerHost,
    session,
  });
  if (result.newToken) {
    cookieStore.set(VISITOR_COOKIE, result.newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
    });
  }
  return {
    ok: true as const,
    visitId: result.visit.id,
    configId: result.visit.configId,
    configChanged: Boolean(input.renderedConfigId && input.renderedConfigId !== result.visit.configId),
  };
}

/** Bounded client events — see clientEventSchema. Silently ignores anything invalid. */
export async function logStudyEvent(visitId: string, event: unknown): Promise<void> {
  const parsed = clientEventSchema.safeParse(event);
  if (!parsed.success || typeof visitId !== "string") return;
  const visitor = await currentVisitor();
  if (!visitor) return;
  const visit = await getLiveVisit(visitId, visitor.id);
  if (!visit) return;
  if (!(await allowRequest("events", visit.id, PUBLIC_LIMITS.eventsPerVisit.limit, PUBLIC_LIMITS.eventsPerVisit.windowMs))) return;
  // A completed spin is only credible if the server actually stored one for this visit.
  if (parsed.data.type === "SPIN_COMPLETED" && !(await prisma.spinOutcome.findUnique({ where: { visitId: visit.id }, select: { id: true } }))) return;
  await recordStudyEvent(prisma, visit, {
    type: parsed.data.type,
    element: "element" in parsed.data ? parsed.data.element : null,
  }).catch(() => {});
  await prisma.visit.update({ where: { id: visit.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
}

export async function spinWheel(visitId: string) {
  const visitor = await currentVisitor();
  if (!visitor || typeof visitId !== "string") return { ok: false as const, error: "Please reload the page." };
  if (!(await allowRequest("spin", visitId, PUBLIC_LIMITS.spinPerVisit.limit, PUBLIC_LIMITS.spinPerVisit.windowMs))) {
    return { ok: false as const, error: "Too many requests — please wait a moment." };
  }
  return spinForVisit(visitor.id, visitId);
}

export async function submitStudyEntry(input: { visitId: string; idempotencyKey: string; values: unknown }): Promise<SubmitResult> {
  const visitor = await currentVisitor();
  if (!visitor) return { ok: false, code: "VISIT_EXPIRED", error: "Your session expired — please reload the page." };
  const ip = await clientIp();
  const [byVisitor, byIp] = await Promise.all([
    allowRequest("submit-visitor", visitor.id, PUBLIC_LIMITS.submitPerVisitor.limit, PUBLIC_LIMITS.submitPerVisitor.windowMs),
    allowRequest("submit-ip", ip, PUBLIC_LIMITS.submitPerIp.limit, PUBLIC_LIMITS.submitPerIp.windowMs),
  ]);
  if (!byVisitor || !byIp) return { ok: false, code: "RATE_LIMITED", error: "Too many submissions — please try again later." };
  return submitEntryForVisit({
    visitorId: visitor.id,
    visitId: String(input.visitId ?? ""),
    idempotencyKey: String(input.idempotencyKey ?? ""),
    values: input.values,
  });
}
