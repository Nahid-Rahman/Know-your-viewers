import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { findVisitorByToken, getLiveVisit, recordActivity, VISITOR_COOKIE } from "@/lib/study/visits";
import { recordStudyEvent } from "@/lib/study/events";
import { allowRequest, PUBLIC_LIMITS } from "@/lib/study/rate-limit";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  visitId: z.string().uuid(),
  kind: z.enum(["visible", "heartbeat", "hidden"]),
});

/**
 * Heartbeat / visibility endpoint. A route handler (not a server action) so
 * the browser can use navigator.sendBeacon on pagehide. Only the visitor
 * cookie's own live visit can be updated.
 */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 300) return new NextResponse(null, { status: 413 });
  let parsed;
  try {
    parsed = bodySchema.safeParse(JSON.parse(text));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const visitor = await findVisitorByToken((await cookies()).get(VISITOR_COOKIE)?.value);
  if (!visitor) return new NextResponse(null, { status: 204 });
  const visit = await getLiveVisit(parsed.data.visitId, visitor.id);
  if (!visit) return NextResponse.json({ expired: true }, { status: 200 });
  if (!(await allowRequest("events", visit.id, PUBLIC_LIMITS.eventsPerVisit.limit, PUBLIC_LIMITS.eventsPerVisit.windowMs))) {
    return new NextResponse(null, { status: 429 });
  }

  await recordActivity(visit.id, parsed.data.kind);
  if (parsed.data.kind !== "heartbeat") {
    await recordStudyEvent(prisma, visit, { type: parsed.data.kind === "hidden" ? "PAGE_HIDDEN" : "PAGE_VISIBLE" });
  }
  return new NextResponse(null, { status: 204 });
}
