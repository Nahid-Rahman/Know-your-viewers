import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { submitEntryForVisit } from "@/lib/study/submissions";
import { closeSessionEntries } from "@/lib/study/sessions";
import { runDraw, voidDraw, drawPreflight, updatePayout } from "@/lib/study/draw";
import {
  recordPermission,
  revealSubmissionContact,
  setDrawExclusion,
  purgeResearchData,
  currentPermissions,
  promoteDuplicate,
} from "@/lib/study/submission-admin";
import { buildStudyExport, researchEligibleSubmissions } from "@/lib/study/exports";
import { recordActivity } from "@/lib/study/visits";
import { retentionRun } from "@/lib/study/retention";
import { key, makeActiveStudy, makeResearcher, newVisit, resetDb, validEntry } from "../support/fixtures";

beforeEach(resetDb);

async function submit(phone: string, extra: Record<string, unknown> = {}) {
  const v = await newVisit();
  const r = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry(phone, extra) });
  if (!r.ok) throw new Error(r.error);
  return prisma.submission.findUniqueOrThrow({ where: { id: r.submissionId } });
}

const phones = (n: number) => Array.from({ length: n }, (_, i) => `0171${String(1000000 + i).slice(-7)}`);

describe("reward draw", () => {
  it("draws canonical entries only, without replacement, and blocks reruns", async () => {
    const s = await makeActiveStudy();
    for (const p of phones(6)) await submit(p);
    // Same phones again → duplicates that must never add chances.
    for (const p of phones(6)) await submit(p);
    await closeSessionEntries(s.owner, s.session.id, null);

    const draw = await runDraw(s.owner, s.experiment.id, true, 4);
    const winners = await prisma.drawWinner.findMany({ where: { drawId: draw.id }, include: { submission: true } });
    expect(winners).toHaveLength(4);
    expect(new Set(winners.map((w) => w.submissionId)).size).toBe(4);
    expect(winners.every((w) => w.submission.status === "CANONICAL")).toBe(true);
    expect(draw.eligibleCount).toBe(6);
    expect((draw.eligibleSnapshot as unknown[]).length).toBe(6);

    await expect(runDraw(s.owner, s.experiment.id, true, 4)).rejects.toThrow(/already exists/);
    expect(await prisma.auditLog.count({ where: { action: "DRAW_FINALIZED" } })).toBe(1);
  });

  it("does not silently reduce the winner count", async () => {
    const s = await makeActiveStudy();
    for (const p of phones(3)) await submit(p);
    await closeSessionEntries(s.owner, s.session.id, null);
    await expect(runDraw(s.owner, s.experiment.id, true, 10)).rejects.toThrow(/not reduced automatically/);
    expect(await prisma.rewardDraw.count()).toBe(0);
  });

  it("waits until entries are closed", async () => {
    const s = await makeActiveStudy();
    await submit("01711111111");
    await expect(runDraw(s.owner, s.experiment.id, true, 1)).rejects.toThrow(/still open/);
  });

  it("a live draw needs an approved winner count — no default of 10 or 20", async () => {
    const s = await makeActiveStudy();
    const pre = await drawPreflight(s.owner, s.experiment.id, false);
    expect(pre.winnerCount).toBeNull();
    expect(pre.problems.join(" ")).toMatch(/Final winner count/);
    await expect(runDraw(s.owner, s.experiment.id, false)).rejects.toThrow();
  });

  it("voiding needs a reason, is blocked after payment, and payout is separate from winning", async () => {
    const s = await makeActiveStudy();
    for (const p of phones(3)) await submit(p);
    await closeSessionEntries(s.owner, s.session.id, null);
    const draw = await runDraw(s.owner, s.experiment.id, true, 2);
    const [w] = await prisma.drawWinner.findMany({ where: { drawId: draw.id } });
    expect(w.payoutStatus).toBe("PENDING");
    await expect(updatePayout(s.owner, w.id, { payoutStatus: "PAID", paymentRef: "OTP 1234" })).rejects.toThrow(/never a PIN/);
    await updatePayout(s.owner, w.id, { payoutStatus: "PAID", paymentRef: "TRX9ABC" });
    await expect(voidDraw(s.owner, draw.id, "")).rejects.toThrow();
    await expect(voidDraw(s.owner, draw.id, "mistake")).rejects.toThrow(/Payments were already recorded/);
  });

  it("draw-eligibility changes are blocked once a draw is finalized; duplicates are not auto-promoted", async () => {
    const s = await makeActiveStudy();
    const a = await submit("01712340000");
    const dup = await submit("01712340000");
    await submit("01712340001");
    await setDrawExclusion(s.owner, a.id, { excluded: true, note: "test entry by team" });
    const after = await prisma.submission.findUniqueOrThrow({ where: { id: dup.id } });
    expect(after.status).toBe("DUPLICATE"); // not silently promoted
    await closeSessionEntries(s.owner, s.session.id, null);
    const draw = await runDraw(s.owner, s.experiment.id, true, 1);
    expect(draw.eligibleCount).toBe(1);
    await expect(setDrawExclusion(s.owner, a.id, { excluded: false, note: "x" })).rejects.toThrow(/finalized/);
    await expect(promoteDuplicate(s.owner, dup.id, "fix")).rejects.toThrow(/finalized/);
  });

  it("an explicit, audited correction can promote a duplicate before any draw", async () => {
    const s = await makeActiveStudy();
    const a = await submit("01712349999");
    const dup = await submit("01712349999");
    await promoteDuplicate(s.owner, dup.id, "original was a team test");
    const [na, nd] = await Promise.all([
      prisma.submission.findUniqueOrThrow({ where: { id: a.id } }),
      prisma.submission.findUniqueOrThrow({ where: { id: dup.id } }),
    ]);
    expect(nd.status).toBe("CANONICAL");
    expect(na).toMatchObject({ status: "DUPLICATE", canonicalId: dup.id });
    expect(await prisma.auditLog.count({ where: { action: "CANONICAL_CORRECTED" } })).toBe(1);
  });
});

describe("permissions and research eligibility", () => {
  it("keeps history, treats pending/unreachable as not granted, and declining research does not remove prize eligibility", async () => {
    const s = await makeActiveStudy();
    const sub = await submit("01700000001");
    await prisma.submission.update({ where: { id: sub.id }, data: { isTest: false } });

    expect(await researchEligibleSubmissions(s.experiment.id)).toHaveLength(0); // pending

    await recordPermission(s.owner, sub.id, { type: "WEBSITE_DATA_USE", status: "GRANTED", noticeVersion: "v1", method: "PHONE_CALL" });
    expect(await researchEligibleSubmissions(s.experiment.id)).toHaveLength(1);

    await recordPermission(s.owner, sub.id, { type: "WEBSITE_DATA_USE", status: "WITHDRAWN", noticeVersion: "v1", method: "PHONE_CALL" });
    const rows = await prisma.dataUsePermission.findMany({ where: { submissionId: sub.id } });
    expect(rows).toHaveLength(2);
    expect(currentPermissions(rows).WEBSITE_DATA_USE).toBe("WITHDRAWN");
    expect(currentPermissions(rows).INTERVIEW_ANSWERS_USE).toBe("PENDING"); // not copied
    expect(await researchEligibleSubmissions(s.experiment.id)).toHaveLength(0);

    const plan = await purgeResearchData(s.owner, sub.id, { dryRun: false });
    expect(plan.phoneKeptForPrize).toBe(true);
    const contact = await prisma.submissionContact.findUniqueOrThrow({ where: { submissionId: sub.id } });
    expect(contact.encryptedPhone).not.toBeNull();
    const after = await prisma.submission.findUniqueOrThrow({ where: { id: sub.id } });
    expect(after).toMatchObject({ status: "CANONICAL", drawExcluded: false });
  });

  it("withdrawal requires a prior grant; a notice version is mandatory", async () => {
    const s = await makeActiveStudy();
    const sub = await submit("01700000002");
    await expect(
      recordPermission(s.owner, sub.id, { type: "INTERVIEW_PROCEED", status: "WITHDRAWN", noticeVersion: "v1", method: "PHONE_CALL" }),
    ).rejects.toThrow(/granted/);
    await expect(
      recordPermission(s.owner, sub.id, { type: "INTERVIEW_PROCEED", status: "GRANTED", noticeVersion: " ", method: "PHONE_CALL" }),
    ).rejects.toThrow(/version/);
  });

  it("research export excludes duplicates, under-18 detail, test entries and non-granted rows", async () => {
    const s = await makeActiveStudy();
    const adult = await submit("01700000010", { ageGroup: "AGE_31_PLUS" });
    const minor = await submit("01700000011", { ageGroup: "BELOW_18" });
    const dup = await submit("01700000010");
    const pending = await submit("01700000012");
    for (const x of [adult, minor, dup, pending]) await prisma.submission.update({ where: { id: x.id }, data: { isTest: false } });
    for (const x of [adult, minor, dup]) {
      await recordPermission(s.owner, x.id, { type: "WEBSITE_DATA_USE", status: "GRANTED", noticeVersion: "v1", method: "PHONE_CALL" });
    }
    const { csv } = await buildStudyExport(s.owner, "research-submissions", s.experiment.id);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(adult.id);
    expect(csv).not.toContain("01700000010");
    expect(csv).not.toContain("Below 18");

    const agg = await buildStudyExport(s.owner, "aggregate-funnel", s.experiment.id, true);
    expect(agg.csv).toMatch(/under18_canonical_submissions,1,/);
    expect(await prisma.auditLog.count({ where: { action: "EXPORT" } })).toBe(2);
  });
});

describe("access control", () => {
  it("another researcher cannot read, reveal or export a campaign they don't belong to", async () => {
    const s = await makeActiveStudy();
    const sub = await submit("01700000020");
    const outsider = await makeResearcher();
    await expect(revealSubmissionContact(outsider, sub.id, "call")).rejects.toThrow(/not permitted/);
    await expect(buildStudyExport(outsider, "operational-followup", s.experiment.id)).rejects.toThrow(/not permitted/);
    await expect(buildStudyExport(outsider, "research-submissions", s.experiment.id)).rejects.toThrow(/not permitted/);
    await expect(recordPermission(outsider, sub.id, { type: "WEBSITE_DATA_USE", status: "GRANTED", noticeVersion: "v1", method: "PHONE_CALL" })).rejects.toThrow(/not permitted/);
    await expect(runDraw(outsider, s.experiment.id, true, 1)).rejects.toThrow(/not permitted/);
  });

  it("a VIEWER collaborator can read aggregates but not reveal or export contacts", async () => {
    const s = await makeActiveStudy();
    const sub = await submit("01700000021");
    const viewer = await makeResearcher();
    await prisma.experimentCollaborator.create({ data: { experimentId: s.experiment.id, userId: viewer.id, role: "VIEWER" } });
    await expect(buildStudyExport(viewer, "aggregate-funnel", s.experiment.id, true)).resolves.toBeTruthy();
    await expect(revealSubmissionContact(viewer, sub.id, "call")).rejects.toThrow(/not permitted/);
    await expect(buildStudyExport(viewer, "operational-followup", s.experiment.id)).rejects.toThrow(/not permitted/);
  });

  it("a streamer account has no researcher access", async () => {
    const s = await makeActiveStudy();
    const sub = await submit("01700000022");
    await expect(revealSubmissionContact({ id: s.streamer.userId, role: "STREAMER" }, sub.id, "x")).rejects.toThrow();
  });

  it("contact reveal is audited without the values", async () => {
    const s = await makeActiveStudy();
    const sub = await submit("01700000023", { email: "a@b.co" });
    const r = await revealSubmissionContact(s.owner, sub.id, "follow-up call");
    expect(r).toMatchObject({ phone: "+8801700000023", email: "a@b.co" });
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "CONTACT_REVEALED" } });
    expect(JSON.stringify(log.detail)).not.toContain("1700000023");
    expect(JSON.stringify(log.detail)).not.toContain("a@b.co");
  });
});

describe("active time in the database", () => {
  it("credits heartbeats with a cap and does not double count two tabs", async () => {
    await makeActiveStudy();
    const v = await newVisit();
    await recordActivity(v.visit.id, "visible");
    await prisma.$executeRaw`UPDATE visits SET "activeCreditAt" = (now() AT TIME ZONE 'UTC') - interval '10 seconds' WHERE id = ${v.visit.id}`;
    await recordActivity(v.visit.id, "heartbeat"); // tab A: ~10 s
    await recordActivity(v.visit.id, "heartbeat"); // tab B right after: ~0 s
    let row = await prisma.visit.findUniqueOrThrow({ where: { id: v.visit.id } });
    expect(row.activeMs).toBeGreaterThanOrEqual(9900);
    expect(row.activeMs).toBeLessThan(11000);
    await prisma.$executeRaw`UPDATE visits SET "activeCreditAt" = (now() AT TIME ZONE 'UTC') - interval '10 minutes' WHERE id = ${v.visit.id}`;
    await recordActivity(v.visit.id, "heartbeat"); // long gap → capped at 20 s
    row = await prisma.visit.findUniqueOrThrow({ where: { id: v.visit.id } });
    expect(row.activeMs).toBeLessThan(32000);
  });
});

describe("retention", () => {
  it("does nothing until retention periods are approved", async () => {
    const s = await makeActiveStudy();
    await submit("01700000030");
    const plan = await retentionRun(s.owner, s.experiment.id, { dryRun: true });
    expect(plan.decided).toBe(false);
    expect(plan.phonesToRemove + plan.eventsToDelete + plan.optionalFieldRowsToClear).toBe(0);
  });

  it("previews then removes only what approved periods cover, holding unpaid winners' phones", async () => {
    const s = await makeActiveStudy();
    const sub = await submit("01700000031", { email: "x@y.co" });
    await prisma.submission.update({ where: { id: sub.id }, data: { submittedAt: new Date(Date.now() - 40 * 86400_000) } });
    await prisma.studyPolicyDecision.create({
      data: { experimentId: s.experiment.id, key: "RETENTION", status: "APPROVED", value: { contactDays: 30, optionalFieldDays: 30 } },
    });
    const preview = await retentionRun(s.owner, s.experiment.id, { dryRun: true });
    expect(preview).toMatchObject({ phonesToRemove: 1, optionalFieldRowsToClear: 1, eventsToDelete: 0 });
    expect(preview.undecided).toContain("website events");
    expect((await prisma.submissionContact.findFirstOrThrow()).encryptedPhone).not.toBeNull();
    await retentionRun(s.owner, s.experiment.id, { dryRun: false });
    const c = await prisma.submissionContact.findFirstOrThrow();
    expect(c.encryptedPhone).toBeNull();
    expect(c.encryptedEmail).toBeNull();
  });
});
