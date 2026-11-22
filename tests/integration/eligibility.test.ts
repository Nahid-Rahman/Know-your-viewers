import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { submitEntryForVisit } from "@/lib/study/submissions";
import { closeSessionEntries } from "@/lib/study/sessions";
import { drawPreflight, runDraw } from "@/lib/study/draw";
import {
  bulkSetResearchExclusion,
  promoteDuplicate,
  recordPermission,
  revealSubmissionContact,
  setResearchExclusion,
} from "@/lib/study/submission-admin";
import { buildStudyExport, researchEligibleSubmissions } from "@/lib/study/exports";
import { eligibilityStats, evaluateSubmission } from "@/lib/study/research-eligibility";
import { listSubmissions } from "@/lib/study/admin-queries";
import { key, makeActiveStudy, makeResearcher, newVisit, resetDb, validEntry } from "../support/fixtures";

beforeEach(resetDb);

async function submit(phone: string, extra: Record<string, unknown> = {}) {
  const v = await newVisit();
  const r = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry(phone, extra) });
  if (!r.ok) throw new Error(r.error);
  return prisma.submission.findUniqueOrThrow({ where: { id: r.submissionId } });
}

const grant = (actor: { id: string; role: string }, id: string, status: "GRANTED" | "DECLINED" | "WITHDRAWN" = "GRANTED") =>
  recordPermission(actor, id, { type: "WEBSITE_DATA_USE", status, noticeVersion: "v1", method: "PHONE_CALL" });

/** One of each case, all made LIVE (isTest=false) except `test`. */
async function matrix() {
  const s = await makeActiveStudy();
  const adult = await submit("01700000101", { ageGroup: "AGE_31_PLUS" });
  const pending = await submit("01700000102");
  const declined = await submit("01700000103");
  const withdrawn = await submit("01700000104");
  const minor = await submit("01700000105", { ageGroup: "BELOW_18" });
  const dup = await submit("01700000101");
  const manual = await submit("01700000106");
  const purged = await submit("01700000107");
  const test = await submit("01700000108");
  const live = [adult, pending, declined, withdrawn, minor, dup, manual, purged];
  await prisma.submission.updateMany({ where: { id: { in: live.map((x) => x.id) } }, data: { isTest: false } });
  for (const x of [adult, withdrawn, minor, dup, manual, purged, test]) await grant(s.owner, x.id);
  await grant(s.owner, declined.id, "DECLINED");
  await grant(s.owner, withdrawn.id, "WITHDRAWN");
  await setResearchExclusion(s.owner, manual.id, { excluded: true, reason: "INVALID_SUBMISSION" });
  await prisma.submission.update({ where: { id: purged.id }, data: { researchDataPurgedAt: new Date() } });
  return { s, adult, pending, declined, withdrawn, minor, dup, manual, purged, test };
}

describe("one research-eligibility rule everywhere", () => {
  it("list, detail, research export and stats agree for every case", async () => {
    const m = await matrix();
    const expected: Record<string, string> = {
      adult: "ELIGIBLE",
      pending: "PENDING",
      declined: "NOT_ELIGIBLE",
      withdrawn: "NOT_ELIGIBLE",
      minor: "NOT_ELIGIBLE",
      dup: "NOT_ELIGIBLE",
      manual: "NOT_ELIGIBLE",
      purged: "NOT_ELIGIBLE",
      test: "NOT_ELIGIBLE",
    };
    const { s, ...cases } = m;
    const ids = Object.fromEntries(Object.entries(cases).map(([k, v]) => [k, v.id]));
    const scope = [s.experiment.id];

    for (const [name, id] of Object.entries(ids)) expect([name, (await evaluateSubmission(id)).status]).toEqual([name, expected[name]]);

    const list = await listSubmissions({ scope, view: "all", includeTest: true });
    for (const [name, id] of Object.entries(ids)) expect([name, list.eligibility.get(id)?.status]).toEqual([name, expected[name]]);
    const only = async (research: "research_eligible" | "pending" | "manual") =>
      (await listSubmissions({ scope, view: "all", includeTest: true, research })).rows.map((r) => r.id);
    expect(await only("research_eligible")).toEqual([ids.adult]);
    expect(await only("pending")).toEqual([ids.pending]);
    expect(await only("manual")).toEqual([ids.manual]);
    // The older "Not excluded" filter keeps its narrower meaning (manual/purge flags only).
    expect((await listSubmissions({ scope, view: "all", includeTest: true, research: "eligible" })).total).toBe(7);

    expect((await researchEligibleSubmissions(s.experiment.id)).map((r) => r.id)).toEqual([ids.adult]);
    const { csv } = await buildStudyExport(s.owner, "research-submissions", s.experiment.id);
    expect(csv.trim().split("\n")).toHaveLength(2);

    const st = await eligibilityStats({ experimentId: s.experiment.id });
    expect(st).toMatchObject({ saved: 8, eligible: 1, pending: 1, notEligible: 6, excludedUnique: 7, duplicates: 1, under18Saved: 1 });
    expect(st.byReason).toMatchObject({
      UNDER_18: 1,
      DUPLICATE: 1,
      PERMISSION_PENDING: 1,
      PERMISSION_DECLINED_OR_WITHDRAWN: 2,
      MANUALLY_EXCLUDED: 1,
      RESEARCH_DATA_PURGED: 1,
      TEST_CAMPAIGN: 0,
    });
    const withTest = await eligibilityStats({ experimentId: s.experiment.id, includeTest: true });
    expect(withTest).toMatchObject({ saved: 9, test: 1 });
    expect(withTest.byReason.TEST_CAMPAIGN).toBe(1);

    const agg = await buildStudyExport(s.owner, "aggregate-funnel", s.experiment.id);
    expect(agg.csv).toMatch(/ALL_SESSIONS,,campaign total,research_eligible,1,/);
    expect(agg.csv).toMatch(/reason_under_18,1,/);
    expect(agg.csv).toMatch(/research_excluded_unique,7,/);
  });

  it("the same browser using a different phone is flagged for review, not excluded", async () => {
    const s = await makeActiveStudy();
    const v = await newVisit();
    const a = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry("01700000201") });
    const b = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry("01700000202") });
    if (!a.ok || !b.ok) throw new Error("submit failed");
    await prisma.submission.updateMany({ data: { isTest: false } });
    for (const id of [a.submissionId, b.submissionId]) await grant(s.owner, id);
    const e = await evaluateSubmission(a.submissionId);
    expect(e.status).toBe("ELIGIBLE");
    expect(e.reviewFlags).toContain("SAME_BROWSER_OTHER_PHONES");
  });
});

describe("manual exclusion, bulk review and audit", () => {
  it("records prior and new classification without contact values; reversal can't bypass hard rules", async () => {
    const m = await matrix();
    await setResearchExclusion(m.s.owner, m.minor.id, { excluded: true, reason: "OTHER", note: "phone 01700000105" });
    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "RESEARCH_EXCLUDED", entityId: m.minor.id } });
    expect(entry.experimentId).toBe(m.s.experiment.id);
    expect(entry.actorId).toBe(m.s.owner.id);
    expect(entry.detail).toMatchObject({
      responseCode: m.minor.responseCode,
      previous: { manual: false, status: "NOT_ELIGIBLE", reasons: ["UNDER_18"] },
      next: { manual: true, reasons: ["UNDER_18", "MANUALLY_EXCLUDED"] },
      hasNote: true,
    });
    expect(JSON.stringify(entry.detail)).not.toContain("01700000105");

    await setResearchExclusion(m.s.owner, m.minor.id, { excluded: false });
    expect((await evaluateSubmission(m.minor.id)).status).toBe("NOT_ELIGIBLE");
  });

  it("bulk exclusion is audited per row, campaign-scoped and all-or-nothing", async () => {
    const m = await matrix();
    const r = await bulkSetResearchExclusion(m.s.owner, [m.adult.id, m.pending.id], { excluded: true, reason: "TECHNICAL_ERROR" });
    expect(r.updated).toBe(2);
    expect(await prisma.auditLog.count({ where: { action: "RESEARCH_EXCLUDED", entityId: { in: [m.adult.id, m.pending.id] } } })).toBe(2);
    expect((await evaluateSubmission(m.adult.id)).status).toBe("NOT_ELIGIBLE");

    const outsider = await makeResearcher();
    await expect(bulkSetResearchExclusion(outsider, [m.declined.id], { excluded: true, reason: "OTHER" })).rejects.toThrow(/not permitted/);

    await closeSessionEntries(m.s.owner, m.s.session.id, null);
    await makeActiveStudy();
    const foreign = await submit("01700000301");
    await expect(bulkSetResearchExclusion(m.s.owner, [m.declined.id, foreign.id], { excluded: true, reason: "OTHER" })).rejects.toThrow(/not permitted/);
    expect((await prisma.submission.findUniqueOrThrow({ where: { id: m.declined.id } })).researchExcluded).toBe(false);
  });

  it("a wrongly classified duplicate is corrected through the audited canonical correction", async () => {
    const m = await matrix();
    await promoteDuplicate(m.s.owner, m.dup.id, "original was a mistaken entry");
    expect((await evaluateSubmission(m.dup.id)).reasons).not.toContain("DUPLICATE");
    expect((await evaluateSubmission(m.adult.id)).reasons).toContain("DUPLICATE");
    expect(await prisma.auditLog.count({ where: { action: "CANONICAL_CORRECTED" } })).toBe(1);
    expect(await prisma.submission.count({ where: { id: { in: [m.dup.id, m.adult.id] } } })).toBe(2);
  });
});

describe("under-18: no contact, no draw", () => {
  it("contact reveal and the operational follow-up export never include under-18 entrants", async () => {
    const m = await matrix();
    await expect(revealSubmissionContact(m.s.owner, m.minor.id, "follow-up")).rejects.toThrow(/Below 18/);
    expect(await prisma.auditLog.count({ where: { action: "CONTACT_REVEALED" } })).toBe(0);
    const { csv } = await buildStudyExport(m.s.owner, "operational-followup", m.s.experiment.id, true);
    expect(csv).not.toContain(m.minor.responseCode);
    expect(csv).toContain(m.adult.responseCode);
  });

  it("the draw never selects under-18 entrants, even if the decision record says otherwise", async () => {
    const s = await makeActiveStudy();
    for (let i = 0; i < 3; i++) await submit(`0171000040${i}`);
    for (let i = 0; i < 5; i++) await submit(`0171000050${i}`, { ageGroup: "BELOW_18" });
    await prisma.studyPolicyDecision.create({
      data: {
        experimentId: s.experiment.id,
        key: "UNDER18_CONTACT_AND_REWARD",
        status: "APPROVED",
        value: { rewardEligible: true, contactAllowed: true },
      },
    });
    await closeSessionEntries(s.owner, s.session.id, null);
    const pre = await drawPreflight(s.owner, s.experiment.id, true);
    expect(pre.eligibleCount).toBe(3);
    expect(pre.warnings.join(" ")).toMatch(/excludes them/);
    const draw = await runDraw(s.owner, s.experiment.id, true, 3);
    const winners = await prisma.drawWinner.findMany({ where: { drawId: draw.id }, include: { submission: true } });
    expect(winners.every((w) => w.submission.ageGroup !== "BELOW_18")).toBe(true);
    expect((draw.eligibleSnapshot as unknown[]).length).toBe(3);
  });

  it("declining research-data use does not change an adult's draw eligibility", async () => {
    const s = await makeActiveStudy();
    const a = await submit("01710000601");
    await grant(s.owner, a.id, "DECLINED");
    await closeSessionEntries(s.owner, s.session.id, null);
    expect((await drawPreflight(s.owner, s.experiment.id, true)).eligibleCount).toBe(1);
  });
});
