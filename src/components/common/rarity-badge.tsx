import { cn } from "@/lib/utils";

export type Rarity = "common" | "rare" | "exceptional" | "premium";

// Exact mapping from the reference site: COMMON=blue, RARE=purple,
// EXCEPTIONAL=primary red, PREMIUM=green.
const RARITY_TEXT: Record<Rarity, string> = {
  common: "text-blue",
  rare: "text-purple",
  exceptional: "text-primary",
  premium: "text-green",
};

export function RarityBadge({
  rarity,
  variant = "plain",
  className,
}: {
  rarity: Rarity;
  variant?: "plain" | "pill";
  className?: string;
}) {
  if (variant === "pill") {
    return (
      <span
        className={cn(
          "rounded-full border border-border px-3 py-1 font-display text-xs font-bold uppercase",
          RARITY_TEXT[rarity],
          className,
        )}
      >
        {rarity}
      </span>
    );
  }

  return (
    <span className={cn("font-display text-[10px] font-bold uppercase", RARITY_TEXT[rarity], className)}>
      {rarity}
    </span>
  );
}
