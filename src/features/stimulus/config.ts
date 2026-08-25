import type { Rarity as UiRarity } from "@/components/common/rarity-badge";
import type { ContactRequirement } from "@/generated/prisma/enums";

// The subset of persuasion toggles a research Condition can override per
// participant, plus the two Condition fields with no static analogue.
// Resolved server-side in the landing page from the participant's
// randomly-assigned Condition (src/lib/participant.ts). All other stimulus
// copy (hero text, FAQ, reward pool, trust badges, categories) lives in the
// `SiteContent` table (src/lib/queries/research.ts::getSiteContent) and is
// editable from /researcher/settings/content — this file only holds the
// fallback used when there's no active experiment/condition to assign from.
export type StimulusRuntimeConfig = {
  urgencyEnabled: boolean;
  socialProofEnabled: boolean;
  authorityBadgesEnabled: boolean;
  rewardRarity: UiRarity;
  contactRequirement: ContactRequirement;
};

export const fallbackRuntimeConfig: StimulusRuntimeConfig = {
  urgencyEnabled: true,
  socialProofEnabled: true,
  authorityBadgesEnabled: true,
  rewardRarity: "exceptional",
  contactRequirement: "OPTIONAL",
};
