"use server";

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

export type StreamSessionInput = {
  streamerId: string;
  platform?: string | null;
  gameName?: string | null;
  streamTitle?: string | null;
  streamStartTime?: string | null;
  streamEndTime?: string | null;
  campaignStartTime?: string | null;
  campaignEndTime?: string | null;
  estimatedViewerCount?: number | null;
  qrDisplayed?: boolean;
  chatLinkPosted?: boolean;
  notes?: string | null;
};

function toDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function toData(input: StreamSessionInput) {
  return {
    streamerId: input.streamerId,
    platform: input.platform || null,
    gameName: input.gameName || null,
    streamTitle: input.streamTitle || null,
    streamStartTime: toDate(input.streamStartTime),
    streamEndTime: toDate(input.streamEndTime),
    campaignStartTime: toDate(input.campaignStartTime),
    campaignEndTime: toDate(input.campaignEndTime),
    estimatedViewerCount: input.estimatedViewerCount ?? null,
    qrDisplayed: input.qrDisplayed ?? false,
    chatLinkPosted: input.chatLinkPosted ?? false,
    notes: input.notes || null,
  };
}

export async function createStreamSession(
  experimentId: string,
  input: StreamSessionInput,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireOwnedExperiment(experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.streamSession.create({ data: { experimentId, ...toData(input) } });

  revalidatePath(`/researcher/experiments/${experimentId}/streams`);
  return { ok: true };
}

export async function updateStreamSession(
  sessionId: string,
  input: StreamSessionInput,
): Promise<{ error: string } | { ok: true }> {
  const session = await prisma.streamSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Stream session not found." };

  try {
    await requireOwnedExperiment(session.experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.streamSession.update({ where: { id: sessionId }, data: toData(input) });
  revalidatePath(`/researcher/experiments/${session.experimentId}/streams`);
  return { ok: true };
}

export async function deleteStreamSession(sessionId: string): Promise<{ error: string } | { ok: true }> {
  const session = await prisma.streamSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Stream session not found." };

  try {
    await requireOwnedExperiment(session.experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const linkedCount = await prisma.trackingLink.count({ where: { streamSessionId: sessionId } });
  if (linkedCount > 0) {
    return {
      error: "Cannot delete a stream session that still has tracking links attached. Reassign or delete those links first.",
    };
  }

  await prisma.streamSession.delete({ where: { id: sessionId } });
  revalidatePath(`/researcher/experiments/${session.experimentId}/streams`);
  return { ok: true };
}
