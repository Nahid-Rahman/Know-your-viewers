import { notFound } from "next/navigation";
import { SurveyManager } from "@/features/survey/survey-manager";
import { getExperimentById, getSurveysForExperiment } from "@/lib/queries/research";

export default async function SurveysPage({
  params,
}: PageProps<"/researcher/experiments/[id]/surveys">) {
  const { id } = await params;
  const experiment = await getExperimentById(id);
  if (!experiment) notFound();

  const surveys = await getSurveysForExperiment(id);

  return (
    <SurveyManager
      experimentId={id}
      surveys={surveys.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        questions: s.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: (q.options as string[] | null) ?? null,
          order: q.order,
        })),
      }))}
    />
  );
}
