import "server-only";
import { prisma } from "@/lib/prisma";
import { fallbackRuntimeConfig, type StimulusRuntimeConfig } from "@/features/stimulus/config";
import type { ConditionModel as Condition } from "@/generated/prisma/models";

/** httpOnly cookie holding the anonymous participant's row id. No account exists — this cookie *is* the session. */
export const PARTICIPANT_COOKIE = "ldp_pid";
export const PARTICIPANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function toRuntimeConfig(condition: Condition | null): StimulusRuntimeConfig {
  if (!condition) return fallbackRuntimeConfig;
  return {
    urgencyEnabled: condition.urgencyEnabled,
    socialProofEnabled: condition.socialProofEnabled,
    authorityBadgesEnabled: condition.authorityBadgesEnabled,
    rewardRarity: condition.rewardRarity.toLowerCase() as StimulusRuntimeConfig["rewardRarity"],
    contactRequirement: condition.contactRequirement,
  };
}

/**
 * Resolves which experiment a brand-new visitor should be assigned to: the
 * TrackingLink's experiment if they arrived via a streamer's link, otherwise
 * the most recently activated experiment. Returns null if there's nothing to
 * assign to (empty database, no active experiment).
 */
export async function resolveExperimentForNewParticipant(trackingCode?: string | null) {
  if (trackingCode) {
    const link = await prisma.trackingLink.findUnique({
      where: { uniqueCode: trackingCode },
      include: { experiment: { include: { conditions: true } } },
    });
    if (link) return { experiment: link.experiment, trackingLinkId: link.id as string | null };
  }

  const experiment = await prisma.experiment.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { conditions: true },
  });
  return experiment ? { experiment, trackingLinkId: null } : null;
}

/** Creates the Participant row for a first-time visitor: random Condition assignment, no contact info yet. */
export async function createParticipant(
  experiment: { id: string; conditions: Condition[] },
  trackingLinkId: string | null,
) {
  const condition = experiment.conditions.length
    ? experiment.conditions[Math.floor(Math.random() * experiment.conditions.length)]
    : null;

  return prisma.participant.create({
    data: {
      experimentId: experiment.id,
      conditionId: condition?.id ?? null,
      trackingLinkId,
      anonymousCode: `P-${cryptoRandomCode()}`,
    },
    include: { condition: true },
  });
}

function cryptoRandomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
