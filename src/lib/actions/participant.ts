"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptContact, hashEmail } from "@/lib/crypto";
import { PARTICIPANT_COOKIE } from "@/lib/participant";
import type { EngagementEventType, Rarity } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

async function getParticipantIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(PARTICIPANT_COOKIE)?.value ?? null;
}

export type EngagementEventOptions = {
  page?: string;
  element?: string;
  eventValue?: string;
  metadata?: Record<string, unknown>;
};

/** Fire-and-forget funnel telemetry from client interactions (spin, modal open, field focus, abandon). */
export async function logEngagementEvent(
  type: EngagementEventType,
  options?: EngagementEventOptions,
): Promise<void> {
  const participantId = await getParticipantIdFromCookie();
  if (!participantId) return;
  await prisma.engagementEvent
    .create({
      data: {
        participantId,
        type,
        page: options?.page,
        element: options?.element,
        eventValue: options?.eventValue,
        metadata: options?.metadata as Prisma.InputJsonValue | undefined,
      },
    })
    .catch(() => {});
}

const entrySchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  streamNickname: z.string().optional(),
  favouriteGameType: z.string().optional(),
  livestreamFrequency: z.string().optional(),
  streamerId: z.string().optional(),
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

  const {
    email,
    phone,
    streamNickname,
    favouriteGameType,
    livestreamFrequency,
    streamerId,
    rewardLabel,
    rewardRarity,
  } = parsed.data;
  const emailValue = email?.trim() || "";
  const phoneValue = phone?.trim() || "";

  // Both are required (not either/or) when the condition requires contact —
  // some reward types (e.g. bKash) can only be paid out by phone, so an
  // email alone isn't enough for follow-up.
  if (participant.condition?.contactRequirement === "REQUIRED" && !(emailValue && phoneValue)) {
    return { error: "This entry requires both an email and a phone number." };
  }

  // Self-reported "which streamer are you watching" — validated against the
  // experiment's assigned streamers rather than trusted as-is, since it's
  // also what the per-streamer contact-dedup check below is scoped by.
  let resolvedStreamerId: string | null = null;
  if (streamerId) {
    const assignment = await prisma.experimentStreamer.findFirst({
      where: { experimentId: participant.experimentId, streamerId },
    });
    if (!assignment) return { error: "Invalid streamer selection — please reload and try again." };
    resolvedStreamerId = streamerId;
  }

  // Same email may enter once per streamer, not once platform-wide — e.g. a
  // viewer who watches two different streamers should be able to submit for
  // both. Scoped by the self-reported streamer above, not the tracking link.
  if (emailValue) {
    const emailHash = hashEmail(emailValue);
    const duplicate = await prisma.participantContact.findFirst({
      where: {
        emailHash,
        participant: { id: { not: participant.id }, streamerId: resolvedStreamerId },
      },
    });
    if (duplicate) {
      return { error: "This email has already submitted an entry for this streamer." };
    }
  }

  await prisma.$transaction([
    prisma.participant.update({
      where: { id: participant.id },
      data: { rewardLabel, rewardRarity: rewardRarity.toUpperCase() as Rarity, streamerId: resolvedStreamerId },
    }),
    ...(emailValue || phoneValue
      ? [
          prisma.participantContact.upsert({
            where: { participantId: participant.id },
            update: {
              encryptedValue: encryptContact(emailValue || phoneValue),
              encryptedPhone: phoneValue ? encryptContact(phoneValue) : null,
              emailHash: emailValue ? hashEmail(emailValue) : null,
              streamNickname: streamNickname || null,
              favouriteGameType: favouriteGameType || null,
              livestreamFrequency: livestreamFrequency || null,
            },
            create: {
              participantId: participant.id,
              encryptedValue: encryptContact(emailValue || phoneValue),
              encryptedPhone: phoneValue ? encryptContact(phoneValue) : null,
              emailHash: emailValue ? hashEmail(emailValue) : null,
              streamNickname: streamNickname || null,
              favouriteGameType: favouriteGameType || null,
              livestreamFrequency: livestreamFrequency || null,
            },
          }),
        ]
      : []),
    prisma.engagementEvent.create({
      data: { participantId: participant.id, type: "CONTACT_SUBMITTED", page: "claim-modal" },
    }),
  ]);

  return { responseCode: participant.anonymousCode };
}

export async function submitDebrief(permissionGiven: boolean): Promise<{ error: string } | { ok: true }> {
  const participantId = await getParticipantIdFromCookie();
  if (!participantId) return { error: "Your session expired." };

  const consentVersion = process.env.CONSENT_VERSION ?? "1.0";
  // The on-page flow always explains and asks in one step, so completing it
  // is either an acknowledged "yes" or a declined "no" — never one of the
  // in-between researcher-follow-up states (those are only reachable via
  // the researcher's own Debrief-queue actions, for participants who never
  // reach this page on their own).
  const debriefStatus = permissionGiven ? "ACKNOWLEDGED" : "DECLINED";

  await prisma.debrief.upsert({
    where: { participantId },
    update: { explanationShown: true, permissionGiven, debriefStatus },
    create: { participantId, explanationShown: true, permissionGiven, debriefStatus },
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

  await prisma.engagementEvent
    .create({ data: { participantId, type: "STUDY_COMPLETED", page: "debrief" } })
    .catch(() => {});

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

  await prisma.engagementEvent
    .create({ data: { participantId, type: "SURVEY_SUBMITTED", page: "survey", eventValue: surveyId } })
    .catch(() => {});

  return { ok: true };
}
