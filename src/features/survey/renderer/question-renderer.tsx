"use client";

import type { SurveyQuestion } from "@/types/survey";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LightTextarea } from "@/components/common/light-field";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

/**
 * Single renderer switching on QuestionType, reused by both the live
 * participant survey and (from Phase 6) the researcher's survey preview.
 */
export function QuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
}) {
  switch (question.questionType) {
    case "MULTIPLE_CHOICE":
    case "LIKERT":
      return (
        <RadioGroup
          value={typeof value === "string" ? value : undefined}
          onValueChange={onChange}
          className="gap-2"
        >
          {question.options?.map((opt) => (
            <label
              key={opt}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3.5 py-2.5 text-sm transition-colors hover:bg-secondary/50",
                value === opt && "border-primary/50 bg-primary/10",
              )}
            >
              <RadioGroupItem value={opt} />
              {opt}
            </label>
          ))}
        </RadioGroup>
      );

    case "RATING":
      return (
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Rate ${n}`}
              onClick={() => onChange(n)}
              className="p-1"
            >
              <Star
                className={cn(
                  "size-7 transition-colors",
                  typeof value === "number" && value >= n
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
      );

    case "TEXT":
      return (
        <LightTextarea
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
        />
      );

    default:
      return null;
  }
}
