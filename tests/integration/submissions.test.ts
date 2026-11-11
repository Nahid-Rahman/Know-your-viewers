import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { spinForVisit, submitEntryForVisit } from "@/lib/study/submissions";
import { getActiveStudySession } from "@/lib/study/visits";
import { activateSession, closeSessionEntries, recordActualTime, saveSessionConfig, defaultConfigInputFor } from "@/lib/study/sessions";
import { recordStudyEvent } from "@/lib/study/events";
import { sessionFunnel, submissionSummary } from "@/lib/study/stats";
import { key, makeActiveStudy, makeStudy, newVisit, resetDb, validEntry } from "../support/fixtures";

beforeEach(resetDb);

describe("no active session", () => {
  it("has nothing to attribute to", async () => {
    expect(await getActiveStudySession()).toBeNull();
    await makeStudy(); // draft only
    expect(await getActiveStudySession()).toBeNull();
  });
});

describe("submission and duplicates", () => {
  it("saves a submission with a secure code and encrypted contact, no plaintext", async () => {
    await makeActiveStudy();
    const v = await newVisit();
    const r = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry() });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.responseCode).toMatch(/^LD-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const contact = await prisma.submissionContact.findUniqueOrThrow({ where: { submissionId: r.submissionId } });
    expect(contact.encryptedPhone).not.toContain("1712345678");
    expect(contact.phoneTail).toBe("78");
    const events = await prisma.studyEvent.findMany({ where: { submissionId: r.submissionId } });
    expect(JSON.stringify(events)).not.toContain("1712345678");
  });

  it("equivalent phone formats match; a repeat is saved as a linked DUPLICATE without overwriting", async () => {
    await makeActiveStudy();
    const a = await newVisit();
    const first = await submitEntryForVisit({
      visitorId: a.visitorId, visitId: a.visit.id, idempotencyKey: key(),
      values: validEntry("01712345678", { ign: "FirstIGN", ageGroup: "AGE_18_30" }),
    });
    const b = await newVisit(); // different browser
    const second = await submitEntryForVisit({
      visitorId: b.visitorId, visitId: b.visit.id, idempotencyKey: key(),
      values: validEntry("+880 1712-345678", { ageGroup: "AGE_31_PLUS" }),
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.responseCode).not.toBe(first.responseCode);
    const [s1, s2] = await Promise.all([
      prisma.submission.findUniqueOrThrow({ where: { id: first.submissionId } }),
      prisma.submission.findUniqueOrThrow({ where: { id: second.submissionId } }),
    ]);
    expect(s1.status).toBe("CANONICAL");
    expect(s1.ageGroup).toBe("AGE_18_30");
    expect(s1.ignProvided).toBe(true);
    expect(s2.status).toBe("DUPLICATE");
    expect(s2.canonicalId).toBe(s1.id);
    expect(s2.ageGroup).toBe("AGE_31_PLUS");
    const sum = await submissionSummary({ experimentId: s1.experimentId });
    expect(sum).toMatchObject({ saved: 2, canonical: 1, duplicates: 1 });
    const dupEvent = await prisma.studyEvent.findFirst({ where: { submissionId: s2.id, type: "DUPLICATE_CLASSIFIED" } });
    expect(dupEvent).not.toBeNull();
  });

  it("same browser submitting again with a new key is a genuine repeat (duplicate)", async () => {
    await makeActiveStudy();
    const v = await newVisit();
    await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry() });
    const again = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry() });
    expect(again.ok && !again.replayed).toBe(true);
    expect(await prisma.submission.count()).toBe(2);
  });

  it("a retried request with the same idempotency key does not create a duplicate", async () => {
    await makeActiveStudy();
    const v = await newVisit();
    const k = key();
    const [r1, r2, r3] = await Promise.all([
      submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: k, values: validEntry() }),
      submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: k, values: validEntry() }),
      submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: k, values: validEntry() }),
    ]);
    expect([r1, r2, r3].every((r) => r.ok)).toBe(true);
    const codes = new Set([r1, r2, r3].map((r) => (r.ok ? r.responseCode : "")));
    expect(codes.size).toBe(1);
    expect(await prisma.submission.count()).toBe(1);
  });

  it("concurrent submissions with the same phone yield exactly one canonical entry", async () => {
    await makeActiveStudy();
    const visits = await Promise.all(Array.from({ length: 8 }, () => newVisit()));
    const results = await Promise.all(
      visits.map((v, i) =>
        submitEntryForVisit({
          visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(),
          values: validEntry(i % 2 ? "+8801812345678" : "01812345678"),
        }),
      ),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await prisma.submission.count({ where: { status: "CANONICAL" } })).toBe(1);
    expect(await prisma.submission.count({ where: { status: "DUPLICATE" } })).toBe(7);
    const canonical = await prisma.submission.findFirstOrThrow({ where: { status: "CANONICAL" } });
    expect(await prisma.submission.count({ where: { status: "DUPLICATE", canonicalId: canonical.id } })).toBe(7);
  });

  it("optional fields can be skipped and do not change classification", async () => {
    await makeActiveStudy();
    const v = await newVisit();
    const r = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: { phone: "01912345678", ageGroup: "BELOW_18" } });
    expect(r.ok).toBe(true);
    const s = await prisma.submission.findFirstOrThrow();
    expect(s).toMatchObject({ status: "CANONICAL", emailProvided: false, ignProvided: false, socialProvided: false, socialType: null });
  });

  it("rejects missing phone or age group on the server", async () => {
    await makeActiveStudy();
    const v = await newVisit();
    const r1 = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: { ageGroup: "AGE_18_30" } });
    const r2 = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: { phone: "01712345678" } });
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
    expect(await prisma.submission.count()).toBe(0);
  });

  it("ignores client-supplied reward fields; the stored spin is server-chosen and stable", async () => {
    await makeActiveStudy();
    const v = await newVisit();
    const spin1 = await spinForVisit(v.visitorId, v.visit.id);
    const spin2 = await spinForVisit(v.visitorId, v.visit.id);
    expect(spin1).toMatchObject({ ok: true, resultKey: "bkash_reward" });
    expect(spin2).toMatchObject({ ok: true, repeated: true, resultKey: "bkash_reward" });
    const r = await submitEntryForVisit({
      visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(),
      values: { ...validEntry(), rewardLabel: "iPhone 17", rewardRarity: "premium", resultKey: "jackpot" },
    });
    expect(r.ok).toBe(true);
    const s = await prisma.submission.findFirstOrThrow({ include: { spinOutcome: true } });
    expect(s.spinOutcome?.resultKey).toBe("bkash_reward");
    expect(await prisma.spinOutcome.count()).toBe(1);
  });

  it("another browser cannot use someone else's visit", async () => {
    await makeActiveStudy();
    const owner = await newVisit();
    const other = await newVisit();
    const r = await submitEntryForVisit({ visitorId: other.visitorId, visitId: owner.visit.id, idempotencyKey: key(), values: validEntry() });
    expect(r).toMatchObject({ ok: false, code: "VISIT_EXPIRED" });
  });
});

describe("entry deadline (server-enforced)", () => {
  it("a form opened before the deadline cannot be submitted after it", async () => {
    const { owner, session } = await makeActiveStudy();
    const v = await newVisit();
    const end = new Date(Date.now() - 2 * 60 * 60 * 1000 - 1000); // deadline passed 1 s ago
    await recordActualTime(owner, session.id, "actualStartAt", new Date(end.getTime() - 3600_000), null);
    await recordActualTime(owner, session.id, "actualEndAt", end, null);
    const r = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry() });
    expect(r).toMatchObject({ ok: false, code: "ENTRY_CLOSED" });
    const rejected = await prisma.studyEvent.findFirst({ where: { type: "SUBMISSION_REJECTED" } });
    expect(rejected?.detail).toMatchObject({ reason: "DEADLINE_PASSED" });
  });

  it("is open until actual end + 2 h and the deadline is derived, not invented", async () => {
    const { owner, session } = await makeActiveStudy();
    let s = await prisma.streamSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(s.entryDeadlineAt).toBeNull();
    const end = new Date(Date.now() - 60 * 60 * 1000);
    await recordActualTime(owner, session.id, "actualEndAt", end, null);
    s = await prisma.streamSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(s.entryDeadlineAt?.getTime()).toBe(end.getTime() + 2 * 60 * 60 * 1000);
    const v = await newVisit();
    const r = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry() });
    expect(r.ok).toBe(true);
  });

  it("corrections are logged and require a reason", async () => {
    const { owner, session } = await makeActiveStudy();
    await recordActualTime(owner, session.id, "actualEndAt", new Date(), null);
    await expect(recordActualTime(owner, session.id, "actualEndAt", new Date(), null)).rejects.toThrow(/reason/);
    await recordActualTime(owner, session.id, "actualEndAt", new Date(), "typo");
    expect(await prisma.sessionTimingChange.count({ where: { streamSessionId: session.id } })).toBe(2);
  });

  it("manual close stops entries and the session is not reopened", async () => {
    const { owner, session } = await makeActiveStudy();
    const v = await newVisit();
    await closeSessionEntries(owner, session.id, "done");
    const r = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry() });
    expect(r.ok).toBe(false);
    await expect(activateSession(owner, session.id)).rejects.toThrow(/closed/);
  });
});

describe("sequential sessions and attribution", () => {
  it("refuses overlapping active study sessions", async () => {
    const a = await makeActiveStudy();
    const b = await makeStudy({ owner: a.owner });
    await expect(activateSession(a.owner, b.session.id)).rejects.toThrow(/Another study session is active/);
  });

  it("a returning browser is attributed to the current session, not its old one", async () => {
    const a = await makeActiveStudy();
    const link = await prisma.trackingLink.create({
      data: { experimentId: a.experiment.id, streamSessionId: a.session.id, streamerId: a.streamer.id, uniqueCode: "OLDLINK1", entrySource: "STREAM_DESCRIPTION" },
    });
    const first = await newVisit(null, link.uniqueCode);
    expect(first.visit).toMatchObject({ streamSessionId: a.session.id, attributionSource: "TRACKING_LINK", trackingLinkId: link.id });

    await closeSessionEntries(a.owner, a.session.id, null);
    const b = await makeStudy({ owner: a.owner });
    await activateSession(a.owner, b.session.id);

    const returning = await newVisit(first.token, link.uniqueCode);
    expect(returning.visitorId).toBe(first.visitorId);
    expect(returning.visit.streamSessionId).toBe(b.session.id);
    expect(returning.visit).toMatchObject({ attributionSource: "STALE_TRACKING_LINK", trackingLinkId: null, receivedRefCode: "OLDLINK1" });

    const unknown = await newVisit(null, "NOPE");
    expect(unknown.visit.attributionSource).toBe("UNKNOWN_TRACKING_CODE");
    const direct = await newVisit(null, null);
    expect(direct.visit.attributionSource).toBe("ACTIVE_SESSION");
  });

  it("a refresh within the timeout resumes the visit; a config edit starts a new one", async () => {
    const a = await makeActiveStudy();
    const v1 = await newVisit();
    const v2 = await newVisit(v1.token);
    expect(v2.visit.id).toBe(v1.visit.id);
    expect(v2.resumed).toBe(true);
    await saveSessionConfig(a.owner, a.session.id, { ...(await defaultConfigInputFor(a.session.id)), welcomeText: "Edited" });
    const v3 = await newVisit(v1.token);
    expect(v3.visit.id).not.toBe(v1.visit.id);
    expect(v3.visit.configId).not.toBe(v1.visit.configId);
  });

  it("everyone in a session gets the same configuration", async () => {
    await makeActiveStudy();
    const visits = await Promise.all([newVisit(), newVisit(), newVisit()]);
    expect(new Set(visits.map((v) => v.visit.configId)).size).toBe(1);
  });
});

describe("live collection gate", () => {
  it("a LIVE session cannot be activated while required decisions are pending", async () => {
    const s = await makeStudy({ mode: "LIVE" });
    await prisma.experiment.update({ where: { id: s.experiment.id }, data: { ethicsApprovalRef: "IRB-TEST" } });
    await expect(activateSession(s.owner, s.session.id)).rejects.toThrow(/blocked until these decisions are approved/);
  });
});

describe("funnel counts", () => {
  it("counts distinct visits per stage, separately from event totals", async () => {
    await makeActiveStudy();
    const v1 = await newVisit();
    const v2 = await newVisit();
    for (let i = 0; i < 3; i++) await prisma.studyEvent.create({ data: { visitId: v1.visit.id, experimentId: v1.visit.experimentId, streamSessionId: v1.visit.streamSessionId, type: "FORM_OPENED" } });
    await recordStudyEvent(prisma, v1.visit, { type: "LANDING_VIEWED" });
    await recordStudyEvent(prisma, v1.visit, { type: "LANDING_VIEWED" }); // refresh — recorded once
    await recordStudyEvent(prisma, v2.visit, { type: "LANDING_VIEWED" });
    const f = await sessionFunnel(v1.visit.streamSessionId);
    expect(f.visits).toBe(2);
    expect(f.stages.find((s) => s.type === "LANDING_VIEWED")?.visits).toBe(2);
    const form = f.stages.find((s) => s.type === "FORM_OPENED")!;
    expect(form.visits).toBe(1);
    expect(form.ofLanding).toBe(0.5);
    expect(f.eventTotals.FORM_OPENED).toBe(3);
    expect(f.eventTotals.LANDING_VIEWED).toBe(2);
  });
});
