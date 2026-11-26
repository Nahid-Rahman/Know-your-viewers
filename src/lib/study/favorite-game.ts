import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Optional one-question poll shown on the confirmation page after an entry is
 * saved: "Which game are you most excited about right now?". It is not part of
 * the entry form, so the form's field count and optional-field rates are
 * unchanged. Choices are the featured game titles plus "Other".
 */
export const FAVORITE_GAME_OTHER = "Other";

/** Featured game titles from the CMS (deduplicated, in display order) plus "Other". */
export async function favoriteGameChoices(): Promise<string[]> {
  const row = await prisma.siteContent.findUnique({ where: { id: "singleton" }, select: { gameCategories: true } });
  const cats = Array.isArray(row?.gameCategories) ? (row.gameCategories as { title?: unknown }[]) : [];
  const titles = cats.map((c) => (typeof c?.title === "string" ? c.title.trim() : "")).filter(Boolean);
  return [...new Set(titles.filter((t) => t !== FAVORITE_GAME_OTHER)), FAVORITE_GAME_OTHER];
}

export type FavoriteGameResult = { ok: true; choice: string } | { ok: false; error: string };

/**
 * Stores the answer once. Only the browser that made the submission may
 * answer; a second answer is ignored (the first one is kept and returned).
 * Purged submissions are not asked again.
 */
export async function answerFavoriteGame(visitorId: string, submissionId: string, choice: unknown): Promise<FavoriteGameResult> {
  if (typeof submissionId !== "string" || !/^[0-9a-f-]{36}$/.test(submissionId)) return { ok: false, error: "Please reload the page." };
  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, visitorId },
    select: { id: true, favoriteGame: true, researchDataPurgedAt: true },
  });
  if (!submission || submission.researchDataPurgedAt) return { ok: false, error: "Please reload the page." };
  if (submission.favoriteGame) return { ok: true, choice: submission.favoriteGame };

  const choices = await favoriteGameChoices();
  if (typeof choice !== "string" || !choices.includes(choice)) return { ok: false, error: "Pick one of the games shown." };

  // Conditional update so two racing clicks can't overwrite each other.
  const { count } = await prisma.submission.updateMany({
    where: { id: submission.id, favoriteGame: null },
    data: { favoriteGame: choice, favoriteGameAt: new Date() },
  });
  if (count === 0) {
    const kept = await prisma.submission.findUnique({ where: { id: submission.id }, select: { favoriteGame: true } });
    return { ok: true, choice: kept?.favoriteGame ?? choice };
  }
  return { ok: true, choice };
}
