import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { INVALID_REASON_CODES, PUBLIC_ROUTE_KEYS, TRACKABLE_FIELDS } from "./constants";
import type { Prisma } from "@/generated/prisma/client";

/**
 * The only events a browser may report. No free-form metadata: `element` is
 * an enum, and nothing typed into the form is ever accepted here. Server-only
 * events (SUBMISSION_SAVED, DUPLICATE_CLASSIFIED, SUBMISSION_REJECTED,
 * SPIN_CLICKED/SPIN_COMPLETED via the spin action) are written by the server.
 */
export const clientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("LANDING_VIEWED") }),
  z.object({ type: z.literal("REWARD_SECTION_VIEWED") }),
  z.object({ type: z.literal("SPIN_COMPLETED") }),
  z.object({ type: z.literal("FORM_OPENED") }),
  z.object({ type: z.literal("FORM_CLOSED") }),
  z.object({ type: z.literal("FIELD_INTERACTED"), element: z.enum(TRACKABLE_FIELDS) }),
  z.object({ type: z.literal("SUBMISSION_ATTEMPTED") }),
  // Bounded reason codes only, never the typed values.
  z.object({
    type: z.literal("SUBMISSION_VALIDATION_FAILED"),
    reasons: z.array(z.enum(INVALID_REASON_CODES)).min(1).max(INVALID_REASON_CODES.length),
  }),
  z.object({ type: z.literal("ROUTE_VIEWED"), element: z.enum(PUBLIC_ROUTE_KEYS) }),
  z.object({ type: z.literal("CONFIRMATION_VIEWED") }),
]);

export type ClientEvent = z.infer<typeof clientEventSchema>;

/** Events that only need recording once per visit (refresh / re-render safe). */
const ONCE_PER_VISIT = new Set(["LANDING_VIEWED", "REWARD_SECTION_VIEWED", "CONFIRMATION_VIEWED"]);
/** FIELD_INTERACTED is recorded once per field per visit — not per keystroke/focus. */

type Db = Prisma.TransactionClient | typeof prisma;

export async function recordStudyEvent(
  db: Db,
  visit: { id: string; experimentId: string; streamSessionId: string },
  event: {
    type: Prisma.StudyEventCreateInput["type"];
    element?: string | null;
    submissionId?: string | null;
    detail?: Record<string, string | number | boolean | null>;
  },
) {
  if (ONCE_PER_VISIT.has(event.type) || event.type === "FIELD_INTERACTED") {
    const existing = await db.studyEvent.findFirst({
      where: { visitId: visit.id, type: event.type, element: event.element ?? null },
      select: { id: true },
    });
    if (existing) return;
  }
  await db.studyEvent.create({
    data: {
      visitId: visit.id,
      experimentId: visit.experimentId,
      streamSessionId: visit.streamSessionId,
      type: event.type,
      element: event.element ?? null,
      submissionId: event.submissionId ?? null,
      detail: event.detail as Prisma.InputJsonValue | undefined,
    },
  });
}
