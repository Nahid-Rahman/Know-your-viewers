"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import type { DebriefStatus, DebriefMethod } from "@/generated/prisma/enums";

function revalidateDebrief() {
  revalidatePath("/researcher/outreach/debrief");
  revalidatePath("/researcher/participants");
}

/**
 * Researcher-side debrief-queue workflow — distinct from the participant-facing
 * `submitDebrief` action, which auto-sets ACKNOWLEDGED/DECLINED the moment a
 * participant completes the on-page flow themselves. This one is for
 * participants who never got that far on their own.
 */
export async function updateDebriefWorkflow(
  participantId: string,
  input: { debriefStatus?: DebriefStatus; debriefMethod?: DebriefMethod | null; debriefNotes?: string; markSent?: boolean },
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const sentAt = input.markSent ? new Date() : undefined;

  await prisma.debrief.upsert({
    where: { participantId },
    update: {
      ...(input.debriefStatus ? { debriefStatus: input.debriefStatus } : {}),
      ...(input.debriefMethod !== undefined ? { debriefMethod: input.debriefMethod } : {}),
      ...(input.debriefNotes !== undefined ? { debriefNotes: input.debriefNotes } : {}),
      ...(sentAt ? { debriefSentAt: sentAt } : {}),
    },
    create: {
      participantId,
      explanationShown: false,
      debriefStatus: input.debriefStatus ?? "CONTACTED",
      debriefMethod: input.debriefMethod ?? null,
      debriefNotes: input.debriefNotes ?? null,
      debriefSentAt: sentAt ?? null,
    },
  });
  revalidateDebrief();
  return { ok: true };
}
