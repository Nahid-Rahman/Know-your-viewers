-- AlterTable
ALTER TABLE "participant_contacts" ADD COLUMN     "emailHash" TEXT;

-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "streamerId" TEXT;

-- CreateIndex
CREATE INDEX "participant_contacts_emailHash_idx" ON "participant_contacts"("emailHash");

-- CreateIndex
CREATE INDEX "participants_streamerId_idx" ON "participants"("streamerId");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "streamers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
