"use client";

import Link from "next/link";
import { ClipboardList, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDeleteButton } from "@/components/common/confirm-delete-button";
import { SurveyFormDialog } from "@/features/survey/survey-form-dialog";
import { QuestionFormDialog } from "@/features/survey/question-form-dialog";
import { deleteSurvey, deleteQuestion } from "@/lib/actions/surveys";

type QuestionRow = {
  id: string;
  questionText: string;
  questionType: string;
  options: string[] | null;
  order: number;
};

type SurveyRow = {
  id: string;
  title: string;
  description: string | null;
  questions: QuestionRow[];
};

export function SurveyManager({ experimentId, surveys }: { experimentId: string; surveys: SurveyRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SurveyFormDialog experimentId={experimentId} trigger={<Button size="sm">New Survey</Button>} />
      </div>

      {surveys.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="No survey configured"
          description="Add a post-study survey participants see after the debrief."
        />
      ) : (
        surveys.map((survey) => (
          <div key={survey.id} className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent-cyan/10 text-accent-cyan">
                  <ClipboardList className="size-4" />
                </span>
                <div>
                  <p className="font-semibold">{survey.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {survey.questions.length} questions &bull; shown after debrief
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/survey/${survey.id}`}
                  target="_blank"
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Preview
                  <ExternalLink className="size-3.5" />
                </Link>
                <SurveyFormDialog
                  experimentId={experimentId}
                  survey={{ id: survey.id, title: survey.title, description: survey.description ?? "" }}
                  trigger={<Button variant="ghost" size="sm">Edit</Button>}
                />
                <ConfirmDeleteButton
                  confirmDescription={`Delete "${survey.title}"? This removes every question and recorded response for this survey.`}
                  onConfirm={() => deleteSurvey(survey.id)}
                />
              </div>
            </div>
            <div className="divide-y divide-border">
              {survey.questions.map((q, i) => (
                <div key={q.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{q.questionText}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {q.questionType.replace("_", " ").toLowerCase()}
                        {q.options ? ` · ${q.options.length} options` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <QuestionFormDialog
                      surveyId={survey.id}
                      question={q}
                      nextOrder={survey.questions.length + 1}
                      trigger={<Button variant="ghost" size="sm">Edit</Button>}
                    />
                    <ConfirmDeleteButton
                      confirmDescription="Delete this question? Any recorded answers to it remain in past responses but it will no longer be shown."
                      onConfirm={() => deleteQuestion(q.id)}
                    />
                  </div>
                </div>
              ))}
              <div className="p-4">
                <QuestionFormDialog
                  surveyId={survey.id}
                  nextOrder={survey.questions.length + 1}
                  trigger={
                    <Button variant="outline" size="sm">
                      Add Question
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
