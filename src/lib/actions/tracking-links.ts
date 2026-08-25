"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";

async function requireOwnedExperiment(experimentId: string) {
  const researcher = await requireRole("RESEARCHER");
  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
  if (!experiment || experiment.researcherId !== researcher.id) {
    throw new AuthError("Experiment not found.");
  }
  return experiment;
}

export async function createTrackingLink(
  experimentId: string,
  streamerId?: string | null,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireOwnedExperiment(experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.trackingLink.create({
    data: { experimentId, uniqueCode: nanoid(8).toUpperCase(), streamerId: streamerId || null },
  });

  revalidatePath(`/researcher/experiments/${experimentId}/links`);
  return { ok: true };
}

export async function updateTrackingLinkStreamer(
  linkId: string,
  streamerId: string | null,
): Promise<{ error: string } | { ok: true }> {
  const link = await prisma.trackingLink.findUnique({ where: { id: linkId } });
  if (!link) return { error: "Tracking link not found." };

  try {
    await requireOwnedExperiment(link.experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.trackingLink.update({ where: { id: linkId }, data: { streamerId } });
  revalidatePath(`/researcher/experiments/${link.experimentId}/links`);
  return { ok: true };
}

export async function deleteTrackingLink(linkId: string): Promise<{ error: string } | { ok: true }> {
  const link = await prisma.trackingLink.findUnique({ where: { id: linkId } });
  if (!link) return { error: "Tracking link not found." };

  try {
    await requireOwnedExperiment(link.experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.trackingLink.delete({ where: { id: linkId } });
  revalidatePath(`/researcher/experiments/${link.experimentId}/links`);
  return { ok: true };
}
