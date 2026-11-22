-- Fix D/E/F/G (review 2026-11-22). Additive only; safe on existing data.
-- Rollback: DROP INDEX "submissions_visitId_idx"; ALTER TABLE "visits" DROP COLUMN "routeActiveMs", DROP COLUMN "measurementVersion";
-- (Postgres can't drop enum values; the two new StudyEventType values are harmless if unused.)

ALTER TYPE "StudyEventType" ADD VALUE IF NOT EXISTS 'ROUTE_VIEWED';
ALTER TYPE "StudyEventType" ADD VALUE IF NOT EXISTS 'SUBMISSION_VALIDATION_FAILED';

-- Existing visits keep measurementVersion 1 (homepage-only visible time).
ALTER TABLE "visits" ADD COLUMN "routeActiveMs" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "visits" ADD COLUMN "measurementVersion" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "submissions_visitId_idx" ON "submissions"("visitId");
