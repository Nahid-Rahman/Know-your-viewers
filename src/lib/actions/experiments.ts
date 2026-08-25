"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import type { ExperimentStatus } from "@/generated/prisma/enums";

const experimentSchema = z.object({
  title: z.string().min(4),
  description: z.string().min(10),
  objective: z.string().min(10),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  ethicsApprovalRef: z.string().optional(),
});

export async function createExperiment(
  values: z.infer<typeof experimentSchema>,
): Promise<{ error: string } | { experimentId: string; isDraft: boolean }> {
  let researcher;
  try {
    researcher = await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const parsed = experimentSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };
  const { title, description, objective, startDate, endDate, ethicsApprovalRef } = parsed.data;

  const experiment = await prisma.experiment.create({
    data: {
      title,
      description,
      objective,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      ethicsApprovalRef: ethicsApprovalRef || null,
      researcherId: researcher.id,
      status: "DRAFT",
    },
  });

  revalidatePath("/researcher/experiments");
  return { experimentId: experiment.id, isDraft: true };
}

export async function updateExperiment(
  experimentId: string,
  values: z.infer<typeof experimentSchema>,
): Promise<{ error: string } | { ok: true }> {
  let researcher;
  try {
    researcher = await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
  if (!experiment || experiment.researcherId !== researcher.id) {
    return { error: "Experiment not found." };
  }

  const parsed = experimentSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };
  const { title, description, objective, startDate, endDate, ethicsApprovalRef } = parsed.data;

  await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      title,
      description,
      objective,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      ethicsApprovalRef: ethicsApprovalRef || null,
    },
  });

  revalidatePath(`/researcher/experiments/${experimentId}`);
  revalidatePath("/researcher/experiments");
  return { ok: true };
}

export async function deleteExperiment(experimentId: string): Promise<{ error: string } | { ok: true }> {
  let researcher;
  try {
    researcher = await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
  if (!experiment || experiment.researcherId !== researcher.id) {
    return { error: "Experiment not found." };
  }

  // Cascades conditions/participants/responses/events/tracking-links per schema.
  await prisma.experiment.delete({ where: { id: experimentId } });
  revalidatePath("/researcher/experiments");
  return { ok: true };
}

export async function setExperimentStatus(
  experimentId: string,
  status: ExperimentStatus,
): Promise<{ error: string } | { ok: true }> {
  let researcher;
  try {
    researcher = await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
  if (!experiment || experiment.researcherId !== researcher.id) {
    return { error: "Experiment not found." };
  }
  if (status === "ACTIVE" && !experiment.ethicsApprovalRef) {
    return { error: "Add an ethics approval reference before activating this experiment." };
  }

  await prisma.experiment.update({ where: { id: experimentId }, data: { status } });
  revalidatePath(`/researcher/experiments/${experimentId}`);
  revalidatePath("/researcher/experiments");
  return { ok: true };
}
