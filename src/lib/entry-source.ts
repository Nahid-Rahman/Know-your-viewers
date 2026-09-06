// Deliberately its own tiny, dependency-free module: `research.ts` is
// `server-only` (it imports Prisma at module scope), so a Client Component
// can't import even a plain constant from it without pulling the whole
// server module graph (and Node-only `pg` internals) into the browser bundle.

export type EntrySourceValue = "STREAM_QR" | "STREAM_CHAT_LINK" | "STREAM_DESCRIPTION" | "DIRECT" | "OTHER";

export const RECRUITMENT_SOURCE_LABELS: Record<EntrySourceValue, string> = {
  STREAM_QR: "QR Code",
  STREAM_CHAT_LINK: "Chat Link",
  STREAM_DESCRIPTION: "Stream Description",
  DIRECT: "Direct",
  OTHER: "Other",
};
