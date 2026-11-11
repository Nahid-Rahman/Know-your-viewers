// Session reward configuration (stored per SessionConfig snapshot) and the
// server-side spin selection. Pure module — the client only ever receives
// the display items and the already-chosen result.
//
// The spin ALWAYS lands on the bKash reward. This is enforced three ways:
// the schema rejects any config without it, parseRewardConfig falls back to
// the default (which lands on it), and selectSpinResult ignores everything
// else and returns the bKash item.

import { z } from "zod";

export const BKASH_REWARD_KEY = "bkash_reward";

export const rewardItemSchema = z.object({
  key: z.string().trim().min(1).max(40).regex(/^[a-z0-9_-]+$/, "Use lowercase letters, digits, - or _"),
  label: z.string().trim().min(1).max(60),
  sub: z.string().trim().max(40).default(""),
  tier: z.enum(["common", "rare", "exceptional", "premium"]).default("common"),
});

export const rewardConfigSchema = z
  .object({
    // Always FIXED on the bKash reward (recorded as FIXED, never described as random).
    mechanism: z.literal("FIXED"),
    displayItems: z.array(rewardItemSchema).min(1).max(12),
    fixedResultKey: z.literal(BKASH_REWARD_KEY),
    resultHeadline: z.string().trim().min(1).max(120),
    resultExplanation: z.string().trim().min(1).max(600),
  })
  .superRefine((v, ctx) => {
    const keys = new Set(v.displayItems.map((i) => i.key));
    if (keys.size !== v.displayItems.length) ctx.addIssue({ code: "custom", message: "Item keys must be unique." });
    if (!keys.has(BKASH_REWARD_KEY)) {
      ctx.addIssue({ code: "custom", message: `The wheel must include the bKash reward item (key "${BKASH_REWARD_KEY}").` });
    }
  });

export type RewardConfig = z.infer<typeof rewardConfigSchema>;
export type RewardItem = z.infer<typeof rewardItemSchema>;

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  mechanism: "FIXED",
  displayItems: [
    { key: BKASH_REWARD_KEY, label: "bKash Reward", sub: "Cash to your bKash", tier: "premium" },
    { key: "gift_card", label: "Gift Card", sub: "Digital voucher", tier: "rare" },
    { key: "battle_pass", label: "Battle Pass", sub: "Season pass", tier: "exceptional" },
    { key: "in_game_skin", label: "In-Game Skin", sub: "Cosmetic", tier: "rare" },
    { key: "in_game_currency", label: "In-Game Currency", sub: "Top-up", tier: "common" },
    { key: "gaming_mouse", label: "Gaming Mouse", sub: "Gear", tier: "exceptional" },
    { key: "rgb_mouse_pad", label: "RGB Mouse Pad", sub: "Gear", tier: "common" },
    { key: "earbuds", label: "Earbuds", sub: "Audio", tier: "rare" },
    { key: "1v1_me", label: "1v1 Me!", sub: "Face the streamer", tier: "exceptional" },
    { key: "party_up", label: "Party Up with Me!", sub: "Squad with the streamer", tier: "premium" },
  ],
  fixedResultKey: BKASH_REWARD_KEY,
  resultHeadline: "You landed the bKash Reward!",
  resultExplanation:
    "Submitting this form enters you into a random draw for a bKash reward, held after the session ends. Not every entrant wins — selected winners receive the reward on their bKash number. We will never ask for your bKash PIN, OTP or password.",
};

export function parseRewardConfig(value: unknown): RewardConfig {
  const parsed = rewardConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_REWARD_CONFIG;
}

/**
 * Server-authoritative outcome: always the bKash reward. No randomness is involved.
 */
export function selectSpinResult(config: RewardConfig): { item: RewardItem; mechanism: "FIXED" } {
  const item =
    config.displayItems.find((i) => i.key === BKASH_REWARD_KEY) ??
    DEFAULT_REWARD_CONFIG.displayItems.find((i) => i.key === BKASH_REWARD_KEY)!;
  return { item, mechanism: "FIXED" };
}
