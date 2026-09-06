"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import type {
  InterviewConsentAnswer,
  InterviewCandidateStatus,
  InterviewMode,
  InterviewRecordStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

function revalidateInterviews() {
  revalidatePath("/researcher/outreach/interviews");
  revalidatePath("/researcher/participants");
}

export type InterviewConsentInput = {
  invited?: boolean;
  consent?: InterviewConsentAnswer;
  status?: InterviewCandidateStatus;
  preferredContactTime?: string;
  notes?: string;
};

/** Consent-answer changes auto-derive the candidate status unless the caller also passes an explicit `status`. */
const CONSENT_TO_STATUS: Record<InterviewConsentAnswer, InterviewCandidateStatus | undefined> = {
  YES: "ACCEPTED",
  NO: "DECLINED",
  PENDING: undefined,
};

export async function updateInterviewConsent(
  participantId: string,
  input: InterviewConsentInput,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const data: Prisma.InterviewConsentUpdateInput = {};
  if (input.invited !== undefined) {
    data.invited = input.invited;
    if (input.invited) data.invitedAt = new Date();
  }
  if (input.consent !== undefined) {
    data.consent = input.consent;
    data.consentAt = new Date();
    const derivedStatus = CONSENT_TO_STATUS[input.consent];
    if (derivedStatus && input.status === undefined) data.status = derivedStatus;
  }
  if (input.status !== undefined) data.status = input.status;
  if (input.preferredContactTime !== undefined) data.preferredContactTime = input.preferredContactTime;
  if (input.notes !== undefined) data.notes = input.notes;

  await prisma.interviewConsent.upsert({
    where: { participantId },
    update: data,
    create: {
      participantId,
      invited: input.invited ?? false,
      invitedAt: input.invited ? new Date() : null,
      consent: input.consent ?? "PENDING",
      status: input.status ?? (input.consent ? CONSENT_TO_STATUS[input.consent] : undefined) ?? "NOT_INVITED",
      preferredContactTime: input.preferredContactTime,
      notes: input.notes,
    },
  });
  revalidateInterviews();
  return { ok: true };
}

export type InterviewRecordInput = {
  interviewMode?: InterviewMode | null;
  status?: InterviewRecordStatus;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  summary?: string;
  themes?: string[];
  researcherNotes?: string;
};

const RECORD_STATUS_TO_CANDIDATE_STATUS: Partial<Record<InterviewRecordStatus, InterviewCandidateStatus>> = {
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW",
  CANCELLED: "CANCELLED",
};

function toInterviewData(input: InterviewRecordInput): Prisma.InterviewUpdateInput {
  return {
    ...(input.interviewMode !== undefined ? { interviewMode: input.interviewMode } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null } : {}),
    ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.themes !== undefined ? { themes: input.themes } : {}),
    ...(input.researcherNotes !== undefined ? { researcherNotes: input.researcherNotes } : {}),
  };
}

/** Creates a new interview record — a reschedule is a new row, not an overwrite, so history stays intact. */
export async function createInterviewRecord(
  participantId: string,
  input: InterviewRecordInput,
): Promise<{ error: string } | { ok: true }> {
  let researcher;
  try {
    researcher = await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const status = input.status ?? "SCHEDULED";
  await prisma.$transaction([
    prisma.interview.create({
      data: {
        participantId,
        interviewerId: researcher.id,
        status,
        interviewMode: input.interviewMode ?? null,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        durationMinutes: input.durationMinutes ?? null,
        summary: input.summary ?? null,
        themes: input.themes ?? [],
        researcherNotes: input.researcherNotes ?? null,
      },
    }),
    prisma.interviewConsent.upsert({
      where: { participantId },
      update: { status: RECORD_STATUS_TO_CANDIDATE_STATUS[status] ?? "SCHEDULED" },
      create: {
        participantId,
        invited: true,
        invitedAt: new Date(),
        status: RECORD_STATUS_TO_CANDIDATE_STATUS[status] ?? "SCHEDULED",
      },
    }),
  ]);
  revalidateInterviews();
  return { ok: true };
}

export async function updateInterviewRecord(
  interviewId: string,
  input: InterviewRecordInput,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const interview = await prisma.interview.update({ where: { id: interviewId }, data: toInterviewData(input) });

  const candidateStatus = input.status ? RECORD_STATUS_TO_CANDIDATE_STATUS[input.status] : undefined;
  if (candidateStatus) {
    await prisma.interviewConsent.upsert({
      where: { participantId: interview.participantId },
      update: { status: candidateStatus },
      create: { participantId: interview.participantId, invited: true, invitedAt: new Date(), status: candidateStatus },
    });
  }
  revalidateInterviews();
  return { ok: true };
}
