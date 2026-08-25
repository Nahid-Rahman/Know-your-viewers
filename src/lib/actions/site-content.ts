"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";

const siteContentSchema = z.object({
  heroHeadline: z.string().min(1),
  heroSubtext: z.string().min(1),
  claimedCount: z.string().min(1),
  countdownSeconds: z.coerce.number().int().min(0),
  trustBadges: z.array(z.object({ icon: z.string().min(1), title: z.string().min(1), description: z.string().min(1) })),
  gameCategories: z.array(z.object({ tag: z.string().min(1), title: z.string().min(1), description: z.string().min(1) })),
  rewardPool: z.array(
    z.object({
      label: z.string().min(1),
      sub: z.string().min(1),
      rarity: z.enum(["common", "rare", "exceptional", "premium"]),
    }),
  ),
  gameTypeOptions: z.array(z.string().min(1)),
  watchFrequencyOptions: z.array(z.string().min(1)),
  faqItems: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })),
});

export type SiteContentValues = z.infer<typeof siteContentSchema>;

export async function updateSiteContent(values: SiteContentValues): Promise<{ error: string } | { ok: true }> {
  try {
    await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const parsed = siteContentSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...parsed.data },
  });

  revalidatePath("/researcher/settings/content");
  revalidatePath("/");
  return { ok: true };
}
