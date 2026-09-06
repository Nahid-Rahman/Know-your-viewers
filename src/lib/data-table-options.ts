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

export const DATA_TABLE_OPTIONS: { key: DataTableKey; label: string }[] = [
  { key: "participants", label: "Participants" },
  { key: "participant_sessions", label: "Participant Sessions" },
  { key: "participant_events", label: "Participant Events" },
  { key: "participant_responses", label: "Participant Responses" },
  { key: "streamers", label: "Streamers" },
  { key: "stream_sessions", label: "Stream Sessions" },
  { key: "recruitment_sources", label: "Recruitment Sources" },
  { key: "participant_contacts", label: "Participant Contacts" },
  { key: "debrief_records", label: "Debrief Records" },
  { key: "data_use_permissions", label: "Data Use Permissions" },
  { key: "interview_consents", label: "Interview Consents" },
  { key: "interviews", label: "Interviews" },
  { key: "research_eligibility", label: "Research Eligibility" },
];
