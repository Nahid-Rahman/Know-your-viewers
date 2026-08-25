import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, ExternalLink } from "lucide-react";
import { postStudySurvey } from "@/features/survey/mock/post-study-survey";
import { getExperimentById } from "@/lib/mock/research";

export default async function SurveysPage({
  params,
}: PageProps<"/researcher/experiments/[id]/surveys">) {
  const { id } = await params;
  const experiment = getExperimentById(id);
  if (!experiment) notFound();

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent-cyan/10 text-accent-cyan">
            <ClipboardList className="size-4" />
          </span>
          <div>
            <p className="font-semibold">{postStudySurvey.title}</p>
            <p className="text-xs text-muted-foreground">
              {postStudySurvey.questions.length} questions &bull; shown after debrief
            </p>
          </div>
        </div>
        <Link
          href="/survey/post-study"
          target="_blank"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Preview
          <ExternalLink className="size-3.5" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {postStudySurvey.questions.map((q, i) => (
          <div key={q.id} className="flex items-start gap-3 p-4">
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
        ))}
      </div>
    </div>
  );
}
