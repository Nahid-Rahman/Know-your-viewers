import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import { assertExperimentAccess, audit, type AccessLevel } from "./access";

/**
 * Legacy (pre-revision) outreach actions take a participant id from the
 * client; this checks the signed-in researcher may access that participant's
 * experiment, so changing the id can't reach another campaign's records.
 */
export async function requireLegacyParticipantAccess(participantId: string, level: AccessLevel = "write") {
  const user = await requireRole("RESEARCHER");
  const participant = await prisma.participant.findUnique({ where: { id: String(participantId) }, select: { experimentId: true } });
  if (!participant) throw new AuthError("Not found or not permitted.");
  await assertExperimentAccess(user, participant.experimentId, level);
  return user;
}

export async function requireLegacyInterviewAccess(interviewId: string) {
  const interview = await prisma.interview.findUnique({ where: { id: String(interviewId) }, select: { participantId: true } });
  if (!interview) throw new AuthError("Not found or not permitted.");
  return requireLegacyParticipantAccess(interview.participantId, "write");
}

export async function auditLegacyReveal(userId: string, participantId: string) {
  const p = await prisma.participant.findUnique({ where: { id: participantId }, select: { experimentId: true } });
  await audit(prisma, { actorId: userId, action: "CONTACT_REVEALED", entityType: "Participant", entityId: participantId, experimentId: p?.experimentId ?? null, detail: { legacy: true } });
}
