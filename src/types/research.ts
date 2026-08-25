export type Role = "RESEARCHER" | "STREAMER" | "PARTICIPANT";
export type ExperimentStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type StreamerStatus = "PENDING" | "ACTIVE" | "INACTIVE";
export type ConsentStatus = "PENDING" | "GRANTED" | "DECLINED";

export type Condition = {
  id: string;
  name: string;
  urgencyEnabled: boolean;
  socialProofEnabled: boolean;
  authorityBadgesEnabled: boolean;
  rewardRarity: "common" | "rare" | "exceptional" | "premium";
  contactRequirement: "optional" | "required";
  participantCount: number;
  disclosureRate: number; // 0-100, % who submitted contact info
};

export type Experiment = {
  id: string;
  title: string;
  description: string;
  objective: string;
  status: ExperimentStatus;
  startDate: string;
  endDate: string | null;
  ethicsApprovalRef: string | null;
  researcherName: string;
  conditions: Condition[];
  participantCount: number;
  completionRate: number;
  assignedStreamerIds: string[];
  createdAt: string;
};

export type Streamer = {
  id: string;
  displayName: string;
  platform: "Twitch" | "YouTube" | "Facebook Gaming";
  channelUrl: string;
  category: string;
  status: StreamerStatus;
  assignedExperiments: number;
  totalClicks: number;
  createdAt: string;
};

export type TrackingLink = {
  id: string;
  experimentId: string;
  streamerId: string | null;
  uniqueCode: string;
  visits: number;
  conversions: number;
  createdAt: string;
};

export type FunnelStage = {
  stage: string;
  count: number;
};
