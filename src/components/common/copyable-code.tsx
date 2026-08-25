"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyableCode({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — non-fatal
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-1 font-mono text-xs hover:bg-secondary/60",
        className,
      )}
    >
      {value}
      {copied ? <Check className="size-3 text-accent-green" /> : <Copy className="size-3 text-muted-foreground" />}
    </button>
  );
}
