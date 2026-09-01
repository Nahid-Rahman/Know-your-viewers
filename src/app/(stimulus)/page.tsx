import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PARTICIPANT_COOKIE, toRuntimeConfig } from "@/lib/participant";
import { getSiteContent } from "@/lib/queries/research";
import type { Rarity } from "@/components/common/rarity-badge";
import { HeroSection } from "@/features/stimulus/sections/hero-section";
import { TrustBadgesSection } from "@/features/stimulus/sections/trust-badges-section";
import { CategoriesSection } from "@/features/stimulus/sections/categories-section";
import { RewardRouletteSection } from "@/features/stimulus/sections/reward-roulette-section";
import { HowItWorksSection } from "@/features/stimulus/sections/how-it-works-section";
import { FaqSection } from "@/features/stimulus/sections/faq-section";

const FALLBACK_CONTENT = {
  heroHeadline: "UNLOCK\nYOUR\n**VIEWER DROP**\nTODAY!",
  heroSubtext:
    "Spin the reward roll for a chance to unlock exclusive viewer bonuses before the event closes. Verified event access. No password required.",
  claimedCount: "247,000+",
  countdownSeconds: 23 * 3600 + 48 * 60 + 21,
  trustBadges: [] as { icon: string; title: string; description: string }[],
  gameCategories: [] as { icon: string; tag: string; title: string; description: string }[],
  rewardPool: [] as { label: string; sub: string; rarity: Rarity }[],
  gameTypeOptions: [] as string[],
  watchFrequencyOptions: [] as string[],
  faqItems: [] as { q: string; a: string }[],
};

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const ref = typeof params.ref === "string" ? params.ref : undefined;
  const bootstrapUrl = `/api/bootstrap${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;

  const cookieStore = await cookies();
  const participantId = cookieStore.get(PARTICIPANT_COOKIE)?.value;
  if (!participantId) redirect(bootstrapUrl);

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { condition: true },
  });
  if (!participant) redirect(bootstrapUrl);

  await prisma.engagementEvent.create({ data: { participantId: participant.id, type: "PAGE_VIEW" } });
  const config = toRuntimeConfig(participant.condition);
  const content = (await getSiteContent()) ?? FALLBACK_CONTENT;

  return (
    <>
      <HeroSection config={config} content={content} />
      <TrustBadgesSection badges={content.trustBadges} />
      <CategoriesSection gameCategories={content.gameCategories} />
      <RewardRouletteSection
        config={config}
        rewardPool={content.rewardPool as { label: string; sub: string; rarity: Rarity }[]}
        gameTypeOptions={content.gameTypeOptions}
        watchFrequencyOptions={content.watchFrequencyOptions}
      />
      <HowItWorksSection />
      <FaqSection faqItems={content.faqItems} />
    </>
  );
}
