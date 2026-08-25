/**
 * Stimulus configuration — every persuasion element the participant sees is
 * driven from here rather than hardcoded in components, so a research
 * `Condition` (see prisma schema, Phase 4) can toggle it per assignment.
 *
 * Text and reward-pool values below are copied verbatim from the deployed
 * reference (livedrop-arena.vercel.app), not re-authored.
 */
export type StimulusConfig = {
  siteName: string;
  countdownSeconds: number;
  claimedCount: string;
  urgencyEnabled: boolean;
  socialProofEnabled: boolean;
  authorityBadgesEnabled: boolean;
};

export const defaultStimulusConfig: StimulusConfig = {
  siteName: "LiveDrop Arena",
  countdownSeconds: 23 * 3600 + 48 * 60 + 21,
  claimedCount: "247,000+",
  urgencyEnabled: true,
  socialProofEnabled: true,
  authorityBadgesEnabled: true,
};

export const gameCategories = [
  {
    tag: "ACTIVE POOL",
    title: "Valorant-style Tactical FPS",
    description: "Fast paced competitive shooter category.",
  },
  {
    tag: "MOBILE POOL",
    title: "PUBG Mobile Battle Royale",
    description: "Survival drop category for mobile viewers.",
  },
  {
    tag: "MOBILE POOL",
    title: "COD Mobile FPS",
    description: "Action shooter category for livestream viewers.",
  },
];

export const rewardPool = [
  { label: "Bonus Credit Token", sub: "Digital", rarity: "rare" as const },
  { label: "Bonus Entry", sub: "1 Extra", rarity: "common" as const },
  { label: "Viewer Drop", sub: "Selected", rarity: "exceptional" as const },
  { label: "Cosmetic Voucher", sub: "Digital", rarity: "common" as const },
  { label: "RGT 100 Credit", sub: "Premium", rarity: "exceptional" as const },
  { label: "Mystery Booster", sub: "Random", rarity: "rare" as const },
  { label: "Shoutout Entry", sub: "Community", rarity: "common" as const },
  { label: "Mystery Viewer Drop", sub: "Auto-generated", rarity: "exceptional" as const },
];

export const gameTypeOptions = [
  "Valorant-style Tactical FPS",
  "PUBG Mobile Battle Royale",
  "COD Mobile FPS",
  "Other",
];

export const watchFrequencyOptions = ["Daily", "A few times a week", "Weekly", "Occasionally", "Rarely"];

export const faqItems = [
  {
    q: "Is this really free?",
    a: "Yes. Every viewer drop entry is part of a community reward event. No payment is requested or needed at any step.",
  },
  {
    q: "Do I need to share my password?",
    a: "No. LiveDrop Arena never asks for a password, OTP, or account login of any kind.",
  },
  {
    q: "How often can I spin?",
    a: "One viewer entry can be submitted per event window through the event form.",
  },
  {
    q: "How are rewards delivered?",
    a: "Reward results are saved with your entry. The team may contact you using your provided email or phone number.",
  },
  {
    q: "What if I do not get the reward I wanted?",
    a: "Reward results are randomised. Final reward processing may depend on campaign rules and verification.",
  },
];
