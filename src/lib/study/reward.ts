// Session reward configuration (stored per SessionConfig snapshot) and the
// server-side spin selection. Pure module — the client only ever receives
// the display items and the already-chosen result.

import { z } from "zod";

export const rewardItemSchema = z.object({
  key: z.string().trim().min(1).max(40).regex(/^[a-z0-9_-]+$/, "Use lowercase letters, digits, - or _"),
  label: z.string().trim().min(1).max(60),
  sub: z.string().trim().max(40).default(""),
  tier: z.enum(["common", "rare", "exceptional", "premium"]).default("common"),
  weight: z.number().int().min(0).max(1000).optional(),
});

export const rewardConfigSchema = z
  .object({
    // FIXED: always lands on fixedResultKey (recorded as FIXED, never described as random).
    // WEIGHTED_RANDOM: secure server-side weighted pick among items with weight > 0.
    mechanism: z.enum(["FIXED", "WEIGHTED_RANDOM"]),
    displayItems: z.array(rewardItemSchema).min(1).max(12),
    fixedResultKey: z.string().optional(),
    resultHeadline: z.string().trim().min(1).max(120),
    resultExplanation: z.string().trim().min(1).max(600),
  })
  .superRefine((v, ctx) => {
    const keys = new Set(v.displayItems.map((i) => i.key));
    if (keys.size !== v.displayItems.length) ctx.addIssue({ code: "custom", message: "Item keys must be unique." });
    if (v.mechanism === "FIXED" && (!v.fixedResultKey || !keys.has(v.fixedResultKey))) {
      ctx.addIssue({ code: "custom", message: "A fixed mechanism needs a result key that matches one item." });
    }
    if (v.mechanism === "WEIGHTED_RANDOM" && !v.displayItems.some((i) => (i.weight ?? 0) > 0)) {
      ctx.addIssue({ code: "custom", message: "A weighted mechanism needs at least one item with weight > 0." });
    }
  });

export type RewardConfig = z.infer<typeof rewardConfigSchema>;
export type RewardItem = z.infer<typeof rewardItemSchema>;

/**
 * Honest default for a new session: the wheel shows only what is actually
 * awarded — a draw entry. Any richer display is a draft to be configured
 * explicitly and is only usable for TEST sessions until REWARD_PRESENTATION
 * is approved.
 */
export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  mechanism: "FIXED",
  displayItems: [{ key: "prize_draw_entry", label: "Prize Draw Entry", sub: "Prize pool", tier: "premium" }],
  fixedResultKey: "prize_draw_entry",
  resultHeadline: "You're entered into the prize draw",
  resultExplanation:
    "Submitting this form enters you into a random draw held after the session ends. Not every entrant wins — selected winners receive a prize from the prize pool. We will never ask for your bKash PIN, OTP or password.",
};

export function parseRewardConfig(value: unknown): RewardConfig {
  const parsed = rewardConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_REWARD_CONFIG;
}

/** Server-authoritative outcome. The server passes crypto.randomInt as `pick`; tests inject their own. */
export function selectSpinResult(
  config: RewardConfig,
  pick: (maxExclusive: number) => number,
): { item: RewardItem; mechanism: RewardConfig["mechanism"] } {
  if (config.mechanism === "FIXED") {
    const item = config.displayItems.find((i) => i.key === config.fixedResultKey) ?? config.displayItems[0];
    return { item, mechanism: "FIXED" };
  }
  const weighted = config.displayItems.filter((i) => (i.weight ?? 0) > 0);
  const total = weighted.reduce((s, i) => s + (i.weight ?? 0), 0);
  let r = pick(total);
  for (const item of weighted) {
    r -= item.weight ?? 0;
    if (r < 0) return { item, mechanism: "WEIGHTED_RANDOM" };
  }
  return { item: weighted[weighted.length - 1], mechanism: "WEIGHTED_RANDOM" };
}
