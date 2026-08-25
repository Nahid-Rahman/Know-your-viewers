"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";

const conditionSchema = z.object({
  name: z.string().min(2),
  urgencyEnabled: z.boolean(),
  socialProofEnabled: z.boolean(),
  authorityBadgesEnabled: z.boolean(),
  rewardRarity: z.enum(["COMMON", "RARE", "EXCEPTIONAL", "PREMIUM"]),
  contactRequirement: z.enum(["OPTIONAL", "REQUIRED"]),
});

export type ConditionFormValues = z.infer<typeof conditionSchema>;

async function requireOwnedExperiment(experimentId: string) {
  const researcher = await requireRole("RESEARCHER");
  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
  if (!experiment || experiment.researcherId !== researcher.id) {
    throw new AuthError("Experiment not found.");
  }
  return experiment;
}

export async function createCondition(
  experimentId: string,
  values: ConditionFormValues,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireOwnedExperiment(experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const parsed = conditionSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.condition.create({ data: { experimentId, ...parsed.data } });
  revalidatePath(`/researcher/experiments/${experimentId}/conditions`);
  return { ok: true };
}

export async function updateCondition(
  conditionId: string,
  values: ConditionFormValues,
): Promise<{ error: string } | { ok: true }> {
  const researcher = await requireRole("RESEARCHER").catch((err) => {
    if (err instanceof AuthError) return null;
    throw err;
  });
  if (!researcher) return { error: "Not signed in." };

  const condition = await prisma.condition.findUnique({
    where: { id: conditionId },
    include: { experiment: { select: { researcherId: true, id: true } } },
  });
  if (!condition || condition.experiment.researcherId !== researcher.id) {
    return { error: "Condition not found." };
  }

  const parsed = conditionSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.condition.update({ where: { id: conditionId }, data: parsed.data });
  revalidatePath(`/researcher/experiments/${condition.experiment.id}/conditions`);
  return { ok: true };
}

export async function deleteCondition(conditionId: string): Promise<{ error: string } | { ok: true }> {
  const researcher = await requireRole("RESEARCHER").catch((err) => {
    if (err instanceof AuthError) return null;
    throw err;
  });
  if (!researcher) return { error: "Not signed in." };

  const condition = await prisma.condition.findUnique({
    where: { id: conditionId },
    include: { experiment: { select: { researcherId: true, id: true } } },
  });
  if (!condition || condition.experiment.researcherId !== researcher.id) {
    return { error: "Condition not found." };
  }

  try {
    await prisma.condition.delete({ where: { id: conditionId } });
  } catch {
    return { error: "Can't delete — participants have already been assigned to this condition." };
  }

  revalidatePath(`/researcher/experiments/${condition.experiment.id}/conditions`);
  return { ok: true };
}
