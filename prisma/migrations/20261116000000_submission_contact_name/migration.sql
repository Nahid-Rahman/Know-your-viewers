-- Entrant's name (encrypted like the other contact values). Required on the
-- form from 2026-11-16; older entries have none.
ALTER TABLE "submission_contacts" ADD COLUMN "encryptedName" TEXT;
