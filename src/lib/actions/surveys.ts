"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireRole, AuthError } from "@/lib/auth";

async function requireOwnedExperiment(experimentId: string) {
  const researcher = await requireRole("RESEARCHER");
  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
  if (!experiment || experiment.researcherId !== researcher.id) {
    throw new AuthError("Experiment not found.");
  }
  return experiment;
}

async function requireOwnedSurvey(surveyId: string) {
  const researcher = await requireRole("RESEARCHER");
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { experiment: { select: { researcherId: true } } },
  });
  if (!survey || survey.experiment.researcherId !== researcher.id) {
    throw new AuthError("Survey not found.");
  }
  return survey;
}

const surveySchema = z.object({
  title: z.string().min(2, "Give the survey a title."),
  description: z.string().optional(),
});

export type SurveyFormValues = z.infer<typeof surveySchema>;

export async function createSurvey(
  experimentId: string,
  values: SurveyFormValues,
): Promise<{ error: string } | { ok: true; surveyId: string }> {
  try {
    await requireOwnedExperiment(experimentId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const parsed = surveySchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const survey = await prisma.survey.create({
    data: { experimentId, title: parsed.data.title, description: parsed.data.description || null },
  });
  revalidatePath(`/researcher/experiments/${experimentId}/surveys`);
  return { ok: true, surveyId: survey.id };
}

export async function updateSurvey(
  surveyId: string,
  values: SurveyFormValues,
): Promise<{ error: string } | { ok: true }> {
  let survey;
  try {
    survey = await requireOwnedSurvey(surveyId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const parsed = surveySchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  await prisma.survey.update({
    where: { id: surveyId },
    data: { title: parsed.data.title, description: parsed.data.description || null },
  });
  revalidatePath(`/researcher/experiments/${survey.experimentId}/surveys`);
  return { ok: true };
}

export async function deleteSurvey(surveyId: string): Promise<{ error: string } | { ok: true }> {
  let survey;
  try {
    survey = await requireOwnedSurvey(surveyId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.survey.delete({ where: { id: surveyId } });
  revalidatePath(`/researcher/experiments/${survey.experimentId}/surveys`);
  return { ok: true };
}

const questionSchema = z.object({
  questionText: z.string().min(2, "Enter the question text."),
  questionType: z.enum(["MULTIPLE_CHOICE", "LIKERT", "RATING", "TEXT"]),
  options: z.array(z.string().min(1)).optional(),
  order: z.coerce.number().int().min(1),
});

export type QuestionFormValues = z.infer<typeof questionSchema>;

async function requireOwnedQuestion(questionId: string) {
  const researcher = await requireRole("RESEARCHER");
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { survey: { select: { experimentId: true, experiment: { select: { researcherId: true } } } } },
  });
  if (!question || question.survey.experiment.researcherId !== researcher.id) {
    throw new AuthError("Question not found.");
  }
  return question;
}

export async function createQuestion(
  surveyId: string,
  values: QuestionFormValues,
): Promise<{ error: string } | { ok: true }> {
  let survey;
  try {
    survey = await requireOwnedSurvey(surveyId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const parsed = questionSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };
  const needsOptions = parsed.data.questionType === "MULTIPLE_CHOICE" || parsed.data.questionType === "LIKERT";

  await prisma.question.create({
    data: {
      surveyId,
      questionText: parsed.data.questionText,
      questionType: parsed.data.questionType,
      options: needsOptions ? parsed.data.options ?? [] : undefined,
      order: parsed.data.order,
    },
  });
  revalidatePath(`/researcher/experiments/${survey.experimentId}/surveys`);
  return { ok: true };
}

export async function updateQuestion(
  questionId: string,
  values: QuestionFormValues,
): Promise<{ error: string } | { ok: true }> {
  let question;
  try {
    question = await requireOwnedQuestion(questionId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const parsed = questionSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };
  const needsOptions = parsed.data.questionType === "MULTIPLE_CHOICE" || parsed.data.questionType === "LIKERT";

  await prisma.question.update({
    where: { id: questionId },
    data: {
      questionText: parsed.data.questionText,
      questionType: parsed.data.questionType,
      options: needsOptions ? parsed.data.options ?? [] : Prisma.JsonNull,
      order: parsed.data.order,
    },
  });
  revalidatePath(`/researcher/experiments/${question.survey.experimentId}/surveys`);
  return { ok: true };
}

export async function deleteQuestion(questionId: string): Promise<{ error: string } | { ok: true }> {
  let question;
  try {
    question = await requireOwnedQuestion(questionId);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.question.delete({ where: { id: questionId } });
  revalidatePath(`/researcher/experiments/${question.survey.experimentId}/surveys`);
  return { ok: true };
}
