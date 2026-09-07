// Deliberately its own tiny, dependency-free module: `data-tables.ts` is
// `server-only` (it imports Prisma at module scope), so a Client Component
// can't import even a plain constant from it without pulling the whole
// server module graph (and Node-only `pg` internals) into the browser bundle.

export type DataTableKey =
  | "participants"
  | "participant_sessions"
  | "participant_events"
  | "participant_responses"
  | "streamers"
  | "stream_sessions"
  | "recruitment_sources"
  | "participant_contacts"
  | "debrief_records"
  | "data_use_permissions"
  | "interview_consents"
  | "interviews"
  | "research_eligibility";

export const DATA_TABLE_OPTIONS: { key: DataTableKey; label: string; description: string }[] = [
  {
    key: "participants",
    label: "Participants",
    description:
      "Core roster — experiment/condition, streamer/link, consent status, and reward outcome for every participant. Use for sample-composition checks and confirming conditions are balanced.",
  },
  {
    key: "participant_sessions",
    label: "Participant Sessions",
    description:
      "Where each participant currently stands in the funnel (landing → reward → contact → debrief) and whether they completed or dropped. Use for funnel/drop-off analysis and comparing completion rates across entry sources.",
  },
  {
    key: "participant_events",
    label: "Participant Events",
    description:
      "The full raw, timestamped action log (page views, clicks, submissions) per participant. Use for time-on-task, click-sequence, and engagement-depth analysis.",
  },
  {
    key: "participant_responses",
    label: "Participant Responses",
    description:
      "Every answered optional-survey question with its text and the participant's answer. Use for analyzing self-reported trust, motivation, or any other survey-based measure.",
  },
  {
    key: "streamers",
    label: "Streamers",
    description:
      "Roster of streamer partners with platform, category, and status. Use for a quick check of recruitment-partner capacity and coverage.",
  },
  {
    key: "stream_sessions",
    label: "Stream Sessions",
    description:
      "Each individual broadcast used for recruitment — game, timing, and estimated audience size. Use to relate a participant's behavior back to the specific stream and audience they came from.",
  },
  {
    key: "recruitment_sources",
    label: "Recruitment Sources",
    description:
      "Each tracking link's entry source (QR / chat link / description / direct), streamer, and visit/conversion counts. Use to compare which recruitment channel converts best.",
  },
  {
    key: "participant_contacts",
    label: "Participant Contacts",
    description:
      "Which participants submitted contact info, plus the game-related metadata they gave (nickname, favourite game, viewing frequency) — decrypted email/phone are never shown here. Use for reward-claim volume and self-reported viewer-profile analysis.",
  },
  {
    key: "debrief_records",
    label: "Debrief Records",
    description:
      "Debrief status/method and the on-page permission answer for every participant who reached (or was manually run through) the debrief step. Use for debrief-completion-rate analysis.",
  },
  {
    key: "data_use_permissions",
    label: "Data Use Permissions",
    description:
      "The consent decision behind each participant's data-use permission, including any later withdrawal. Use to see the exact grant/decline/withdrawn breakdown behind the study's consent numbers.",
  },
  {
    key: "interview_consents",
    label: "Interview Consents",
    description:
      "Who was invited to a follow-up interview, their consent answer, and current candidate status. Use for interview-recruitment funnel analysis (invited → accepted → scheduled).",
  },
  {
    key: "interviews",
    label: "Interviews",
    description:
      "Scheduled and completed interview records — mode, duration, free-form themes, and summary. Use for qualitative theme analysis and tracking interview completion.",
  },
  {
    key: "research_eligibility",
    label: "Research Eligibility",
    description:
      "Every manual eligible/excluded decision, with reason and reviewer. Use to see exactly which participants were excluded from analysis and why, before running final sample statistics.",
  },
];
