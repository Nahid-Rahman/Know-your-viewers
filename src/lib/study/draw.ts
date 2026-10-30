import "server-only";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { audit, assertExperimentAccess, type Actor } from "./access";
import {
  approvedUnder18RewardEligible,
  approvedWinnerCount,
  blockingPoliciesForLiveDraw,
  POLICY_DEFINITIONS,
  type PolicyRecord,
} from "./policy";
import { entryState } from "./session-state";
import { StudyRuleError } from "./sessions";

export const DRAW_METHOD =
  "Partial Fisher–Yates shuffle with Node.js crypto.randomInt over the eligible snapshot ordered by (submittedAt, id); winners drawn without replacement.";

/** Picks `count` distinct indexes from 0..n-1. `pick` is injectable for tests. */
export function selectWithoutReplacement(n: number, count: number, pick: (max: number) => number = randomInt): number[] {
  if (count > n) throw new StudyRuleError("Not enough eligible entries.");
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + pick(n - i);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, count);
}

async function policies(experimentId: string): Promise<PolicyRecord[]> {
  const rows = await prisma.studyPolicyDecision.findMany({ where: { experimentId } });
  return rows.map((r) => ({ key: r.key, status: r.status, value: r.value }));
}

/**
 * Canonical entries eligible for the draw. Never includes duplicates, test
 * entries in a live draw (or vice versa), or entries an admin excluded from
 * the draw. Research permission, interview participation and optional fields
 * play no part here.
 */
export async function drawEligibleEntries(experimentId: string, isTest: boolean, under18Eligible: boolean) {
  return prisma.submission.findMany({
    where: {
      experimentId,
      isTest,
      status: "CANONICAL",
      drawExcluded: false,
      ...(under18Eligible ? {} : { ageGroup: { not: "BELOW_18" } }),
    },
    select: { id: true, responseCode: true, submittedAt: true },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
  });
}

export async function drawPreflight(actor: Actor, experimentId: string, isTest: boolean) {
  await assertExperimentAccess(actor, experimentId, "read");
  const records = await policies(experimentId);
  const problems: string[] = [];
  let winnerCount: number | null = approvedWinnerCount(records);
  let under18 = approvedUnder18RewardEligible(records);

  if (!isTest) {
    for (const k of blockingPoliciesForLiveDraw(records)) problems.push(`Pending decision: ${POLICY_DEFINITIONS[k].title}.`);
  } else {
    // Test draws use synthetic entries only; pending policies don't block them,
    // but the winner count must still be typed in explicitly.
    winnerCount = null;
    if (under18 === null) under18 = true;
  }

  const sessions = await prisma.streamSession.findMany({
    where: { experimentId, sessionType: "STUDY", collectionMode: isTest ? "TEST" : "LIVE" },
  });
  const now = new Date();
  const open = sessions.filter((s) => entryState(s, now).accepting);
  if (open.length) problems.push("Entries are still open for at least one session — the draw happens after collection closes.");

  const existing = await prisma.rewardDraw.findFirst({ where: { experimentId, isTest, status: "FINALIZED" } });
  if (existing) problems.push("A finalized draw already exists. Void it with a recorded reason before drawing again.");

  const eligible = await drawEligibleEntries(experimentId, isTest, under18 ?? false);
  return { problems, winnerCount, under18Eligible: under18, eligibleCount: eligible.length, existingDrawId: existing?.id ?? null };
}

export async function runDraw(actor: Actor, experimentId: string, isTest: boolean, requestedForTest?: number) {
  await assertExperimentAccess(actor, experimentId, "contact");
  const pre = await drawPreflight(actor, experimentId, isTest);
  if (pre.problems.length) throw new StudyRuleError(pre.problems.join(" "));

  const requested = isTest ? requestedForTest : pre.winnerCount;
  if (!requested || !Number.isInteger(requested) || requested < 1) {
    throw new StudyRuleError(isTest ? "Enter how many winners to draw for this test." : "The winner count has not been decided.");
  }
  const eligible = await drawEligibleEntries(experimentId, isTest, pre.under18Eligible ?? false);
  if (eligible.length < requested) {
    throw new StudyRuleError(
      `Only ${eligible.length} eligible entries for ${requested} winners. The count is not reduced automatically — resolve this with the research team first.`,
    );
  }

  const chosen = selectWithoutReplacement(eligible.length, requested);
  try {
    return await prisma.$transaction(async (tx) => {
      const draw = await tx.rewardDraw.create({
        data: {
          experimentId,
          isTest,
          finalizedKey: `${experimentId}:${isTest ? "test" : "live"}`,
          requestedWinnerCount: requested,
          eligibleCount: eligible.length,
          eligibleSnapshot: eligible.map((e) => ({ submissionId: e.id, responseCode: e.responseCode })) as Prisma.InputJsonValue,
          method: `${DRAW_METHOD} Under-18 entries ${pre.under18Eligible ? "included" : "excluded"}${isTest ? " (test draw)" : ""}.`,
          executedById: actor.id,
          winners: { create: chosen.map((i, rank) => ({ submissionId: eligible[i].id, rank: rank + 1 })) },
        },
      });
      await audit(tx, {
        actorId: actor.id,
        action: "DRAW_FINALIZED",
        entityType: "RewardDraw",
        entityId: draw.id,
        experimentId,
        detail: { isTest, requested, eligibleCount: eligible.length },
      });
      return draw;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new StudyRuleError("A finalized draw already exists — it was not run again.");
    }
    throw err;
  }
}

export async function voidDraw(actor: Actor, drawId: string, reason: string) {
  const draw = await prisma.rewardDraw.findUniqueOrThrow({ where: { id: drawId }, include: { winners: true } });
  await assertExperimentAccess(actor, draw.experimentId, "contact");
  if (draw.status !== "FINALIZED") throw new StudyRuleError("This draw is already voided.");
  if (!reason.trim()) throw new StudyRuleError("A reason is required to void a draw.");
  if (draw.winners.some((w) => w.payoutStatus === "PAID")) {
    throw new StudyRuleError("Payments were already recorded for this draw; it can't be voided.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.rewardDraw.update({
      where: { id: drawId },
      data: { status: "VOIDED", finalizedKey: null, voidedAt: new Date(), voidReason: reason.trim() },
    });
    await audit(tx, { actorId: actor.id, action: "DRAW_VOIDED", entityType: "RewardDraw", entityId: drawId, experimentId: draw.experimentId, detail: { reason: reason.trim() } });
  });
}

export async function updatePayout(
  actor: Actor,
  winnerId: string,
  input: { payoutStatus: "PENDING" | "PAID" | "FAILED" | "UNREACHABLE"; paymentRef?: string | null },
) {
  const winner = await prisma.drawWinner.findUniqueOrThrow({ where: { id: winnerId }, include: { draw: true } });
  await assertExperimentAccess(actor, winner.draw.experimentId, "contact");
  if (winner.draw.status !== "FINALIZED") throw new StudyRuleError("This draw was voided.");
  const ref = input.paymentRef?.trim().slice(0, 60) || null;
  if (ref && /\b(pin|otp|password)\b/i.test(ref)) throw new StudyRuleError("Record only a transaction reference — never a PIN, OTP or password.");
  await prisma.$transaction(async (tx) => {
    await tx.drawWinner.update({
      where: { id: winnerId },
      data: {
        payoutStatus: input.payoutStatus,
        paymentRef: ref,
        paidAt: input.payoutStatus === "PAID" ? (winner.paidAt ?? new Date()) : null,
        updatedById: actor.id,
      },
    });
    await audit(tx, {
      actorId: actor.id,
      action: "PAYOUT_UPDATED",
      entityType: "DrawWinner",
      entityId: winnerId,
      experimentId: winner.draw.experimentId,
      detail: { payoutStatus: input.payoutStatus, previous: winner.payoutStatus },
    });
  });
}
