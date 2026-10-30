import "server-only";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth-error";
import type { Prisma } from "@/generated/prisma/client";

export type AccessLevel = "read" | "write" | "contact";
export type Actor = { id: string; role: string };

/**
 * Experiments the researcher may see: those they own plus those they were
 * added to as a collaborator. Every admin query in the revised flow is
 * scoped through this, so changing a record id in a request can't reach
 * another researcher's campaign.
 */
export async function accessibleExperimentIds(actor: Actor, level: AccessLevel = "read"): Promise<string[]> {
  if (actor.role !== "RESEARCHER") return [];
  const [owned, shared] = await Promise.all([
    prisma.experiment.findMany({ where: { researcherId: actor.id }, select: { id: true } }),
    prisma.experimentCollaborator.findMany({
      where: { userId: actor.id, ...(level === "read" ? {} : { role: "RESEARCHER" }) },
      select: { experimentId: true },
    }),
  ]);
  return [...new Set([...owned.map((e) => e.id), ...shared.map((c) => c.experimentId)])];
}

export async function assertExperimentAccess(actor: Actor, experimentId: string, level: AccessLevel = "read") {
  const ids = await accessibleExperimentIds(actor, level);
  if (!ids.includes(experimentId)) throw new AuthError("Not found or not permitted.");
}

/** Loads a submission only if the actor may access its experiment at `level`. */
export async function getAccessibleSubmission(actor: Actor, submissionId: string, level: AccessLevel = "read") {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) throw new AuthError("Not found or not permitted.");
  await assertExperimentAccess(actor, submission.experimentId, level);
  return submission;
}

export async function getAccessibleSession(actor: Actor, sessionId: string, level: AccessLevel = "read") {
  const session = await prisma.streamSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new AuthError("Not found or not permitted.");
  await assertExperimentAccess(actor, session.experimentId, level);
  return session;
}

type Db = Prisma.TransactionClient | typeof prisma;

/** Append-only audit entry. `detail` must never contain contact values. */
export async function audit(
  db: Db,
  entry: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    experimentId?: string | null;
    detail?: Record<string, unknown>;
  },
) {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      experimentId: entry.experimentId ?? null,
      detail: (entry.detail ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
