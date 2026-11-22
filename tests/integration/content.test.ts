import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { loadPublicPage } from "@/lib/study/public-page";
import { defaultConfigInputFor, saveSessionConfig, closeSessionEntries } from "@/lib/study/sessions";
import { getSiteContent } from "@/lib/queries/research";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";
import { DRAW_TIMING_COPY } from "@/lib/study/constants";
import { makeActiveStudy, makeResearcher, makeStudy, newVisit, resetDb } from "../support/fixtures";

beforeEach(resetDb);

describe("public content sources", () => {
  it("falls back to defaults when no CMS row exists, and serves the saved row once there is one", async () => {
    expect(await getSiteContent()).toBeNull(); // pages then render DEFAULT_SITE_CONTENT
    const page = await loadPublicPage();
    expect(page.kind).toBe("idle");
    if (page.kind === "idle") expect(page.props.homepage.heroSubtext).toContain("after the campaign's entry collection has closed");

    await prisma.siteContent.create({
      data: { id: "singleton", ...DEFAULT_SITE_CONTENT, supportContent: { ...DEFAULT_SITE_CONTENT.supportContent, pageTitle: "Help desk" } },
    });
    expect((await getSiteContent())?.supportContent.pageTitle).toBe("Help desk");
  });

  it("a session config edit shows on the public page; visits keep the version they saw", async () => {
    const s = await makeActiveStudy();
    const v1 = await newVisit();
    const input = await defaultConfigInputFor(s.session.id);
    expect(JSON.stringify(input)).toContain(DRAW_TIMING_COPY);
    await saveSessionConfig(s.owner, s.session.id, {
      ...input,
      homepageContent: { ...input.homepageContent, heroSubtext: "Edited subtext for QA" },
    });
    const page = await loadPublicPage();
    expect(page.kind === "open" && page.props.homepage.heroSubtext).toBe("Edited subtext for QA");
    // The earlier visit's snapshot is unchanged (immutable config versions).
    const visit = await prisma.visit.findUniqueOrThrow({ where: { id: v1.visit.id }, include: { config: true } });
    expect(visit.config.version).toBe(1);
    expect((visit.config.homepageContent as { heroSubtext: string }).heroSubtext).not.toBe("Edited subtext for QA");
  });

  it("only researchers with write access to that campaign can edit its config; campaign A edits never touch B", async () => {
    const a = await makeActiveStudy();
    await closeSessionEntries(a.owner, a.session.id, null);
    const b = await makeStudy();
    const outsider = await makeResearcher();
    const input = await defaultConfigInputFor(a.session.id);
    await expect(saveSessionConfig(outsider, a.session.id, input)).rejects.toThrow(/not permitted/);
    await expect(saveSessionConfig(b.owner, a.session.id, input)).rejects.toThrow(/not permitted/);

    const beforeB = await prisma.sessionConfig.findMany({ where: { streamSessionId: b.session.id } });
    await saveSessionConfig(a.owner, a.session.id, { ...input, welcomeText: "Only A changes" });
    const afterB = await prisma.sessionConfig.findMany({ where: { streamSessionId: b.session.id } });
    expect(afterB).toEqual(beforeB);
  });
});
