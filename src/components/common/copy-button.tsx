"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Copies `value` to the clipboard and briefly shows "Copied". */
export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the code stays selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : `${label} ${value}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs font-semibold transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
        copied && "border-accent-green/50 text-accent-green",
        className,
      )}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
