"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptContact } from "@/lib/crypto";
import { PARTICIPANT_COOKIE } from "@/lib/participant";
import type { EngagementEventType, Rarity } from "@/generated/prisma/enums";

async function getParticipantIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(PARTICIPANT_COOKIE)?.value ?? null;
}

/** Fire-and-forget funnel telemetry from client interactions (spin, modal open, field focus, abandon). */
export async function logEngagementEvent(type: EngagementEventType): Promise<void> {
  const participantId = await getParticipantIdFromCookie();
  if (!participantId) return;
  await prisma.engagementEvent.create({ data: { participantId, type } }).catch(() => {});
}

const entrySchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  streamNickname: z.string().optional(),
  favouriteGameType: z.string().optional(),
  livestreamFrequency: z.string().optional(),
  rewardLabel: z.string(),
  rewardRarity: z.enum(["common", "rare", "exceptional", "premium"]),
});

export type SubmitEntryValues = z.infer<typeof entrySchema>;

export async function submitEntry(
  values: SubmitEntryValues,
): Promise<{ error: string } | { responseCode: string }> {
  const parsed = entrySchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter an email or phone number." };
  }

  const participantId = await getParticipantIdFromCookie();
  if (!participantId) return { error: "Your session expired — please reload the page and spin again." };

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { condition: true },
  });
  if (!participant) return { error: "Your session expired — please reload the page and spin again." };

  const { email, phone, streamNickname, favouriteGameType, livestreamFrequency, rewardLabel, rewardRarity } =
    parsed.data;
  const emailValue = email?.trim() || "";
  const phoneValue = phone?.trim() || "";

  // Both are required (not either/or) when the condition requires contact —
  // some reward types (e.g. bKash) can only be paid out by phone, so an
  // email alone isn't enough for follow-up.
  if (participant.condition?.contactRequirement === "REQUIRED" && !(emailValue && phoneValue)) {
    return { error: "This entry requires both an email and a phone number." };
  }

  await prisma.$transaction([
    prisma.participant.update({
      where: { id: participant.id },
      data: { rewardLabel, rewardRarity: rewardRarity.toUpperCase() as Rarity },
    }),
    ...(emailValue || phoneValue
      ? [
          prisma.participantContact.upsert({
            where: { participantId: participant.id },
            update: {
              encryptedValue: encryptContact(emailValue || phoneValue),
              encryptedPhone: phoneValue ? encryptContact(phoneValue) : null,
              streamNickname: streamNickname || null,
              favouriteGameType: favouriteGameType || null,
              livestreamFrequency: livestreamFrequency || null,
            },
            create: {
              participantId: participant.id,
              encryptedValue: encryptContact(emailValue || phoneValue),
              encryptedPhone: phoneValue ? encryptContact(phoneValue) : null,
              streamNickname: streamNickname || null,
              favouriteGameType: favouriteGameType || null,
              livestreamFrequency: livestreamFrequency || null,
            },
          }),
        ]
      : []),
    prisma.engagementEvent.create({ data: { participantId: participant.id, type: "SUBMITTED" } }),
  ]);

  return { responseCode: participant.anonymousCode };
}

export async function submitDebrief(permissionGiven: boolean): Promise<{ error: string } | { ok: true }> {
  const participantId = await getParticipantIdFromCookie();
  if (!participantId) return { error: "Your session expired." };

  const consentVersion = process.env.CONSENT_VERSION ?? "1.0";

  await prisma.debrief.upsert({
    where: { participantId },
    update: { explanationShown: true, permissionGiven },
    create: { participantId, explanationShown: true, permissionGiven },
  });

  await prisma.consent.upsert({
    where: { participantId },
    update: { consentGiven: permissionGiven, consentVersion },
    create: { participantId, consentGiven: permissionGiven, consentVersion },
  });

  if (permissionGiven) {
    await prisma.participant.update({ where: { id: participantId }, data: { consentStatus: "GRANTED" } });
  } else {
    // Retroactive decline: delete the encrypted contact row and exclude
    // this participant's behavioural data from analysis, per the study's
    // consent safeguards (see README.md).
    await prisma.participantContact.deleteMany({ where: { participantId } });
    await prisma.participant.update({ where: { id: participantId }, data: { consentStatus: "DECLINED" } });
  }

  await prisma.engagementEvent.create({ data: { participantId, type: "SUBMITTED" } }).catch(() => {});

  return { ok: true };
}

/** Which survey (if any) belongs to the current participant's experiment — used for the debrief's "continue to survey" link. */
export async function getNextSurveyId(): Promise<string | null> {
  const participantId = await getParticipantIdFromCookie();
  if (!participantId) return null;

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: { experimentId: true },
  });
  if (!participant) return null;

  const survey = await prisma.survey.findFirst({ where: { experimentId: participant.experimentId } });
  return survey?.id ?? null;
}

export async function submitSurveyResponse(
  surveyId: string,
  answers: Record<string, string | number>,
): Promise<{ error: string } | { ok: true }> {
  const participantId = await getParticipantIdFromCookie();
  if (!participantId) return { error: "Your session expired." };

  await prisma.response.upsert({
    where: { surveyId_participantId: { surveyId, participantId } },
    update: { answers },
    create: { surveyId, participantId, answers },
  });

  await prisma.engagementEvent.create({ data: { participantId, type: "SUBMITTED" } }).catch(() => {});

  return { ok: true };
}
