import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordActivity, resumeLiveVisit } from "@/lib/study/visits";
import { recordStudyEvent } from "@/lib/study/events";
import { spinForVisit, submitEntryForVisit } from "@/lib/study/submissions";
import { attemptOutcomes, durationGroups } from "@/lib/study/stats";
import { buildStudyExport } from "@/lib/study/exports";
import { key, makeActiveStudy, newVisit, resetDb, validEntry } from "../support/fixtures";

beforeEach(resetDb);

/** Pretend the credit clock started `seconds` ago (controlled clock, DB time). */
const ago = (visitId: string, seconds: number) =>
  prisma.$executeRaw`UPDATE visits SET "activeCreditAt" = (now() AT TIME ZONE 'UTC') - make_interval(secs => ${seconds}) WHERE id = ${visitId}`;

describe("visible time across public pages", () => {
  it("new visits are measurement version 2; credits are split by route and sum to the total", async () => {
    await makeActiveStudy();
    const { visit } = await newVisit();
    expect(visit.measurementVersion).toBe(2);
    await recordActivity(visit.id, "visible", "home");
    await ago(visit.id, 10);
    await recordActivity(visit.id, "heartbeat", "home"); // flush on navigating home → about
    await ago(visit.id, 5);
    await recordActivity(visit.id, "heartbeat", "about"); // about → terms
    await ago(visit.id, 3);
    await recordActivity(visit.id, "hidden", "terms"); // tab hidden on terms
    const row = await prisma.visit.findUniqueOrThrow({ where: { id: visit.id } });
    const r = row.routeActiveMs as Record<string, number>;
    expect(r.home).toBeGreaterThanOrEqual(9900);
    expect(r.home).toBeLessThan(11000);
    expect(r.about).toBeGreaterThanOrEqual(4900);
    expect(r.about).toBeLessThan(6000);
    expect(r.terms).toBeGreaterThanOrEqual(2900);
    expect(r.terms).toBeLessThan(4000);
    expect(r.home + r.about + r.terms).toBe(row.activeMs);
    expect(row.activeCreditAt).toBeNull();
  });

  it("an overlapping route flush and heartbeat don't double count; hidden time isn't credited", async () => {
    await makeActiveStudy();
    const { visit } = await newVisit();
    await recordActivity(visit.id, "visible", "home");
    await ago(visit.id, 10);
    await recordActivity(visit.id, "heartbeat", "home");
    await recordActivity(visit.id, "heartbeat", "about"); // immediately after: ~0
    await recordActivity(visit.id, "hidden", "about");
    await prisma.$executeRaw`UPDATE visits SET "lastSeenAt" = "lastSeenAt" WHERE id = ${visit.id}`;
    await recordActivity(visit.id, "heartbeat", "about"); // hidden: clock stopped, nothing credited
    const row = await prisma.visit.findUniqueOrThrow({ where: { id: visit.id } });
    expect(row.activeMs).toBeLessThan(11000);
    expect((row.routeActiveMs as Record<string, number>).about ?? 0).toBeLessThan(500);
  });

  it("an implausible gap (sleep, lost network) is capped, and a future credit clock never goes negative", async () => {
    await makeActiveStudy();
    const { visit } = await newVisit();
    await recordActivity(visit.id, "visible", "home");
    await ago(visit.id, 3600);
    await recordActivity(visit.id, "heartbeat", "home");
    await ago(visit.id, -30); // clock in the future
    await recordActivity(visit.id, "heartbeat", "home");
    const row = await prisma.visit.findUniqueOrThrow({ where: { id: visit.id } });
    expect(row.activeMs).toBe(20000);
  });

  it("other public pages resume a live visit but never create one", async () => {
    const s = await makeActiveStudy();
    const first = await newVisit();
    expect((await resumeLiveVisit(first.visitorId, s.session.id))?.id).toBe(first.visit.id);
    const before = await prisma.visit.count();
    const stranger = await prisma.browserVisitor.create({ data: { tokenHash: "x".repeat(64) } });
    expect(await resumeLiveVisit(stranger.id, s.session.id)).toBeNull();
    expect(await prisma.visit.count()).toBe(before);
  });
});

describe("engagement groups", () => {
  it("puts each visit in exactly one group, with explicit denominators and no legacy pooling", async () => {
    const s = await makeActiveStudy();
    const never = await newVisit();
    const reached = await newVisit();
    const done = await newVisit();
    const legacy = await newVisit();
    await recordStudyEvent(prisma, reached.visit, { type: "REWARD_SECTION_VIEWED" });
    await recordStudyEvent(prisma, done.visit, { type: "REWARD_SECTION_VIEWED" });
    const r = await submitEntryForVisit({ visitorId: done.visitorId, visitId: done.visit.id, idempotencyKey: key(), values: validEntry("01700000901") });
    expect(r.ok).toBe(true);
    // Later browsing after the submission doesn't move the visit to another group.
    await recordStudyEvent(prisma, done.visit, { type: "ROUTE_VIEWED", element: "about" });
    await prisma.visit.update({ where: { id: legacy.visit.id }, data: { measurementVersion: 1, activeMs: 99000 } });
    await prisma.visit.update({ where: { id: never.visit.id }, data: { activeMs: 4000, routeActiveMs: { home: 4000 } } });
    await prisma.visit.update({ where: { id: reached.visit.id }, data: { activeMs: 30000, routeActiveMs: { home: 20000, terms: 10000 } } });
    await prisma.visit.update({ where: { id: done.visit.id }, data: { activeMs: 60000, routeActiveMs: { home: 50000, confirmation: 10000 } } });

    const g = await durationGroups([s.session.id]);
    expect(g.comparableVisits).toBe(3);
    expect(g.legacyVisits).toBe(1);
    const by = Object.fromEntries(g.groups.map((x) => [x.group, x]));
    expect(by.NEVER_REACHED_REWARD).toMatchObject({ visits: 1, visible: { median: 4 } });
    expect(by.REACHED_REWARD_NO_SUCCESSFUL_SUBMISSION).toMatchObject({ visits: 1, visible: { median: 30 }, homeVisible: { median: 20 } });
    expect(by.SUCCESSFULLY_SUBMITTED).toMatchObject({ visits: 1, visible: { median: 60 } });
    expect(g.groups.reduce((a, x) => a + x.visits, 0)).toBe(g.comparableVisits);
    expect(by.NEVER_REACHED_REWARD.share).toBeCloseTo(1 / 3);
    expect(g.routes.terms.visitsWithTime).toBe(1);

    const agg = await buildStudyExport(s.owner, "aggregate-funnel", s.experiment.id, true);
    expect(agg.csv).toMatch(/group_successfully_submitted_visits,1,/);
    expect(agg.csv).toMatch(/duration_legacy_visits,1,/);
    expect(agg.csv.split("\n")[0]).toBe("session_id,streamer,title,metric,value,denominator_note");
  });

  it("counts invalid attempts and their reason codes without any typed values", async () => {
    const s = await makeActiveStudy();
    const v = await newVisit();
    await recordStudyEvent(prisma, v.visit, { type: "SUBMISSION_ATTEMPTED" });
    await recordStudyEvent(prisma, v.visit, { type: "SUBMISSION_VALIDATION_FAILED", detail: { reasons: "NAME_MISSING,PHONE_INVALID" } });
    await recordStudyEvent(prisma, v.visit, { type: "SUBMISSION_ATTEMPTED" });
    const r = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry("01700000902") });
    expect(r.ok).toBe(true);
    const out = await attemptOutcomes(s.session.id);
    const by = Object.fromEntries(out.stages.map((x) => [x.type, x]));
    expect(by.SUBMISSION_ATTEMPTED).toMatchObject({ events: 2, visits: 1 });
    expect(by.SUBMISSION_VALIDATION_FAILED).toMatchObject({ events: 1, visits: 1 });
    expect(by.SUBMISSION_SAVED).toMatchObject({ events: 1 });
    expect(out.validationReasons).toEqual([
      { reason: "NAME_MISSING", attempts: 1 },
      { reason: "PHONE_INVALID", attempts: 1 },
    ]);
  });
});

describe("wheel retry", () => {
  it("a retried spin returns the one stored result and adds no second spin", async () => {
    await makeActiveStudy();
    const v = await newVisit();
    const [a, b] = await Promise.all([spinForVisit(v.visitorId, v.visit.id), spinForVisit(v.visitorId, v.visit.id)]);
    const c = await spinForVisit(v.visitorId, v.visit.id);
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (a.ok && b.ok && c.ok) expect(new Set([a.resultKey, b.resultKey, c.resultKey]).size).toBe(1);
    expect(await prisma.spinOutcome.count()).toBe(1);
    expect(await prisma.studyEvent.count({ where: { type: "SPIN_CLICKED" } })).toBe(1);
  });
});
