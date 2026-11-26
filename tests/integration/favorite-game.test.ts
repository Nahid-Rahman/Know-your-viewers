import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { submitEntryForVisit } from "@/lib/study/submissions";
import { purgeResearchData, recordPermission } from "@/lib/study/submission-admin";
import { buildStudyExport } from "@/lib/study/exports";
import { answerFavoriteGame, favoriteGameChoices } from "@/lib/study/favorite-game";
import { key, makeActiveStudy, newVisit, resetDb, validEntry } from "../support/fixtures";

beforeEach(async () => {
  await resetDb();
  await prisma.siteContent.create({
    data: {
      id: "singleton",
      heroHeadline: "h",
      heroSubtext: "s",
      claimedCount: "1",
      countdownSeconds: 1,
      trustBadges: [],
      gameCategories: [
        { icon: "x", image: "/a.jpg", tag: "T", title: "FC 27", description: "d" },
        { icon: "x", image: "/b.jpg", tag: "T", title: "GTA VI", description: "d" },
      ],
      rewardPool: [],
      gameTypeOptions: [],
      watchFrequencyOptions: [],
      faqItems: [],
    },
  });
});

async function submit(phone: string) {
  const v = await newVisit();
  const r = await submitEntryForVisit({ visitorId: v.visitorId, visitId: v.visit.id, idempotencyKey: key(), values: validEntry(phone) });
  if (!r.ok) throw new Error(r.error);
  return { visitorId: v.visitorId, id: r.submissionId };
}

describe("confirmation-page favourite game poll", () => {
  it("offers the featured game titles plus Other", async () => {
    expect(await favoriteGameChoices()).toEqual(["FC 27", "GTA VI", "Other"]);
  });

  it("stores one answer, only from the submitting browser, only from the list", async () => {
    await makeActiveStudy();
    const a = await submit("01700002001");
    const other = await submit("01700002002");

    expect((await answerFavoriteGame(other.visitorId, a.id, "FC 27")).ok).toBe(false);
    expect((await answerFavoriteGame(a.visitorId, a.id, "Not a listed game")).ok).toBe(false);
    expect(await answerFavoriteGame(a.visitorId, a.id, "GTA VI")).toEqual({ ok: true, choice: "GTA VI" });
    // A second answer keeps the first.
    expect(await answerFavoriteGame(a.visitorId, a.id, "FC 27")).toEqual({ ok: true, choice: "GTA VI" });

    const row = await prisma.submission.findUniqueOrThrow({ where: { id: a.id } });
    expect(row.favoriteGame).toBe("GTA VI");
    expect(row.favoriteGameAt).not.toBeNull();
  });

  it("appears in the research export and is removed by a research-data purge", async () => {
    const s = await makeActiveStudy();
    const a = await submit("01700002101");
    await prisma.submission.update({ where: { id: a.id }, data: { isTest: false } });
    await answerFavoriteGame(a.visitorId, a.id, "FC 27");
    await recordPermission(s.owner, a.id, { type: "WEBSITE_DATA_USE", status: "GRANTED", noticeVersion: "v1", method: "PHONE_CALL" });

    const { csv } = await buildStudyExport(s.owner, "research-submissions", s.experiment.id);
    const [header, line] = csv.trim().split("\n");
    const col = header.split(",").indexOf("favorite_game");
    expect(col).toBeGreaterThan(-1);
    expect(line.split(",")[col]).toBe("FC 27");

    await recordPermission(s.owner, a.id, { type: "WEBSITE_DATA_USE", status: "WITHDRAWN", noticeVersion: "v1", method: "PHONE_CALL" });
    await purgeResearchData(s.owner, a.id, { dryRun: false });
    const row = await prisma.submission.findUniqueOrThrow({ where: { id: a.id } });
    expect(row.favoriteGame).toBeNull();
    expect((await answerFavoriteGame(a.visitorId, a.id, "GTA VI")).ok).toBe(false);
  });
});
