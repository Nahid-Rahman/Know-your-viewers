"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";

const profileSchema = z.object({ name: z.string().min(2) });

export async function updateResearcherProfile(
  values: z.infer<typeof profileSchema>,
): Promise<{ error: string } | { ok: true }> {
  let user;
  try {
    user = await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { error: "Enter a valid name." };

  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/researcher/settings");
  return { ok: true };
}

const streamerProfileSchema = z.object({
  displayName: z.string().min(2),
  platform: z.string().min(1),
  channelUrl: z.string().min(1),
  category: z.string().min(1),
});

export async function updateStreamerProfile(
  values: z.infer<typeof streamerProfileSchema>,
): Promise<{ error: string } | { ok: true }> {
  let user;
  try {
    user = await requireRole("STREAMER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const parsed = streamerProfileSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const streamer = await prisma.streamer.findUnique({ where: { userId: user.id } });
  if (!streamer) return { error: "No streamer profile found for this account." };

  await prisma.streamer.update({ where: { id: streamer.id }, data: parsed.data });
  revalidatePath("/streamer/profile");
  return { ok: true };
}
