// Synthetic demo data for the revised study flow — LOCAL DATABASES ONLY.
// Creates a campaign owned by the seeded researcher with: one ACTIVE TEST
// study session (B), one normal baseline session (A) with platform metrics,
// synthetic visits/events/submissions including duplicates and an under-18
// entry. Run after `prisma db seed`:
//   npm run local -- npx tsx --conditions=react-server scripts/seed-study-demo.mts
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { activateSession, defaultConfigInputFor, recordActualTime, saveSessionConfig } from "../src/lib/study/sessions";
import { getActiveStudySession, startOrResumeVisit } from "../src/lib/study/visits";
import { recordStudyEvent } from "../src/lib/study/events";
import { spinForVisit, submitEntryForVisit } from "../src/lib/study/submissions";

if (process.env.LDA_LOCAL_DB !== "1" || !/@(127\.0\.0\.1|localhost):/.test(process.env.DATABASE_URL ?? "")) {
  console.error("Refusing to run: this script only writes to the local development database (use `npm run local -- …`).");
  process.exit(1);
}

const researcher = await prisma.user.findUniqueOrThrow({ where: { email: "researcher@example.edu" } });
const actor = { id: researcher.id, role: researcher.role };
const streamer = await prisma.streamer.findFirstOrThrow({ where: { user: { email: "rafiq@example.com" } } });

const existingActive = await prisma.streamSession.findFirst({ where: { status: "ACTIVE", sessionType: "STUDY" } });
if (existingActive) await prisma.streamSession.update({ where: { id: existingActive.id }, data: { status: "CLOSED", entriesClosedAt: new Date() } });

const experiment = await prisma.experiment.create({
  data: {
    title: "Streamer trust pilot (synthetic demo)",
    description: "Synthetic demo campaign for local testing.",
    objective: "Exercise the revised session-configured flow.",
    startDate: new Date(),
    researcherId: researcher.id,
    streamers: { create: { streamerId: streamer.id } },
  },
});

const hour = 3600_000;
const baseline = await prisma.streamSession.create({
  data: {
    experimentId: experiment.id,
    streamerId: streamer.id,
    sessionType: "NORMAL_BASELINE",
    streamTitle: "Regular Friday stream",
    gameName: "PUBG Mobile",
    platform: "YouTube",
  },
});
await recordActualTime(actor, baseline.id, "actualStartAt", new Date(Date.now() - 30 * hour), null);
await recordActualTime(actor, baseline.id, "actualEndAt", new Date(Date.now() - 28 * hour), null);
await prisma.platformMetric.create({
  data: {
    streamSessionId: baseline.id, platform: "YouTube", source: "YouTube Studio export (synthetic)", measuredAt: new Date(Date.now() - 20 * hour),
    durationMinutes: 120, views: 1830, avgConcurrentViewers: 210, peakConcurrentViewers: 344, watchTimeMinutes: 25100, comments: 912, recordedById: researcher.id,
  },
});

const session = await prisma.streamSession.create({
  data: {
    experimentId: experiment.id,
    streamerId: streamer.id,
    sessionType: "STUDY",
    collectionMode: "TEST",
    streamTitle: "Late-night ranked grind 🔍",
    gameName: "PUBG Mobile",
    platform: "YouTube",
  },
});
await saveSessionConfig(actor, session.id, {
  ...(await defaultConfigInputFor(session.id)),
  streamerDisplayName: "RafiqPlaysBD",
  welcomeText: "Thanks for watching RafiqPlaysBD! This page is part of a university research study run in collaboration with the stream.",
});
await activateSession(actor, session.id);
await recordActualTime(actor, session.id, "actualStartAt", new Date(Date.now() - 1.5 * hour), null);
await prisma.trackingLink.create({
  data: { experimentId: experiment.id, streamerId: streamer.id, streamSessionId: session.id, uniqueCode: `DEMO${randomUUID().slice(0, 4).toUpperCase()}`, entrySource: "STREAM_DESCRIPTION" },
});
await prisma.platformMetric.create({
  data: {
    streamSessionId: session.id, platform: "YouTube", source: "YouTube Studio export (synthetic)", measuredAt: new Date(),
    durationMinutes: 95, views: 1504, avgConcurrentViewers: 188, peakConcurrentViewers: 301, comments: 760, recordedById: researcher.id,
  },
});
await prisma.sessionAnnotation.create({
  data: { streamSessionId: session.id, type: "CHAT_QUESTION", occurredAt: new Date(Date.now() - 50 * 60_000), note: "Viewer asked in chat what the link was", createdById: researcher.id },
});

const active = (await getActiveStudySession())!;
const phones = ["01711000001", "01711000002", "01811000003", "01911000004", "01511000005", "01611000006", "01311000007", "01711000008"];
let n = 0;
for (let i = 0; i < 24; i++) {
  const v = await startOrResumeVisit({ token: null, ref: null, referrerHost: i % 3 ? "m.youtube.com" : null, session: active });
  // Spread visits over the last 80 minutes for the traffic chart (applied after the
  // actions below, which need a live visit).
  const startedAt = new Date(Date.now() - (80 - i * 3) * 60_000);
  const backdate = () =>
    prisma.visit.update({ where: { id: v.visit.id }, data: { startedAt, lastSeenAt: new Date(startedAt.getTime() + (30 + i * 9) * 1000), activeMs: (20 + i * 6) * 1000 } });
  await recordStudyEvent(prisma, v.visit, { type: "LANDING_VIEWED" });
  if (i % 4 === 3) {
    await backdate(); // left early
    continue;
  }
  await recordStudyEvent(prisma, v.visit, { type: "REWARD_SECTION_VIEWED" });
  if (i % 5 === 4) {
    await backdate();
    continue;
  }
  await spinForVisit(v.visitorId, v.visit.id);
  await recordStudyEvent(prisma, v.visit, { type: "SPIN_COMPLETED" });
  await recordStudyEvent(prisma, v.visit, { type: "FORM_OPENED" });
  await recordStudyEvent(prisma, v.visit, { type: "FIELD_INTERACTED", element: "phone" });
  await recordStudyEvent(prisma, v.visit, { type: "SUBMISSION_ATTEMPTED" });
  const phone = phones[n % phones.length];
  const r = await submitEntryForVisit({
    visitorId: v.visitorId,
    visitId: v.visit.id,
    idempotencyKey: randomUUID(),
    values: {
      phone,
      ageGroup: n === 2 ? "BELOW_18" : n % 2 ? "AGE_31_PLUS" : "AGE_18_30",
      email: n % 3 === 0 ? `viewer${n}@example.com` : "",
      ign: n % 2 === 0 ? `Player${n}` : "",
      socialType: n % 4 === 1 ? "DISCORD" : "",
      socialHandle: n % 4 === 1 ? `viewer_${n}` : "",
    },
  });
  if (r.ok) await prisma.submission.update({ where: { id: r.submissionId }, data: { submittedAt: new Date(startedAt.getTime() + 60_000) } });
  await backdate();
  n++;
}
console.log(`Demo campaign ${experiment.id}: ${n} synthetic submissions (some duplicates), session ${session.id} active in TEST mode.`);
await prisma.$disconnect();
