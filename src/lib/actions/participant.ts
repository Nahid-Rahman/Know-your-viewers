"use server";

// LEGACY participant actions (pre-revision factorial flow). New visitors never
// get a legacy participant cookie; these remain so existing legacy browsers
// can finish the on-page debrief and optional survey. The legacy entry
// submission action was removed with the old landing page.

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PARTICIPANT_COOKIE } from "@/lib/participant";

async function getLegacyParticipant() {
  const id = (await cookies()).get(PARTICIPANT_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return prisma.participant.findUnique({ where: { id }, select: { id: true, experimentId: true } });
}

/** Page-view telemetry for the legacy debrief/survey pages only — no client-chosen type or metadata. */
export async function logEngagementEvent(page: "debrief" | "survey"): Promise<void> {
  const participant = await getLegacyParticipant();
  if (!participant || (page !== "debrief" && page !== "survey")) return;
  await prisma.engagementEvent.create({ data: { participantId: participant.id, type: "PAGE_VIEW", page } }).catch(() => {});
}

/**
 * Records the legacy on-page debrief answer ONCE. A recorded answer can't be
 * flipped from the page (that previously let a "No" — which deletes contact
 * data — be followed by a silent "Yes"); later changes go through the
 * research team. Declining removes the contact row, the participant's
 * support-request contact text, and selected-option values in events.
 */
export async function submitDebrief(permissionGiven: boolean): Promise<{ error: string } | { ok: true }> {
  const participant = await getLegacyParticipant();
  if (!participant) return { error: "Your session expired." };
  if (typeof permissionGiven !== "boolean") return { error: "Invalid answer." };

  const existing = await prisma.debrief.findUnique({ where: { participantId: participant.id } });
  if (existing?.permissionGiven !== null && existing?.permissionGiven !== undefined) {
    return { error: "Your answer was already recorded. To change it, contact the research team via the support page." };
  }

  const consentVersion = process.env.CONSENT_VERSION ?? "1.0";
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.debrief.upsert({
      where: { participantId: participant.id },
      update: { explanationShown: true, permissionGiven, debriefStatus: permissionGiven ? "ACKNOWLEDGED" : "DECLINED", timestamp: now },
      create: { participantId: participant.id, explanationShown: true, permissionGiven, debriefStatus: permissionGiven ? "ACKNOWLEDGED" : "DECLINED" },
    });
    await tx.consent.upsert({
      where: { participantId: participant.id },
      update: { consentGiven: permissionGiven, consentVersion, timestamp: now },
      create: { participantId: participant.id, consentGiven: permissionGiven, consentVersion },
    });
    await tx.participant.update({ where: { id: participant.id }, data: { consentStatus: permissionGiven ? "GRANTED" : "DECLINED" } });
    if (!permissionGiven) {
      await tx.participantContact.deleteMany({ where: { participantId: participant.id } });
      await tx.supportRequest.updateMany({
        where: { participantId: participant.id },
        data: { emailOrPhone: null, message: null, streamNickname: null, encryptedContact: null, encryptedMessage: null, encryptedNickname: null, purgedAt: now },
      });
      await tx.engagementEvent.updateMany({ where: { participantId: participant.id, eventValue: { not: null } }, data: { eventValue: null } });
    }
    await tx.engagementEvent.create({ data: { participantId: participant.id, type: "STUDY_COMPLETED", page: "debrief" } });
  });
  return { ok: true };
}

/** The survey (if any) of the legacy participant's own experiment. */
export async function getNextSurveyId(): Promise<string | null> {
  const participant = await getLegacyParticipant();
  if (!participant) return null;
  const survey = await prisma.survey.findFirst({ where: { experimentId: participant.experimentId } });
  return survey?.id ?? null;
}

export async function submitSurveyResponse(
  surveyId: string,
  answers: Record<string, string | number>,
): Promise<{ error: string } | { ok: true }> {
  const participant = await getLegacyParticipant();
  if (!participant) return { error: "Your session expired." };

  // The survey must belong to this participant's own experiment, and only its
  // own question ids are stored (bounded size).
  const survey = await prisma.survey.findFirst({
    where: { id: String(surveyId), experimentId: participant.experimentId },
    include: { questions: { select: { id: true } } },
  });
  if (!survey) return { error: "Survey not found." };
  const allowed = new Set(survey.questions.map((q) => q.id));
  const clean: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(answers ?? {})) {
    if (!allowed.has(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) clean[k] = v;
    else if (typeof v === "string") clean[k] = v.slice(0, 2000);
  }

  await prisma.response.upsert({
    where: { surveyId_participantId: { surveyId: survey.id, participantId: participant.id } },
    update: { answers: clean },
    create: { surveyId: survey.id, participantId: participant.id, answers: clean },
  });
  await prisma.engagementEvent
    .create({ data: { participantId: participant.id, type: "SURVEY_SUBMITTED", page: "survey", eventValue: survey.id } })
    .catch(() => {});
  return { ok: true };
}
