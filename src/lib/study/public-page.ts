import "server-only";
import { prisma } from "@/lib/prisma";
import { approvedNotice } from "./policy";
import { DEFAULT_REWARD_CONFIG, parseRewardConfig } from "./reward";
import { homepageContentSchema, DEFAULT_HOMEPAGE_CONTENT } from "./sessions";
import { entryState } from "./session-state";
import { formatStudyTime } from "./time";
import { getActiveStudySession } from "./visits";
import { getSiteContent } from "@/lib/queries/research";
import type { StudyHomeProps } from "@/features/study/study-home";
import type { IdleHomeProps } from "@/features/study/idle-home";

export type PublicPageState =
  | { kind: "idle"; props: IdleHomeProps }
  | { kind: "open"; props: Omit<StudyHomeProps, "refCode"> };

const toReelItems = (items: { key: string; label: string; sub: string; tier: StudyHomeProps["reel"]["items"][number]["tier"] }[]) =>
  items.map((i) => ({ key: i.key, label: i.label, sub: i.sub, tier: i.tier }));

/** Everything the public homepage needs, decided on the server with server time. */
export async function loadPublicPage(now = new Date()): Promise<PublicPageState> {
  // Trust badges and game categories stay site-wide CMS content (Settings → Stimulus Content).
  const site = await getSiteContent();
  const sections = {
    trustBadges: (site?.trustBadges ?? []) as StudyHomeProps["sections"]["trustBadges"],
    gameCategories: (site?.gameCategories ?? []) as StudyHomeProps["sections"]["gameCategories"],
  };
  const session = await getActiveStudySession();
  // No session running: the full site stays visible with neutral defaults,
  // but nothing can be spun or submitted and no visit is recorded.
  if (!session?.currentConfig) {
    // Show the most recent study session's streamer, if there has been one.
    const last = await prisma.streamSession.findFirst({
      where: { sessionType: "STUDY", currentConfigId: { not: null }, activatedAt: { not: null } },
      include: { currentConfig: true },
      orderBy: { activatedAt: "desc" },
    });
    const lastCfg = last?.currentConfig;
    return {
      kind: "idle",
      props: {
        branding: lastCfg
          ? {
              streamerDisplayName: lastCfg.streamerDisplayName,
              streamerImageUrl: lastCfg.streamerImageUrl,
              welcomeText: lastCfg.welcomeText,
              channelUrl: lastCfg.channelUrl,
              platform: lastCfg.platform,
            }
          : null,
        homepage: {
          ...DEFAULT_HOMEPAGE_CONTENT,
          heroSubtext:
            "During a collaborating streamer's session you can spin the wheel and leave your phone number for a chance to win a prize from the prize pool. Winners are picked at random after each session.",
        },
        reelItems: toReelItems(DEFAULT_REWARD_CONFIG.displayItems),
        statusTitle: "Entries open during the next collaborating stream",
        statusText: "Watch for the link in a collaborating streamer's stream description. The wheel and entry form open while the stream is live and for two hours after it ends.",
        sections,
      },
    };
  }
  const cfg = session.currentConfig;
  const state = entryState(session, now);
  const reward = parseRewardConfig(cfg.rewardConfig);
  const homepage = homepageContentSchema.safeParse(cfg.homepageContent);
  if (!state.accepting) {
    return {
      kind: "idle",
      props: {
        branding: {
          streamerDisplayName: cfg.streamerDisplayName,
          streamerImageUrl: cfg.streamerImageUrl,
          welcomeText: cfg.welcomeText,
          channelUrl: cfg.channelUrl,
          platform: cfg.platform,
        },
        homepage: homepage.success ? homepage.data : DEFAULT_HOMEPAGE_CONTENT,
        reelItems: toReelItems(reward.displayItems),
        statusTitle: `Entries for ${cfg.streamerDisplayName}'s session are closed`,
        statusText: `${state.deadline ? `Entries closed ${formatStudyTime(state.deadline)}. ` : ""}Thanks for watching — draw winners will be contacted by phone after the draw.`,
        sections,
      },
    };
  }

  const policies = await prisma.studyPolicyDecision.findMany({ where: { experimentId: session.experimentId } });
  const records = policies.map((p) => ({ key: p.key, status: p.status, value: p.value }));
  const notice =
    approvedNotice(records) ??
    (session.collectionMode === "TEST"
      ? (() => {
          const draft = records.find((r) => r.key === "COLLECTION_NOTICE")?.value as { noticeText?: string; noticeVersion?: string } | null;
          return draft?.noticeText ? { text: `[Draft notice] ${draft.noticeText}`, version: draft.noticeVersion ?? "draft" } : null;
        })()
      : null);

  return {
    kind: "open",
    props: {
      configId: cfg.id,
      branding: {
        streamerDisplayName: cfg.streamerDisplayName,
        streamerImageUrl: cfg.streamerImageUrl,
        welcomeText: cfg.welcomeText,
        channelUrl: cfg.channelUrl,
        platform: cfg.platform,
      },
      homepage: homepage.success ? homepage.data : DEFAULT_HOMEPAGE_CONTENT,
      reel: {
        items: toReelItems(reward.displayItems),
        resultHeadline: reward.resultHeadline,
        resultExplanation: reward.resultExplanation,
      },
      deadlineIso: state.deadline ? state.deadline.toISOString() : null,
      sections,
      isTest: session.collectionMode === "TEST",
      notice,
    },
  };
}
