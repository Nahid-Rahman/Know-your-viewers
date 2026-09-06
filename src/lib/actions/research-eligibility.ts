"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import type { ExclusionReason } from "@/generated/prisma/enums";

function revalidateEligibility(participantId: string) {
  revalidatePath("/researcher/outreach/interviews");
  revalidatePath("/researcher/participants");
  revalidatePath(`/researcher/participants/${participantId}`);
}

export type EligibilityInput = {
  eligible: boolean;
  exclusionReason?: ExclusionReason | null;
  reviewNotes?: string;
};

/** Eligibility is never set automatically — this is always an explicit researcher decision. */
export async function setEligibility(
  participantId: string,
  input: EligibilityInput,
): Promise<{ error: string } | { ok: true }> {
  let researcher;
  try {
    researcher = await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  if (!input.eligible && !input.exclusionReason) {
    return { error: "An exclusion reason is required to mark a participant excluded." };
  }

  const excludedAt = !input.eligible ? new Date() : null;
  const excludedByUserId = !input.eligible ? researcher.id : null;
  const exclusionReason = input.eligible ? null : input.exclusionReason;

  await prisma.researchEligibility.upsert({
    where: { participantId },
    update: {
      eligible: input.eligible,
      exclusionReason,
      excludedAt,
      excludedByUserId,
      ...(input.reviewNotes !== undefined ? { reviewNotes: input.reviewNotes } : {}),
    },
    create: {
      participantId,
      eligible: input.eligible,
      exclusionReason,
      excludedAt,
      excludedByUserId,
      reviewNotes: input.reviewNotes,
    },
  });
  revalidateEligibility(participantId);
  return { ok: true };
}
