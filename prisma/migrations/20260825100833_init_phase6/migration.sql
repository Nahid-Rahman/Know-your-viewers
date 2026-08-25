-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RESEARCHER', 'STREAMER', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'RARE', 'EXCEPTIONAL', 'PREMIUM');

-- CreateEnum
CREATE TYPE "ContactRequirement" AS ENUM ('OPTIONAL', 'REQUIRED');

-- CreateEnum
CREATE TYPE "StreamerStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'LIKERT', 'RATING', 'TEXT');

-- CreateEnum
CREATE TYPE "EngagementEventType" AS ENUM ('PAGE_VIEW', 'SPIN_CLICKED', 'MODAL_OPENED', 'FIELD_FOCUSED', 'SUBMITTED', 'ABANDONED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "ethicsApprovalRef" TEXT,
    "researcherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_streamers" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "streamerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_streamers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conditions" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "urgencyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "socialProofEnabled" BOOLEAN NOT NULL DEFAULT false,
    "authorityBadgesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rewardRarity" "Rarity" NOT NULL DEFAULT 'COMMON',
    "contactRequirement" "ContactRequirement" NOT NULL DEFAULT 'OPTIONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streamers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "channelUrl" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "StreamerStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streamers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "conditionId" TEXT,
    "trackingLinkId" TEXT,
    "anonymousCode" TEXT NOT NULL,
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "rewardLabel" TEXT,
    "rewardRarity" "Rarity",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_contacts" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "streamNickname" TEXT,
    "favouriteGameType" TEXT,
    "livestreamFrequency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debriefs" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "explanationShown" BOOLEAN NOT NULL DEFAULT true,
    "permissionGiven" BOOLEAN,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debriefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "options" JSONB,
    "order" INTEGER NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_links" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "streamerId" TEXT,
    "uniqueCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_events" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "type" "EngagementEventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_requests" (
    "id" TEXT NOT NULL,
    "participantId" TEXT,
    "emailOrPhone" TEXT NOT NULL,
    "responseCode" TEXT,
    "streamNickname" TEXT,
    "issueType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_supabaseId_key" ON "users"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "experiments_researcherId_idx" ON "experiments"("researcherId");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_streamers_experimentId_streamerId_key" ON "experiment_streamers"("experimentId", "streamerId");

-- CreateIndex
CREATE INDEX "conditions_experimentId_idx" ON "conditions"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "streamers_userId_key" ON "streamers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "participants_anonymousCode_key" ON "participants"("anonymousCode");

-- CreateIndex
CREATE INDEX "participants_experimentId_idx" ON "participants"("experimentId");

-- CreateIndex
CREATE INDEX "participants_conditionId_idx" ON "participants"("conditionId");

-- CreateIndex
CREATE INDEX "participants_trackingLinkId_idx" ON "participants"("trackingLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "participant_contacts_participantId_key" ON "participant_contacts"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "consents_participantId_key" ON "consents"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "debriefs_participantId_key" ON "debriefs"("participantId");

-- CreateIndex
CREATE INDEX "surveys_experimentId_idx" ON "surveys"("experimentId");

-- CreateIndex
CREATE INDEX "questions_surveyId_idx" ON "questions"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "responses_surveyId_participantId_key" ON "responses"("surveyId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_links_uniqueCode_key" ON "tracking_links"("uniqueCode");

-- CreateIndex
CREATE INDEX "tracking_links_experimentId_idx" ON "tracking_links"("experimentId");

-- CreateIndex
CREATE INDEX "engagement_events_participantId_idx" ON "engagement_events"("participantId");

-- CreateIndex
CREATE INDEX "support_requests_participantId_idx" ON "support_requests"("participantId");

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_researcherId_fkey" FOREIGN KEY ("researcherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_streamers" ADD CONSTRAINT "experiment_streamers_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_streamers" ADD CONSTRAINT "experiment_streamers_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "streamers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streamers" ADD CONSTRAINT "streamers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "conditions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_trackingLinkId_fkey" FOREIGN KEY ("trackingLinkId") REFERENCES "tracking_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_contacts" ADD CONSTRAINT "participant_contacts_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debriefs" ADD CONSTRAINT "debriefs_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "streamers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
