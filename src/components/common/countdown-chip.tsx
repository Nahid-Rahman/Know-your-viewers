"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function format(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/**
 * Simulated countdown for the stimulus condition — duration is config-driven.
 * By default it loops rather than truly expiring (a dead-end "Event closed"
 * state would end the recruitment funnel for no research benefit), but the
 * expired copy/state from the reference design is implemented and reachable
 * by passing expiresAt in the past, for visual parity.
 */
export function CountdownChip({
  durationSeconds,
  expiresAt,
  className,
}: {
  durationSeconds: number;
  expiresAt?: Date;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    if (expiresAt) {
      const tick = () => setRemaining(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)));
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }
    const id = setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? durationSeconds : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [durationSeconds, expiresAt]);

  const closed = expiresAt !== undefined && remaining <= 0;

  return (
    <div className={cn("inline-flex items-center gap-2 text-sm font-semibold", className)}>
      <span aria-hidden>⚡</span>
      <span className="text-muted-foreground">Event closes in</span>
      {closed ? (
        <span className="text-foreground">Event closed</span>
      ) : (
        <span className="font-mono tabular-nums text-foreground">{format(remaining)}</span>
      )}
    </div>
  );
}
