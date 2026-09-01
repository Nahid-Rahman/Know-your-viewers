"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import { getSiteContent } from "@/lib/queries/research";
import { DEFAULT_SITE_CONTENT, type SiteContentValues } from "@/lib/site-content-defaults";

export type { SiteContentValues } from "@/lib/site-content-defaults";

async function requireResearcher() {
  await requireRole("RESEARCHER");
}

function handleAuthError(err: unknown): { error: string } {
  if (err instanceof AuthError) return { error: err.message };
  throw err;
}

/** Content read by the two "use client" stimulus pages (debrief, entry-received) after mount. */
export async function getPublicSiteContent(): Promise<SiteContentValues | null> {
  return getSiteContent();
}

const navLinkSchema = z.object({ href: z.string().min(1), label: z.string().min(1) });
const iconLabelSchema = z.object({ icon: z.string().min(1), label: z.string().min(1) });

// ---------------------------------------------------------------------------
// Landing page (unchanged)
// ---------------------------------------------------------------------------

const siteContentSchema = z.object({
  heroHeadline: z.string().min(1),
  heroSubtext: z.string().min(1),
  claimedCount: z.string().min(1),
  countdownSeconds: z.coerce.number().int().min(0),
  trustBadges: z.array(z.object({ icon: z.string().min(1), title: z.string().min(1), description: z.string().min(1) })),
  gameCategories: z.array(
    z.object({
      icon: z.string().min(1),
      image: z.string().min(1),
      tag: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
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

export type LandingContentValues = z.infer<typeof siteContentSchema>;

export async function updateSiteContent(values: LandingContentValues): Promise<{ error: string } | { ok: true }> {
  try {
    await requireResearcher();
  } catch (err) {
    return handleAuthError(err);
  }

  const parsed = siteContentSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...DEFAULT_SITE_CONTENT, ...parsed.data },
  });

  revalidatePath("/researcher/settings/content");
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Brand & navigation
// ---------------------------------------------------------------------------

const brandNavSchema = z.object({
  siteName: z.string().min(1),
  siteDescription: z.string().min(1),
  navContent: z.object({ links: z.array(navLinkSchema), ctaLabel: z.string().min(1) }),
  footerContent: z.object({
    links: z.array(navLinkSchema),
    copyrightText: z.string().min(1),
    disclaimerText: z.string().min(1),
  }),
});

export type BrandNavValues = z.infer<typeof brandNavSchema>;

export async function updateBrandNavContent(values: BrandNavValues): Promise<{ error: string } | { ok: true }> {
  try {
    await requireResearcher();
  } catch (err) {
    return handleAuthError(err);
  }

  const parsed = brandNavSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...DEFAULT_SITE_CONTENT, ...parsed.data },
  });

  revalidatePath("/researcher/settings/content");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// About page
// ---------------------------------------------------------------------------

const aboutContentSchema = z.object({
  pageTitle: z.string().min(1),
  heroEyebrow: z.string().min(1),
  heroTitle: z.string().min(1),
  heroSubtext: z.string().min(1),
  liveBadges: z.array(z.string().min(1)),
  whatIsEyebrow: z.string().min(1),
  whatIsTitle: z.string().min(1),
  whatIsDescription: z.string().min(1),
  howItWorksEyebrow: z.string().min(1),
  howItWorksTitle: z.string().min(1),
  steps: z.array(z.object({ title: z.string().min(1), description: z.string().min(1) })),
  infoRequiredEyebrow: z.string().min(1),
  infoRequiredTitle: z.string().min(1),
  infoRequiredDescription: z.string().min(1),
  requiredFields: z.array(z.string().min(1)),
  statFieldsTotalValue: z.string().min(1),
  statFieldsTotalLabel: z.string().min(1),
  statSensitiveDataValue: z.string().min(1),
  statSensitiveDataLabel: z.string().min(1),
  safetyEyebrow: z.string().min(1),
  safetyTitle: z.string().min(1),
  safetyDescription: z.string().min(1),
  neverCollected: z.array(z.string().min(1)),
});

export type AboutContentValues = z.infer<typeof aboutContentSchema>;

export async function updateAboutContent(values: AboutContentValues): Promise<{ error: string } | { ok: true }> {
  try {
    await requireResearcher();
  } catch (err) {
    return handleAuthError(err);
  }

  const parsed = aboutContentSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: { aboutContent: parsed.data },
    create: { id: "singleton", ...DEFAULT_SITE_CONTENT, aboutContent: parsed.data },
  });

  revalidatePath("/researcher/settings/content");
  revalidatePath("/about");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Support page
// ---------------------------------------------------------------------------

const supportContentSchema = z.object({
  pageTitle: z.string().min(1),
  heroEyebrow: z.string().min(1),
  heroTitle: z.string().min(1),
  heroSubtext: z.string().min(1),
  infoCards: z.array(z.object({ icon: z.string().min(1), title: z.string().min(1), description: z.string().min(1) })),
  formFooterText: z.string().min(1),
  bottomTrustText: z.string().min(1),
});

export type SupportContentValues = z.infer<typeof supportContentSchema>;

export async function updateSupportContent(values: SupportContentValues): Promise<{ error: string } | { ok: true }> {
  try {
    await requireResearcher();
  } catch (err) {
    return handleAuthError(err);
  }

  const parsed = supportContentSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: { supportContent: parsed.data },
    create: { id: "singleton", ...DEFAULT_SITE_CONTENT, supportContent: parsed.data },
  });

  revalidatePath("/researcher/settings/content");
  revalidatePath("/support");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Terms page
// ---------------------------------------------------------------------------

const termsContentSchema = z.object({
  pageTitle: z.string().min(1),
  heroEyebrow: z.string().min(1),
  heroTitle: z.string().min(1),
  heroSubtext: z.string().min(1),
  heroBadges: z.array(z.string().min(1)),
  section1Eyebrow: z.string().min(1),
  section1Title: z.string().min(1),
  section1Description: z.string().min(1),
  summaryItems: z.array(z.string().min(1)),
  section2Eyebrow: z.string().min(1),
  section2Title: z.string().min(1),
  section2Description: z.string().min(1),
  infoWeUse: z.array(iconLabelSchema),
  safetyNoticeEyebrow: z.string().min(1),
  safetyNoticeTitle: z.string().min(1),
  safetyNoticeDescription: z.string().min(1),
  neverCollect: z.array(z.string().min(1)),
  section4Eyebrow: z.string().min(1),
  section4Title: z.string().min(1),
  section4Description: z.string().min(1),
  sampleResponseCode: z.string().min(1),
  ctaTitle: z.string().min(1),
  ctaDescription: z.string().min(1),
});

export type TermsContentValues = z.infer<typeof termsContentSchema>;

export async function updateTermsContent(values: TermsContentValues): Promise<{ error: string } | { ok: true }> {
  try {
    await requireResearcher();
  } catch (err) {
    return handleAuthError(err);
  }

  const parsed = termsContentSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: { termsContent: parsed.data },
    create: { id: "singleton", ...DEFAULT_SITE_CONTENT, termsContent: parsed.data },
  });

  revalidatePath("/researcher/settings/content");
  revalidatePath("/terms");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Debrief page
// ---------------------------------------------------------------------------

const debriefContentSchema = z.object({
  heroLabel: z.string().min(1),
  title: z.string().min(1),
  introParagraph: z.string().min(1),
  simulatedElementsTitle: z.string().min(1),
  simulatedElements: z.array(z.string().min(1)),
  dataUsageTitle: z.string().min(1),
  dataUsageParagraph: z.string().min(1),
  choiceTitle: z.string().min(1),
  choiceParagraph: z.string().min(1),
  grantedMessage: z.string().min(1),
  declinedMessage: z.string().min(1),
  footerContactText: z.string().min(1),
});

export type DebriefContentValues = z.infer<typeof debriefContentSchema>;

export async function updateDebriefContent(values: DebriefContentValues): Promise<{ error: string } | { ok: true }> {
  try {
    await requireResearcher();
  } catch (err) {
    return handleAuthError(err);
  }

  const parsed = debriefContentSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: { debriefContent: parsed.data },
    create: { id: "singleton", ...DEFAULT_SITE_CONTENT, debriefContent: parsed.data },
  });

  revalidatePath("/researcher/settings/content");
  revalidatePath("/debrief");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Entry-received page
// ---------------------------------------------------------------------------

const entryReceivedContentSchema = z.object({
  badgeText: z.string().min(1),
  title: z.string().min(1),
  subtext: z.string().min(1),
  resultLabel: z.string().min(1),
  resultCaption: z.string().min(1),
  submittedDetailsLabel: z.string().min(1),
  trustItems: z.array(z.string().min(1)),
});

export type EntryReceivedContentValues = z.infer<typeof entryReceivedContentSchema>;

export async function updateEntryReceivedContent(
  values: EntryReceivedContentValues,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireResearcher();
  } catch (err) {
    return handleAuthError(err);
  }

  const parsed = entryReceivedContentSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: { entryReceivedContent: parsed.data },
    create: { id: "singleton", ...DEFAULT_SITE_CONTENT, entryReceivedContent: parsed.data },
  });

  revalidatePath("/researcher/settings/content");
  revalidatePath("/entry/received");
  return { ok: true };
}
