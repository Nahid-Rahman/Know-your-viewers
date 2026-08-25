import type { Experiment, Streamer, TrackingLink, FunnelStage } from "@/types/research";

export const mockStreamers: Streamer[] = [
  {
    id: "str_1",
    displayName: "RafiqPlaysBD",
    platform: "Facebook Gaming",
    channelUrl: "https://facebook.com/rafiqplaysbd",
    category: "Mobile Battle Royale",
    status: "ACTIVE",
    assignedExperiments: 1,
    totalClicks: 2140,
    createdAt: "2026-06-02",
  },
  {
    id: "str_2",
    displayName: "NovaTacticalFPS",
    platform: "YouTube",
    channelUrl: "https://youtube.com/@novatacticalfps",
    category: "Tactical FPS",
    status: "ACTIVE",
    assignedExperiments: 1,
    totalClicks: 1580,
    createdAt: "2026-06-10",
  },
  {
    id: "str_3",
    displayName: "CircuitCODMobile",
    platform: "Twitch",
    channelUrl: "https://twitch.tv/circuitcodmobile",
    category: "Mobile FPS",
    status: "PENDING",
    assignedExperiments: 0,
    totalClicks: 0,
    createdAt: "2026-08-01",
  },
];

export const mockExperiments: Experiment[] = [
  {
    id: "exp_1",
    title: "Persuasion Cues in Viewer Reward Recruitment",
    description:
      "Studies whether urgency framing, social proof, and authority badges independently affect a viewer's willingness to disclose contact information in a livestream reward funnel.",
    objective:
      "Identify which individual persuasion element most strongly predicts contact disclosure.",
    status: "ACTIVE",
    startDate: "2026-07-01",
    endDate: null,
    ethicsApprovalRef: "IRB-2026-0417",
    researcherName: "M. Rahman",
    participantCount: 812,
    completionRate: 64,
    assignedStreamerIds: ["str_1", "str_2"],
    createdAt: "2026-06-20",
    conditions: [
      {
        id: "cond_1",
        name: "Control (no cues)",
        urgencyEnabled: false,
        socialProofEnabled: false,
        authorityBadgesEnabled: false,
        rewardRarity: "common",
        contactRequirement: "optional",
        participantCount: 203,
        disclosureRate: 28,
      },
      {
        id: "cond_2",
        name: "Urgency only",
        urgencyEnabled: true,
        socialProofEnabled: false,
        authorityBadgesEnabled: false,
        rewardRarity: "common",
        contactRequirement: "optional",
        participantCount: 198,
        disclosureRate: 41,
      },
      {
        id: "cond_3",
        name: "Social proof only",
        urgencyEnabled: false,
        socialProofEnabled: true,
        authorityBadgesEnabled: false,
        rewardRarity: "common",
        contactRequirement: "optional",
        participantCount: 205,
        disclosureRate: 37,
      },
      {
        id: "cond_4",
        name: "Full stimulus (all cues)",
        urgencyEnabled: true,
        socialProofEnabled: true,
        authorityBadgesEnabled: true,
        rewardRarity: "exceptional",
        contactRequirement: "required",
        participantCount: 206,
        disclosureRate: 58,
      },
    ],
  },
  {
    id: "exp_2",
    title: "Reward Rarity and Trust Perception (Pilot)",
    description:
      "Pilot study on whether the rarity tier shown at the reward reveal changes self-reported trust in the event's legitimacy.",
    objective: "Pilot the rarity manipulation ahead of a full factorial follow-up.",
    status: "DRAFT",
    startDate: "2026-09-01",
    endDate: null,
    ethicsApprovalRef: null,
    researcherName: "M. Rahman",
    participantCount: 0,
    completionRate: 0,
    assignedStreamerIds: [],
    createdAt: "2026-08-10",
    conditions: [],
  },
];

export const mockTrackingLinks: TrackingLink[] = [
  { id: "lnk_1", experimentId: "exp_1", streamerId: "str_1", uniqueCode: "RFQ-8KX2", visits: 1420, conversions: 812 },
  { id: "lnk_2", experimentId: "exp_1", streamerId: "str_2", uniqueCode: "NVA-3PL9", visits: 940, conversions: 0 },
].map((l) => ({ ...l, createdAt: "2026-07-01" }));

export const mockFunnel: FunnelStage[] = [
  { stage: "Landed", count: 2360 },
  { stage: "Spun", count: 1740 },
  { stage: "Opened entry form", count: 1120 },
  { stage: "Submitted contact", count: 812 },
  { stage: "Reached debrief", count: 812 },
  { stage: "Granted permission", count: 690 },
];

export const mockDisclosureByCondition = mockExperiments[0].conditions.map((c) => ({
  name: c.name,
  disclosureRate: c.disclosureRate,
}));

export type MockParticipantRow = {
  anonymousCode: string;
  conditionName: string;
  consentStatus: "PENDING" | "GRANTED" | "DECLINED";
  spun: boolean;
  submittedContact: boolean;
  debriefed: boolean;
  permissionGiven: boolean | null;
};

/**
 * Deliberately excludes emailOrPhone / streamNickname — contact details live
 * in a separate encrypted table and are never rendered in this dashboard.
 */
export function getParticipantRows(experimentId: string): MockParticipantRow[] {
  const exp = mockExperiments.find((e) => e.id === experimentId);
  if (!exp || exp.conditions.length === 0) return [];

  const rows: MockParticipantRow[] = [];
  let n = 0;
  for (const cond of exp.conditions) {
    const sample = Math.min(cond.participantCount, 6);
    for (let i = 0; i < sample; i++) {
      n += 1;
      const spun = true;
      const submitted = i / sample < cond.disclosureRate / 100;
      const debriefed = submitted;
      const permission = debriefed ? i % 4 !== 0 : null;
      rows.push({
        anonymousCode: `P-${String(1000 + n)}`,
        conditionName: cond.name,
        consentStatus: "GRANTED",
        spun,
        submittedContact: submitted,
        debriefed,
        permissionGiven: permission,
      });
    }
  }
  return rows;
}

export function getExperimentById(id: string) {
  return mockExperiments.find((e) => e.id === id) ?? null;
}

export function getStreamerById(id: string) {
  return mockStreamers.find((s) => s.id === id) ?? null;
}
