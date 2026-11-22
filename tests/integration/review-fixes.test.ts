import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { submitEntryForVisit } from "@/lib/study/submissions";
import { purgeResearchData, recordPermission } from "@/lib/study/submission-admin";
import { buildStudyExport, researchEligibleSubmissions } from "@/lib/study/exports";
import { eligibilityStats } from "@/lib/study/research-eligibility";
import { durationGroups } from "@/lib/study/stats";
import { key, makeActiveStudy, newVisit, resetDb, validEntry } from "../support/fixtures";

beforeEach(resetDb);

async function submit(phone: string, extra: Record<string, unknown> = {}) {
  const v = await newVisit();
  const r = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry(phone, extra) });
  if (!r.ok) throw new Error(r.error);
  return prisma.submission.findUniqueOrThrow({ where: { id: r.submissionId } });
}
const grant = (actor: { id: string; role: string }, id: string, status: "GRANTED" | "DECLINED" = "GRANTED") =>
  recordPermission(actor, id, { type: "WEBSITE_DATA_USE", status, noticeVersion: "v1", method: "PHONE_CALL" });

describe("research export uses the same rule as the counts, TEST toggle or not", () => {
  it("TEST records never appear in the research export, even with TEST included", async () => {
    const s = await makeActiveStudy();
    const live = await submit("01700001001");
    const test = await submit("01700001002");
    await prisma.submission.update({ where: { id: live.id }, data: { isTest: false } });
    for (const x of [live, test]) await grant(s.owner, x.id);

    expect((await researchEligibleSubmissions(s.experiment.id)).map((r) => r.id)).toEqual([live.id]);
    for (const includeTest of [false, true]) {
      const { csv } = await buildStudyExport(s.owner, "research-submissions", s.experiment.id, includeTest);
      const exported = csv.trim().split("\n").length - 1;
      const st = await eligibilityStats({ experimentId: s.experiment.id, includeTest });
      expect([includeTest, exported]).toEqual([includeTest, st.eligible]);
      expect(csv).not.toContain(test.id);
    }
  });
});

describe("purge keeps nothing 'for the prize' for under-18 entrants", () => {
  it("clears name and phone of a canonical under-18 entry; keeps them for an adult", async () => {
    const s = await makeActiveStudy();
    const minor = await submit("01700001101", { ageGroup: "BELOW_18" });
    const adult = await submit("01700001102");
    for (const x of [minor, adult]) await grant(s.owner, x.id, "DECLINED");

    expect((await purgeResearchData(s.owner, minor.id, { dryRun: true })).phoneKeptForPrize).toBe(false);
    await purgeResearchData(s.owner, minor.id, { dryRun: false });
    await purgeResearchData(s.owner, adult.id, { dryRun: false });
    const [m, a] = await Promise.all([minor, adult].map((x) => prisma.submissionContact.findUniqueOrThrow({ where: { submissionId: x.id } })));
    expect(m.encryptedPhone).toBeNull();
    expect(m.encryptedName).toBeNull();
    expect(m.phonePurgedAt).not.toBeNull();
    expect(a.encryptedPhone).not.toBeNull();
  });
});

describe("duration groups: campaign-wide and by stream phase", () => {
  it("filters visits by the phase they started in and reports the split", async () => {
    const s = await makeActiveStudy();
    const start = new Date(Date.now() - 3 * 3600_000);
    const end = new Date(Date.now() - 3600_000);
    await prisma.streamSession.update({ where: { id: s.session.id }, data: { actualStartAt: start, actualEndAt: end } });
    const during = await newVisit();
    const after = await newVisit();
    await prisma.visit.update({ where: { id: during.visit.id }, data: { startedAt: new Date(start.getTime() + 600_000), activeMs: 10_000 } });
    await prisma.visit.update({ where: { id: after.visit.id }, data: { startedAt: new Date(end.getTime() + 600_000), activeMs: 40_000 } });

    const all = await durationGroups([s.session.id]);
    expect(all.comparableVisits).toBe(2);
    expect(all.byPhase).toMatchObject({ LIVE: 1, POST_STREAM: 1 });
    const live = await durationGroups([s.session.id], { phase: "LIVE" });
    expect(live.comparableVisits).toBe(1);
    expect(live.groups.find((g) => g.group === "NEVER_REACHED_REWARD")?.visible.median).toBe(10);
    const post = await durationGroups([s.session.id], { phase: "POST_STREAM" });
    expect(post.groups.find((g) => g.group === "NEVER_REACHED_REWARD")?.visible.median).toBe(40);
    expect(post.byPhase).toEqual(all.byPhase);

    const agg = await buildStudyExport(s.owner, "aggregate-funnel", s.experiment.id, true);
    expect(agg.csv).toMatch(/ALL_SESSIONS,,campaign total,duration_comparable_visits,2,/);
    expect(agg.csv).toMatch(/ALL_SESSIONS,,campaign total,live_duration_comparable_visits,1,/);
    expect(agg.csv).toMatch(/ALL_SESSIONS,,campaign total,post_stream_group_never_reached_reward_visible_median_s,40,/);
  });
});
