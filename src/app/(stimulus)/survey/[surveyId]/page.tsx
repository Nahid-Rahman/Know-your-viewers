import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SurveyForm } from "@/features/survey/survey-form";
import type { SurveyQuestion } from "@/types/survey";

export default async function SurveyPage({ params }: PageProps<"/survey/[surveyId]">) {
  const { surveyId } = await params;

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!survey) notFound();

  const questions: SurveyQuestion[] = survey.questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    options: (q.options as string[] | null) ?? undefined,
    order: q.order,
  }));

  return (
    <SurveyForm
      survey={{
        id: survey.id,
        title: survey.title,
        description: survey.description ?? undefined,
        questions,
      }}
    />
  );
}
