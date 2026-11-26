"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitFavoriteGame } from "@/lib/actions/study-public";
import { cn } from "@/lib/utils";

/**
 * Optional one-tap poll on the confirmation page. Shown after the entry is
 * already saved, so skipping it changes nothing about the entry.
 */
export function FavoriteGamePoll({
  submissionId,
  choices,
  initialAnswer,
}: {
  submissionId: string;
  choices: string[];
  initialAnswer: string | null;
}) {
  const [answer, setAnswer] = useState<string | null>(initialAnswer);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function choose(choice: string) {
    if (answer || pending) return;
    setPending(choice);
    setError(null);
    startTransition(async () => {
      const res = await submitFavoriteGame({ submissionId, choice }).catch(() => null);
      setPending(null);
      if (res?.ok) setAnswer(res.choice);
      else setError(res?.error ?? "Couldn't save that — please try again.");
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-border p-4">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Quick poll · optional</p>
      {answer ? (
        <p className="mt-2 flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-accent-green" aria-hidden />
          <span>
            Thanks! You picked <span className="font-semibold">{answer}</span>.
          </span>
        </p>
      ) : (
        <>
          <p id="favorite-game-question" className="mt-2 text-sm font-medium">
            Which game are you most excited about right now?
          </p>
          <div role="group" aria-labelledby="favorite-game-question" className="mt-3 flex flex-wrap gap-2">
            {choices.map((c) => (
              <button
                key={c}
                type="button"
                disabled={pending !== null}
                onClick={() => choose(c)}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/60 hover:text-foreground disabled:opacity-60",
                  pending === c ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {error ?? "Your entry is already saved. Answering is optional and does not affect the draw."}
          </p>
        </>
      )}
    </div>
  );
}
