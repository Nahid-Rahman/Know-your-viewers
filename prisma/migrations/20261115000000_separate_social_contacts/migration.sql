-- Entries can now give a Discord AND a Facebook contact. Additive only: the
-- legacy single-social columns stay, and existing rows are backfilled.

ALTER TABLE "submissions"
  ADD COLUMN "discordProvided" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "facebookProvided" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "submission_contacts"
  ADD COLUMN "encryptedDiscord" TEXT,
  ADD COLUMN "encryptedFacebook" TEXT;

UPDATE "submissions"
SET "discordProvided" = ("socialProvided" AND "socialType" = 'DISCORD'),
    "facebookProvided" = ("socialProvided" AND "socialType" = 'FACEBOOK');

UPDATE "submission_contacts" c
SET "encryptedDiscord" = CASE WHEN s."socialType" = 'DISCORD' THEN c."encryptedSocial" END,
    "encryptedFacebook" = CASE WHEN s."socialType" = 'FACEBOOK' THEN c."encryptedSocial" END
FROM "submissions" s
WHERE s.id = c."submissionId" AND c."encryptedSocial" IS NOT NULL;
