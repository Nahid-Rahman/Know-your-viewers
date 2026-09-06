-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NOT_CONTACTED', 'CONTACTED', 'DEBRIEFED', 'INTERVIEW_INVITED', 'INTERVIEW_COMPLETED', 'UNREACHABLE');

-- CreateEnum
CREATE TYPE "PrizeFulfillmentStatus" AS ENUM ('SELECTED', 'WON', 'CLAIMED', 'NOT_CLAIMED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ContactOutcome" AS ENUM ('ANSWERED', 'NO_ANSWER', 'WRONG_NUMBER', 'CALL_BACK_LATER', 'DEBRIEF_COMPLETED', 'DECLINED', 'UNREACHABLE');

-- CreateEnum
CREATE TYPE "InterviewConsentAnswer" AS ENUM ('PENDING', 'YES', 'NO');

-- CreateEnum
CREATE TYPE "InterviewCandidateStatus" AS ENUM ('NOT_INVITED', 'INVITED', 'ACCEPTED', 'DECLINED', 'SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('PHONE_CALL', 'WHATSAPP_CALL', 'GOOGLE_MEET', 'ZOOM', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewRecordStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "ExclusionReason" AS ENUM ('INCOMPLETE', 'DUPLICATE', 'TECHNICAL_ERROR', 'TEST_ACCOUNT', 'INVALID_SUBMISSION', 'PARTICIPANT_DECLINED_DATA_USE', 'PARTICIPANT_WITHDREW', 'OTHER');

-- CreateTable
CREATE TABLE "contact_workflows" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "contactStatus" "ContactStatus" NOT NULL DEFAULT 'NOT_CONTACTED',
    "preferredContactChannel" TEXT,
    "nextFollowupAt" TIMESTAMP(3),
    "researcherAssignedId" TEXT,
    "prizeFulfillmentStatus" "PrizeFulfillmentStatus",
    "prizeDeliveredAt" TIMESTAMP(3),
    "contactNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_attempts" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "ContactOutcome" NOT NULL,
    "note" TEXT,
    "researcherId" TEXT,

    CONSTRAINT "contact_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_consents" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "invited" BOOLEAN NOT NULL DEFAULT false,
    "invitedAt" TIMESTAMP(3),
    "consent" "InterviewConsentAnswer" NOT NULL DEFAULT 'PENDING',
    "consentAt" TIMESTAMP(3),
    "status" "InterviewCandidateStatus" NOT NULL DEFAULT 'NOT_INVITED',
    "preferredContactTime" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "interviewerId" TEXT,
    "interviewMode" "InterviewMode",
    "status" "InterviewRecordStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "recordingConsent" BOOLEAN,
    "recordingAvailable" BOOLEAN NOT NULL DEFAULT false,
    "transcriptAvailable" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "themes" TEXT[],
    "researcherNotes" TEXT,
    "transcriptFileUrl" TEXT,
    "recordingFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_eligibility" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "exclusionReason" "ExclusionReason",
    "excludedAt" TIMESTAMP(3),
    "excludedByUserId" TEXT,
    "reviewNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_workflows_participantId_key" ON "contact_workflows"("participantId");

-- CreateIndex
CREATE INDEX "contact_attempts_participantId_idx" ON "contact_attempts"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_consents_participantId_key" ON "interview_consents"("participantId");

-- CreateIndex
CREATE INDEX "interviews_participantId_idx" ON "interviews"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "research_eligibility_participantId_key" ON "research_eligibility"("participantId");

-- AddForeignKey
ALTER TABLE "contact_workflows" ADD CONSTRAINT "contact_workflows_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_workflows" ADD CONSTRAINT "contact_workflows_researcherAssignedId_fkey" FOREIGN KEY ("researcherAssignedId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_researcherId_fkey" FOREIGN KEY ("researcherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_consents" ADD CONSTRAINT "interview_consents_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_eligibility" ADD CONSTRAINT "research_eligibility_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_eligibility" ADD CONSTRAINT "research_eligibility_excludedByUserId_fkey" FOREIGN KEY ("excludedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
