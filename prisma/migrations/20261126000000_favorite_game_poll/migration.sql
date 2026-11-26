-- Optional post-submission poll ("which game are you most excited about?").
-- Additive only; existing rows stay null (not asked).
-- Rollback: ALTER TABLE "submissions" DROP COLUMN "favoriteGame", DROP COLUMN "favoriteGameAt";

ALTER TABLE "submissions" ADD COLUMN "favoriteGame" TEXT;
ALTER TABLE "submissions" ADD COLUMN "favoriteGameAt" TIMESTAMP(3);
