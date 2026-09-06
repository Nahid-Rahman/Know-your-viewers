"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import type { EntrySourceValue } from "@/lib/entry-source";

const SESSION_REQUIRED_SOURCES: EntrySourceValue[] = ["STREAM_QR", "STREAM_CHAT_LINK", "STREAM_DESCRIPTION"];

async function requireOwnedExperiment(experimentId: string) {
  const researcher = await requireRole("RESEARCHER");
  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
  if (!experiment || experiment.researcherId !== researcher.id) {
    throw new AuthError("Experiment not found.");
  }
  return experiment;
}

export type TrackingLinkInput = {
  streamerId?: string | null;
  streamSessionId?: string | null;
  entrySource?: EntrySourceValue;
};

function validateSource(input: { streamSessionId?: string | null; entrySource?: EntrySourceValue }) {
  const source = input.entrySource ?? "OTHER";
  if (SESSION_REQUIRED_SOURCES.includes(source) && !input.streamSessionId) {
    return "This entry source needs a stream session — create one on the Streams tab first, or pick Direct/Other.";
  }
  return null;
}

export async function createTrackingLink(
  experimentId: string,
  input: TrackingLinkInput = {},
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireOwnedExperiment(experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const validationError = validateSource(input);
  if (validationError) return { error: validationError };

  await prisma.trackingLink.create({
    data: {
      experimentId,
      uniqueCode: nanoid(8).toUpperCase(),
      streamerId: input.streamerId || null,
      streamSessionId: input.streamSessionId || null,
      entrySource: input.entrySource ?? "OTHER",
    },
  });

  revalidatePath(`/researcher/experiments/${experimentId}/links`);
  return { ok: true };
}

export async function updateTrackingLink(
  linkId: string,
  input: TrackingLinkInput,
): Promise<{ error: string } | { ok: true }> {
  const link = await prisma.trackingLink.findUnique({ where: { id: linkId } });
  if (!link) return { error: "Tracking link not found." };

  try {
    await requireOwnedExperiment(link.experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const merged = {
    streamerId: input.streamerId !== undefined ? input.streamerId : link.streamerId,
    streamSessionId: input.streamSessionId !== undefined ? input.streamSessionId : link.streamSessionId,
    entrySource: input.entrySource ?? (link.entrySource as EntrySourceValue),
  };
  const validationError = validateSource(merged);
  if (validationError) return { error: validationError };

  await prisma.trackingLink.update({ where: { id: linkId }, data: merged });
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
