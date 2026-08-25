"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { GlowCard } from "@/components/common/glow-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuestionRenderer } from "@/features/survey/renderer/question-renderer";
import { logEngagementEvent, submitSurveyResponse } from "@/lib/actions/participant";
import type { Survey, SurveyAnswers } from "@/types/survey";

export function SurveyForm({ survey }: { survey: Survey }) {
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void logEngagementEvent("PAGE_VIEW");
  }, []);

  const answeredCount = Object.keys(answers).length;

  async function handleSubmit() {
    setSubmitting(true);
    const result = await submitSurveyResponse(survey.id, answers);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-24 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-accent-green/40 bg-accent-green/10">
          <CheckCircle2 className="size-7 text-accent-green" />
        </div>
        <h1 className="font-display text-2xl font-bold">Thanks for your time.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your responses have been recorded as part of this research study.
        </p>
        <Link href="/" className={cn(buttonVariants(), "mt-6 bg-gradient-primary text-white hover:opacity-90")}>
          Return to the event page
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <EyebrowLabel variant="cyan" className="mb-4">
        Research Survey
      </EyebrowLabel>
      <h1 className="font-display text-3xl font-bold">{survey.title}</h1>
      {survey.description && <p className="mt-2 text-sm text-muted-foreground">{survey.description}</p>}

      <div className="mt-8 space-y-5">
        {survey.questions.map((q) => (
          <GlowCard key={q.id}>
            <p className="mb-3 text-sm font-semibold">{q.questionText}</p>
            <QuestionRenderer
              question={q}
              value={answers[q.id]}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
            />
          </GlowCard>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {answeredCount} of {survey.questions.length} answered
        </p>
        <Button
          className="h-11 bg-gradient-primary px-8 text-white hover:opacity-90"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting..." : "Submit responses"}
        </Button>
      </div>
    </div>
  );
}
