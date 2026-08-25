"use server";

import { z } from "zod";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function requireResearcher() {
  return requireRole("RESEARCHER");
}

async function requireOwnedExperiment(experimentId: string) {
  const researcher = await requireResearcher();
  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
  if (!experiment || experiment.researcherId !== researcher.id) {
    throw new AuthError("Experiment not found.");
  }
  return experiment;
}

const createStreamerSchema = z.object({
  name: z.string().min(2, "Enter a name."),
  email: z.string().email("Enter a valid email address."),
  platform: z.string().min(1, "Enter a platform."),
  channelUrl: z.string().min(1, "Enter a channel URL."),
  category: z.string().min(1, "Enter a category."),
});

export type CreateStreamerValues = z.infer<typeof createStreamerSchema>;

/**
 * Creates a real Supabase login for a streamer the researcher is onboarding
 * directly (they may never self-register). Rolls the auth user back if the
 * Postgres writes fail, so we never leave an orphaned Supabase account.
 */
export async function createStreamerAccount(
  values: CreateStreamerValues,
): Promise<{ error: string } | { tempPassword: string; streamerId: string }> {
  try {
    await requireResearcher();
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY isn't configured — can't create a login." };
  }

  const parsed = createStreamerSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };
  const { name, email, platform, channelUrl, category } = parsed.data;

  const admin = createSupabaseAdminClient();
  const tempPassword = nanoid(16);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (error || !data.user) return { error: error?.message ?? "Failed to create the streamer's account." };

  try {
    const user = await prisma.user.create({
      data: { supabaseId: data.user.id, name, email, role: "STREAMER" },
    });
    const streamer = await prisma.streamer.create({
      data: { userId: user.id, displayName: name, platform, channelUrl, category, status: "ACTIVE" },
    });

    revalidatePath("/researcher/streamers");
    return { tempPassword, streamerId: streamer.id };
  } catch {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
    return { error: "Failed to save the streamer's profile; the account was rolled back." };
  }
}

const updateStreamerSchema = z.object({
  displayName: z.string().min(2),
  platform: z.string().min(1),
  channelUrl: z.string().min(1),
  category: z.string().min(1),
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE"]),
});

export type UpdateStreamerValues = z.infer<typeof updateStreamerSchema>;

export async function updateStreamer(
  streamerId: string,
  values: UpdateStreamerValues,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireResearcher();
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const parsed = updateStreamerSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.streamer.update({ where: { id: streamerId }, data: parsed.data });
  revalidatePath("/researcher/streamers");
  revalidatePath(`/researcher/streamers/${streamerId}`);
  return { ok: true };
}

export async function deleteStreamer(streamerId: string): Promise<{ error: string } | { ok: true }> {
  try {
    await requireResearcher();
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const streamer = await prisma.streamer.findUnique({ where: { id: streamerId }, include: { user: true } });
  if (!streamer) return { error: "Streamer not found." };

  // TrackingLink.streamerId has no cascade rule — unassign first so the
  // cascade from deleting the User (below) doesn't hit a FK violation.
  await prisma.trackingLink.updateMany({ where: { streamerId }, data: { streamerId: null } });
  await prisma.user.delete({ where: { id: streamer.userId } });

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.deleteUser(streamer.user.supabaseId).catch(() => {});
  }

  revalidatePath("/researcher/streamers");
  return { ok: true };
}

export async function assignStreamerToExperiment(
  experimentId: string,
  streamerId: string,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireOwnedExperiment(experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.experimentStreamer.upsert({
    where: { experimentId_streamerId: { experimentId, streamerId } },
    update: {},
    create: { experimentId, streamerId },
  });
  revalidatePath(`/researcher/experiments/${experimentId}`);
  return { ok: true };
}

export async function unassignStreamerFromExperiment(
  experimentId: string,
  streamerId: string,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireOwnedExperiment(experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.experimentStreamer.deleteMany({ where: { experimentId, streamerId } });
  revalidatePath(`/researcher/experiments/${experimentId}`);
  return { ok: true };
}
