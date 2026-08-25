"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { cn } from "@/lib/utils";
import { gameCategories } from "@/features/stimulus/config";

export function CategoriesSection() {
  const [active, setActive] = useState(0);
  const count = gameCategories.length;

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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {gameCategories.map((cat, i) => (
          <div
            key={cat.title}
            className={cn(
              "card-border rounded-xl p-5 transition-shadow",
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

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Previous category"
          onClick={() => setActive((a) => (a - 1 + count) % count)}
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
              onClick={() => setActive(i)}
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
          onClick={() => setActive((a) => (a + 1) % count)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </section>
  );
}
