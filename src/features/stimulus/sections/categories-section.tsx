"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { cn } from "@/lib/utils";

export function CategoriesSection({
  gameCategories,
}: {
  gameCategories: { tag: string; title: string; description: string }[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = gameCategories.length;

  function scrollToIndex(index: number) {
    const track = trackRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
  }

  function go(delta: number) {
    const next = (active + delta + count) % count;
    setActive(next);
    scrollToIndex(next);
  }

  // Keep the dots/highlight in sync with manual swipe/drag/wheel scrolling.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame: number | null = null;
    function onScroll() {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const t = trackRef.current;
        if (!t) return;
        let closest = 0;
        let closestDist = Infinity;
        Array.from(t.children).forEach((child, i) => {
          const el = child as HTMLElement;
          const dist = Math.abs(el.offsetLeft - t.offsetLeft - t.scrollLeft);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        setActive(closest);
      });
    }

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <EyebrowLabel variant="primary" glyph={null} className="mb-4">
          POPULAR DROP POOLS
        </EyebrowLabel>
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Featured Game Categories</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Explore popular livestream gaming categories before spinning for your viewer drop.
        </p>
      </div>

      <div
        ref={trackRef}
        className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
      >
        {gameCategories.map((cat, i) => (
          <div
            key={cat.title}
            className={cn(
              "card-border w-72 shrink-0 snap-start rounded-xl p-5 transition-shadow sm:w-[calc((100%-2.5rem)/2)] lg:w-[calc((100%-5rem)/3)]",
              i === active && "ring-1 ring-purple/40",
            )}
          >
            <div className="mb-3 text-2xl">🎮</div>
            <p className="text-[10px] font-bold tracking-wide text-purple uppercase">{cat.tag}</p>
            <p className="mt-1 font-display font-bold">{cat.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{cat.description}</p>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="Previous category"
            onClick={() => go(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex items-center gap-2">
            {gameCategories.map((cat, i) => (
              <button
                key={cat.title}
                type="button"
                aria-label={`Show ${cat.title}`}
                onClick={() => {
                  setActive(i);
                  scrollToIndex(i);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === active ? "w-6 bg-primary" : "w-1.5 bg-border-strong",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next category"
            onClick={() => go(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </section>
  );
}
