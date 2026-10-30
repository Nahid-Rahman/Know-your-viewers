import "server-only";
import { prisma } from "@/lib/prisma";
import { approvedNotice } from "./policy";
import { parseRewardConfig } from "./reward";
import { homepageContentSchema, DEFAULT_HOMEPAGE_CONTENT } from "./sessions";
import { entryState } from "./session-state";
import { formatStudyTime } from "./time";
import { getActiveStudySession } from "./visits";
import type { StudyHomeProps } from "@/features/study/study-home";

export type PublicPageState =
  | { kind: "none" }
  | { kind: "closed"; streamerName: string; deadlineText: string | null }
  | { kind: "open"; props: Omit<StudyHomeProps, "refCode"> };

/** Everything the public homepage needs, decided on the server with server time. */
export async function loadPublicPage(now = new Date()): Promise<PublicPageState> {
  const session = await getActiveStudySession();
  if (!session?.currentConfig) return { kind: "none" };
  const cfg = session.currentConfig;
  const state = entryState(session, now);
  if (!state.accepting) {
    return {
      kind: "closed",
      streamerName: cfg.streamerDisplayName,
      deadlineText: state.deadline ? `Entries closed ${formatStudyTime(state.deadline)}` : null,
    };
  }

  const reward = parseRewardConfig(cfg.rewardConfig);
  const homepage = homepageContentSchema.safeParse(cfg.homepageContent);
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
        items: reward.displayItems.map((i) => ({ key: i.key, label: i.label, sub: i.sub, tier: i.tier })),
        resultHeadline: reward.resultHeadline,
        resultExplanation: reward.resultExplanation,
      },
      deadlineText: state.deadline ? `Entries close ${formatStudyTime(state.deadline)}` : null,
      isTest: session.collectionMode === "TEST",
      notice,
    },
  };
}
