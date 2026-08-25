import { cn } from "@/lib/utils";

const VARIANT_CLASSES = {
  primary: "text-primary",
  cyan: "text-blue",
  green: "text-green",
  violet: "text-purple",
  muted: "text-muted-foreground",
} as const;

export type EyebrowVariant = keyof typeof VARIANT_CLASSES;

/**
 * Plain colored label with an optional leading glyph — the reference site
 * renders these as bare text (no pill background or border), each using a
 * different literal unicode glyph as its bullet (●, ◆, 🔒, ◯, ◎ ...).
 */
export function EyebrowLabel({
  children,
  variant = "primary",
  glyph = "●",
  className,
}: {
  children: React.ReactNode;
  variant?: EyebrowVariant;
  glyph?: string | null;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-display text-xs font-semibold",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {glyph && <span className="mr-1.5">{glyph}</span>}
      {children}
    </p>
  );
}
