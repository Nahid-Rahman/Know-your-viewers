"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { cn } from "@/lib/utils";

// The carousel advances one card every 3 seconds. Hovering does not pause it;
// a click or swipe only restarts the 3-second count from that card.
const AUTO_SCROLL_INTERVAL_MS = 3000;
// How often the auto-advance timer checks whether the interval has elapsed.
const TICK_MS = 100;
// How long scrolling must be idle before we treat it as settled and, if it
// ended on a cloned copy, quietly jump back to the matching real card.
const SETTLE_DELAY_MS = 150;

type GameCategory = { icon: string; image: string; tag: string; title: string; description: string };

function CategoryCoverArt({ icon, image, title }: { icon: string; image: string; title: string }) {
  return (
    <div className="relative h-52 overflow-hidden sm:h-56">
      <Image
        src={image}
        alt={title}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <span className="absolute right-2 bottom-2 text-3xl drop-shadow-lg">{icon}</span>
    </div>
  );
}

/**
 * Infinite, centre-mode carousel. The cards are rendered three times
 * (clone set, real set, clone set); the card in the middle of the track is
 * the highlighted one. Whenever scrolling settles on a clone, the track jumps
 * instantly by one set width to the identical real card, so it can keep going
 * in either direction forever without ever showing an empty edge.
 */
export function CategoriesSection({ gameCategories }: { gameCategories: GameCategory[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const count = gameCategories.length;
  const looping = count > 1;
  const copies = looping ? 3 : 1;
  // First slot of the real (middle) set.
  const realStart = looping ? count : 0;

  // Index into gameCategories of the card in the middle — drives highlight + dots.
  const [active, setActive] = useState(0);
  // Slot (index across all rendered copies) currently in the middle.
  const slotRef = useRef(realStart);
  // When the carousel last moved (auto or manual) — a ref so updating it
  // doesn't cause re-renders.
  const lastMoveRef = useRef(0);

  function cardsOf(track: HTMLElement) {
    return Array.from(track.querySelectorAll<HTMLElement>("[data-category-card]"));
  }

  function centreOffset(track: HTMLElement, card: HTMLElement) {
    return card.offsetLeft - track.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2;
  }

  // Scroll so the card at the given slot sits in the middle of the track.
  function scrollToSlot(slot: number, behavior: ScrollBehavior = "smooth") {
    const track = trackRef.current;
    const card = track ? cardsOf(track)[slot] : undefined;
    if (!track || !card) return;
    slotRef.current = slot;
    setActive(slot % count);
    track.scrollTo({ left: centreOffset(track, card), behavior });
  }

  function go(delta: number) {
    scrollToSlot(slotRef.current + delta);
  }

  // Jump to category `index`, staying within the copy currently in view.
  function goToCategory(index: number) {
    const slot = slotRef.current;
    scrollToSlot(slot - (slot % count) + index);
  }

  function restartTimer() {
    // Only ever invoked from event handlers/effects, never during render —
    // safe despite the impure-call lint rule being conservative here.
    // eslint-disable-next-line react-hooks/purity
    lastMoveRef.current = Date.now();
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Open on the first real card, with clones filling the left side.
    const first = cardsOf(track)[realStart];
    if (first) track.scrollTo({ left: centreOffset(track, first), behavior: "instant" });

    let frame: number | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    // If we came to rest on a clone, shift by exactly one set width so the
    // identical real card is in the middle — visually a no-op.
    function recentre() {
      const t = trackRef.current;
      if (!t || !looping) return;
      const cards = cardsOf(t);
      const slot = slotRef.current;
      if (slot >= count && slot < 2 * count) return;
      const setWidth = cards[count].offsetLeft - cards[0].offsetLeft;
      const shift = slot < count ? count : -count;
      t.scrollTo({ left: t.scrollLeft + (shift > 0 ? setWidth : -setWidth), behavior: "instant" });
      slotRef.current = slot + shift;
    }

    // Track whichever card is in the middle, including during manual
    // swipe/drag/wheel scrolling.
    function onScroll() {
      if (settleTimer !== null) clearTimeout(settleTimer);
      settleTimer = setTimeout(recentre, SETTLE_DELAY_MS);
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const t = trackRef.current;
        if (!t) return;
        const middle = t.scrollLeft + t.clientWidth / 2;
        let closest = 0;
        let closestDist = Infinity;
        cardsOf(t).forEach((el, i) => {
          const dist = Math.abs(el.offsetLeft - t.offsetLeft + el.offsetWidth / 2 - middle);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        slotRef.current = closest;
        setActive(closest % count);
      });
    }

    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("pointerdown", restartTimer);
    return () => {
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("pointerdown", restartTimer);
      if (frame !== null) cancelAnimationFrame(frame);
      if (settleTimer !== null) clearTimeout(settleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // Auto-advance one card at a time, skipped for prefers-reduced-motion and
  // restarted from zero after a click or swipe (hover has no effect).
  useEffect(() => {
    if (!looping) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    restartTimer();
    const id = setInterval(() => {
      if (Date.now() - lastMoveRef.current < AUTO_SCROLL_INTERVAL_MS) return;
      restartTimer();
      go(1);
    }, TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const slots = Array.from({ length: copies }, (_, copy) =>
    gameCategories.map((cat, i) => ({ cat, i, copy })),
  ).flat();

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
        className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2"
      >
        {slots.map(({ cat, i, copy }) => {
          const isClone = looping && copy !== 1;
          return (
            <div
              key={`${copy}-${cat.title}`}
              data-category-card
              aria-hidden={isClone || undefined}
              className={cn(
                "card-border w-72 shrink-0 snap-center overflow-hidden rounded-xl transition-shadow sm:w-[calc((100%-2.5rem)/2)] lg:w-[calc((100%-5rem)/3)]",
                i === active && "ring-1 ring-purple/40",
              )}
            >
              <div className="relative">
                <CategoryCoverArt icon={cat.icon} image={cat.image} title={cat.title} />
                <span className="absolute top-2 left-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase backdrop-blur-sm">
                  {cat.tag}
                </span>
              </div>
              <div className="p-5">
                <p className="font-display font-bold">{cat.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{cat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {looping && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="Previous category"
            onClick={() => {
              restartTimer();
              go(-1);
            }}
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
                  restartTimer();
                  goToCategory(i);
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
            onClick={() => {
              restartTimer();
              go(1);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </section>
  );
}
