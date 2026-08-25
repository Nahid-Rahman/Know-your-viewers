import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { requireRoleOrRedirect } from "@/lib/auth";
import { getSiteContent } from "@/lib/queries/research";
import { SiteContentForm } from "@/features/researcher/site-content-form";

export const metadata = { title: "Stimulus Content | LiveDrop Arena" };

const FALLBACK_CONTENT = {
  heroHeadline: "UNLOCK\nYOUR\n**VIEWER DROP**\nTODAY!",
  heroSubtext:
    "Spin the reward roll for a chance to unlock exclusive viewer bonuses before the event closes. Verified event access. No password required.",
  claimedCount: "247,000+",
  countdownSeconds: 23 * 3600 + 48 * 60 + 21,
  trustBadges: [],
  gameCategories: [],
  rewardPool: [] as { label: string; sub: string; rarity: "common" | "rare" | "exceptional" | "premium" }[],
  gameTypeOptions: [],
  watchFrequencyOptions: [],
  faqItems: [],
};

export default async function SiteContentSettingsPage() {
  await requireRoleOrRedirect("RESEARCHER");
  const content = (await getSiteContent()) ?? FALLBACK_CONTENT;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/researcher/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to settings
      </Link>
      <PageHeader
        title="Stimulus Content"
        description="Edit the text shown on the public participant-facing pages — no code changes needed."
      />
      <SiteContentForm content={content} />
    </div>
  );
}
