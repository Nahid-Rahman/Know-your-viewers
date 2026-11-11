"use client";

import type { CSSProperties } from "react";

// Confetti pieces fly out from the card's centre. Angles/distances are fixed
// (not random) so server and client markup always match.
const CONFETTI = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2;
  const dist = 140 + ((i * 37) % 90);
  return {
    x: Math.round(Math.cos(angle) * dist * 1.6),
    y: Math.round(Math.sin(angle) * dist),
    rot: (i * 47) % 360,
    color: ["var(--primary)", "var(--green)", "var(--purple)", "var(--blue)", "#facc15"][i % 5],
    delay: (i % 6) * 40,
    round: i % 3 === 0,
  };
});

/** Celebratory highlight shown once the reel lands on the server-chosen item. */
export function ResultReveal({ label, headline }: { label: string; headline: string }) {
  return (
    <div className="relative mx-auto mt-8 w-full max-w-md animate-result-pop" role="status">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className={`absolute h-2.5 w-1.5 animate-confetti ${c.round ? "rounded-full" : "rounded-[2px]"}`}
            style={
              {
                background: c.color,
                animationDelay: `${c.delay}ms`,
                "--cx": `${c.x}px`,
                "--cy": `${c.y}px`,
                "--cr": `${c.rot + 540}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Rotating conic glow border */}
      <div className="relative overflow-hidden rounded-3xl p-[2px] shadow-[0_0_60px_-10px_var(--green)]">
        <div
          aria-hidden
          className="absolute -inset-[60%] animate-spin-fast"
          style={{ background: "conic-gradient(from 0deg, var(--green), var(--primary), #facc15, var(--purple), var(--green))" }}
        />
        <div className="relative rounded-[calc(1.5rem-2px)] bg-card px-6 py-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-60"
            style={{ background: "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--green), transparent 70%), transparent 70%)" }}
          />
          <p className="relative text-xs font-black tracking-[0.3em] text-accent-green uppercase">🎉 You landed 🎉</p>
          <p className="relative mt-2 animate-shine bg-[linear-gradient(110deg,var(--green)_20%,#fef08a_40%,var(--green)_60%)] bg-[length:250%_100%] bg-clip-text font-display text-4xl font-black text-transparent sm:text-5xl">
            {label}
          </p>
          <p className="relative mt-3 text-sm font-semibold text-foreground">{headline}</p>
        </div>
      </div>
    </div>
  );
}
