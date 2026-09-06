-- CreateEnum
CREATE TYPE "DebriefStatus" AS ENUM ('PENDING', 'CONTACTED', 'EXPLAINED', 'ACKNOWLEDGED', 'DECLINED', 'UNREACHABLE');

-- CreateEnum
CREATE TYPE "DebriefMethod" AS ENUM ('PHONE_CALL', 'WHATSAPP', 'SMS', 'OTHER');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('STREAM_QR', 'STREAM_CHAT_LINK', 'STREAM_DESCRIPTION', 'DIRECT', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EngagementEventType" ADD VALUE 'CTA_CLICKED';
ALTER TYPE "EngagementEventType" ADD VALUE 'OPTION_SELECTED';
ALTER TYPE "EngagementEventType" ADD VALUE 'CONTACT_SUBMITTED';
ALTER TYPE "EngagementEventType" ADD VALUE 'STUDY_COMPLETED';
ALTER TYPE "EngagementEventType" ADD VALUE 'SURVEY_SUBMITTED';

-- AlterTable
ALTER TABLE "consents" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "withdrawn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withdrawnAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "debriefs" ADD COLUMN     "debriefMethod" "DebriefMethod",
ADD COLUMN     "debriefNotes" TEXT,
ADD COLUMN     "debriefSentAt" TIMESTAMP(3),
ADD COLUMN     "debriefStatus" "DebriefStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "engagement_events" ADD COLUMN     "element" TEXT,
ADD COLUMN     "eventValue" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "page" TEXT;

-- AlterTable
ALTER TABLE "tracking_links" ADD COLUMN     "entrySource" "EntrySource" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "streamSessionId" TEXT;

-- CreateTable
CREATE TABLE "stream_sessions" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "streamerId" TEXT NOT NULL,
    "platform" TEXT,
    "gameName" TEXT,
    "streamTitle" TEXT,
    "streamStartTime" TIMESTAMP(3),
    "streamEndTime" TIMESTAMP(3),
    "campaignStartTime" TIMESTAMP(3),
    "campaignEndTime" TIMESTAMP(3),
    "estimatedViewerCount" INTEGER,
    "qrDisplayed" BOOLEAN NOT NULL DEFAULT false,
    "chatLinkPosted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stream_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stream_sessions_experimentId_idx" ON "stream_sessions"("experimentId");

-- CreateIndex
CREATE INDEX "stream_sessions_streamerId_idx" ON "stream_sessions"("streamerId");

-- CreateIndex
CREATE INDEX "tracking_links_streamSessionId_idx" ON "tracking_links"("streamSessionId");

-- AddForeignKey
ALTER TABLE "stream_sessions" ADD CONSTRAINT "stream_sessions_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_sessions" ADD CONSTRAINT "stream_sessions_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "streamers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_streamSessionId_fkey" FOREIGN KEY ("streamSessionId") REFERENCES "stream_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
