import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { activateSession, defaultConfigInputFor, saveSessionConfig } from "@/lib/study/sessions";
import { startOrResumeVisit, getActiveStudySession } from "@/lib/study/visits";

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

export async function makeResearcher(email = `r-${randomUUID()}@test.local`) {
  return prisma.user.create({ data: { supabaseId: randomUUID(), name: "Test Researcher", email, role: "RESEARCHER" } });
}

export async function makeStudy(opts: { mode?: "TEST" | "LIVE"; owner?: { id: string; role: string } } = {}) {
  const owner = opts.owner ?? (await makeResearcher());
  const streamerUser = await prisma.user.create({
    data: { supabaseId: randomUUID(), name: "Streamer", email: `s-${randomUUID()}@test.local`, role: "STREAMER" },
  });
  const streamer = await prisma.streamer.create({
    data: { userId: streamerUser.id, displayName: "TestStreamer", platform: "YouTube", channelUrl: "https://youtube.com/@t", category: "Gaming" },
  });
  const experiment = await prisma.experiment.create({
    data: { title: "Campaign", description: "d", objective: "o", startDate: new Date(), researcherId: owner.id },
  });
  const session = await prisma.streamSession.create({
    data: { experimentId: experiment.id, streamerId: streamer.id, collectionMode: opts.mode ?? "TEST", streamTitle: "S1" },
  });
  await saveSessionConfig(owner, session.id, await defaultConfigInputFor(session.id));
  return { owner, streamer, experiment, session };
}

export async function makeActiveStudy(opts: { mode?: "TEST" | "LIVE" } = {}) {
  const s = await makeStudy(opts);
  await activateSession(s.owner, s.session.id);
  return s;
}

export async function newVisit(token: string | null = null, ref: string | null = null) {
  const active = await getActiveStudySession();
  if (!active) throw new Error("no active session");
  const r = await startOrResumeVisit({ token, ref, referrerHost: null, session: active });
  return { ...r, token: r.newToken ?? token };
}

export const validEntry = (phone = "01712345678", extra: Record<string, unknown> = {}) => ({
  phone,
  ageGroup: "AGE_18_30",
  email: "",
  ign: "",
  socialType: "",
  socialHandle: "",
  ...extra,
});

export const key = () => randomUUID();
