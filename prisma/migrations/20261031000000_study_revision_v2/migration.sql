-- CreateEnum
CREATE TYPE "DuplicateScope" AS ENUM ('CAMPAIGN');

-- CreateEnum
CREATE TYPE "StreamSessionType" AS ENUM ('NORMAL_BASELINE', 'STUDY');

-- CreateEnum
CREATE TYPE "StreamSessionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CollectionMode" AS ENUM ('TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('RESEARCHER', 'VIEWER');

-- CreateEnum
CREATE TYPE "StudyPolicyKey" AS ENUM ('COLLECTION_NOTICE', 'PARTIAL_DISCLOSURE', 'UNDER18_COLLECTION', 'UNDER18_CONTACT_AND_REWARD', 'RETENTION', 'REWARD_PRESENTATION', 'WINNER_COUNT', 'DRAW_INTERVIEW_ORDER', 'UNREACHABLE_HANDLING');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "AttributionSource" AS ENUM ('TRACKING_LINK', 'ACTIVE_SESSION', 'STALE_TRACKING_LINK', 'UNKNOWN_TRACKING_CODE');

-- CreateEnum
CREATE TYPE "StudyEventType" AS ENUM ('LANDING_VIEWED', 'REWARD_SECTION_VIEWED', 'SPIN_CLICKED', 'SPIN_COMPLETED', 'FORM_OPENED', 'FIELD_INTERACTED', 'FORM_CLOSED', 'SUBMISSION_ATTEMPTED', 'SUBMISSION_REJECTED', 'SUBMISSION_SAVED', 'DUPLICATE_CLASSIFIED', 'CONFIRMATION_VIEWED', 'PAGE_HIDDEN', 'PAGE_VISIBLE');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('BELOW_18', 'AGE_18_30', 'AGE_31_PLUS');

-- CreateEnum
CREATE TYPE "SocialContactType" AS ENUM ('DISCORD', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('CANONICAL', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "ExclusionCategory" AS ENUM ('INCOMPLETE', 'TECHNICAL_ERROR', 'TEST_ENTRY', 'INVALID_SUBMISSION', 'PARTICIPANT_WITHDREW', 'OTHER');

-- CreateEnum
CREATE TYPE "PermissionType" AS ENUM ('INTERVIEW_PROCEED', 'WEBSITE_DATA_USE', 'INTERVIEW_ANSWERS_USE');

-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('PENDING', 'GRANTED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RecordMethod" AS ENUM ('PHONE_CALL', 'WHATSAPP', 'SMS', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('NOT_CONTACTED', 'ATTEMPTING', 'REACHED', 'INTERVIEW_COMPLETED', 'DECLINED_INTERVIEW', 'UNREACHABLE');

-- CreateEnum
CREATE TYPE "DrawStatus" AS ENUM ('FINALIZED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'UNREACHABLE');

-- CreateEnum
CREATE TYPE "AnnotationType" AS ENUM ('STREAM_START', 'STREAM_END', 'CHAT_QUESTION', 'CHAT_ANSWER', 'LINK_SHARED', 'OTHER');

-- AlterTable
ALTER TABLE "experiments" ADD COLUMN     "duplicateScope" "DuplicateScope" NOT NULL DEFAULT 'CAMPAIGN';

-- AlterTable
ALTER TABLE "stream_sessions" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "actualEndAt" TIMESTAMP(3),
ADD COLUMN     "actualStartAt" TIMESTAMP(3),
ADD COLUMN     "collectionMode" "CollectionMode" NOT NULL DEFAULT 'TEST',
ADD COLUMN     "currentConfigId" TEXT,
ADD COLUMN     "entriesClosedAt" TIMESTAMP(3),
ADD COLUMN     "entryDeadlineAt" TIMESTAMP(3),
ADD COLUMN     "sessionType" "StreamSessionType" NOT NULL DEFAULT 'STUDY',
ADD COLUMN     "status" "StreamSessionStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "streamers" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "support_requests" ADD COLUMN     "encryptedContact" TEXT,
ADD COLUMN     "encryptedMessage" TEXT,
ADD COLUMN     "encryptedNickname" TEXT,
ADD COLUMN     "purgedAt" TIMESTAMP(3),
ALTER COLUMN "emailOrPhone" DROP NOT NULL,
ALTER COLUMN "message" DROP NOT NULL;

-- CreateTable
CREATE TABLE "experiment_collaborators" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CollaboratorRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_policy_decisions" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "key" "StudyPolicyKey" NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'PENDING',
    "value" JSONB,
    "note" TEXT,
    "approvalRef" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_policy_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_configs" (
    "id" TEXT NOT NULL,
    "streamSessionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "streamerDisplayName" TEXT NOT NULL,
    "streamerImageUrl" TEXT,
    "welcomeText" TEXT NOT NULL,
    "channelUrl" TEXT,
    "platform" TEXT,
    "homepageContent" JSONB NOT NULL,
    "rewardConfig" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_timing_changes" (
    "id" TEXT NOT NULL,
    "streamSessionId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TIMESTAMP(3),
    "newValue" TIMESTAMP(3),
    "reason" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_timing_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_visitors" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "browser_visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "streamSessionId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "attributionSource" "AttributionSource" NOT NULL,
    "trackingLinkId" TEXT,
    "receivedRefCode" TEXT,
    "referrerHost" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeMs" INTEGER NOT NULL DEFAULT 0,
    "activeCreditAt" TIMESTAMP(3),

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_events" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "streamSessionId" TEXT NOT NULL,
    "submissionId" TEXT,
    "type" "StudyEventType" NOT NULL,
    "element" TEXT,
    "detail" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spin_outcomes" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "streamSessionId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "mechanism" TEXT NOT NULL,
    "resultKey" TEXT NOT NULL,
    "resultLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spin_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "responseCode" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "streamSessionId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "spinOutcomeId" TEXT,
    "attributionSource" "AttributionSource" NOT NULL,
    "trackingLinkId" TEXT,
    "isTest" BOOLEAN NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,
    "emailProvided" BOOLEAN NOT NULL DEFAULT false,
    "ignProvided" BOOLEAN NOT NULL DEFAULT false,
    "socialType" "SocialContactType",
    "socialProvided" BOOLEAN NOT NULL DEFAULT false,
    "status" "SubmissionStatus" NOT NULL,
    "canonicalId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "researchExcluded" BOOLEAN NOT NULL DEFAULT false,
    "researchExclusionReason" "ExclusionCategory",
    "researchExclusionNote" TEXT,
    "drawExcluded" BOOLEAN NOT NULL DEFAULT false,
    "drawExclusionNote" TEXT,
    "researchDataPurgedAt" TIMESTAMP(3),

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_phone_entries" (
    "experimentId" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "scope" "DuplicateScope" NOT NULL DEFAULT 'CAMPAIGN',
    "canonicalSubmissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_phone_entries_pkey" PRIMARY KEY ("experimentId","phoneHash")
);

-- CreateTable
CREATE TABLE "submission_contacts" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "encryptedPhone" TEXT,
    "phoneTail" TEXT,
    "encryptedEmail" TEXT,
    "encryptedIgn" TEXT,
    "encryptedSocial" TEXT,
    "phonePurgedAt" TIMESTAMP(3),
    "optionalPurgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_use_permissions" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "type" "PermissionType" NOT NULL,
    "status" "PermissionStatus" NOT NULL,
    "noticeVersion" TEXT NOT NULL,
    "method" "RecordMethod" NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_use_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_follow_ups" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'NOT_CONTACTED',
    "assignedToId" TEXT,
    "nextFollowupAt" TIMESTAMP(3),
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_contact_attempts" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "ContactOutcome" NOT NULL,
    "method" "RecordMethod" NOT NULL DEFAULT 'PHONE_CALL',
    "note" TEXT,
    "researcherId" TEXT NOT NULL,

    CONSTRAINT "submission_contact_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_interviews" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "mode" "InterviewMode" NOT NULL DEFAULT 'PHONE_CALL',
    "status" "InterviewRecordStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scriptVersion" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "summary" TEXT,
    "themes" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_draws" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL,
    "status" "DrawStatus" NOT NULL DEFAULT 'FINALIZED',
    "finalizedKey" TEXT,
    "requestedWinnerCount" INTEGER NOT NULL,
    "eligibleCount" INTEGER NOT NULL,
    "eligibleSnapshot" JSONB NOT NULL,
    "method" TEXT NOT NULL,
    "executedById" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "reward_draws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draw_winners" (
    "id" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "amountBdt" INTEGER NOT NULL DEFAULT 100,
    "paymentRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draw_winners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_metrics" (
    "id" TEXT NOT NULL,
    "streamSessionId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformStreamId" TEXT,
    "durationMinutes" INTEGER,
    "views" INTEGER,
    "avgConcurrentViewers" INTEGER,
    "peakConcurrentViewers" INTEGER,
    "watchTimeMinutes" INTEGER,
    "avgViewDurationSeconds" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "newFollowers" INTEGER,
    "source" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_annotations" (
    "id" TEXT NOT NULL,
    "streamSessionId" TEXT NOT NULL,
    "type" "AnnotationType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "experimentId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "experiment_collaborators_experimentId_userId_key" ON "experiment_collaborators"("experimentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "study_policy_decisions_experimentId_key_key" ON "study_policy_decisions"("experimentId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "session_configs_streamSessionId_version_key" ON "session_configs"("streamSessionId", "version");

-- CreateIndex
CREATE INDEX "session_timing_changes_streamSessionId_idx" ON "session_timing_changes"("streamSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "browser_visitors_tokenHash_key" ON "browser_visitors"("tokenHash");

-- CreateIndex
CREATE INDEX "visits_visitorId_streamSessionId_lastSeenAt_idx" ON "visits"("visitorId", "streamSessionId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "visits_streamSessionId_startedAt_idx" ON "visits"("streamSessionId", "startedAt");

-- CreateIndex
CREATE INDEX "visits_experimentId_idx" ON "visits"("experimentId");

-- CreateIndex
CREATE INDEX "study_events_streamSessionId_occurredAt_idx" ON "study_events"("streamSessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "study_events_visitId_idx" ON "study_events"("visitId");

-- CreateIndex
CREATE INDEX "study_events_type_idx" ON "study_events"("type");

-- CreateIndex
CREATE UNIQUE INDEX "spin_outcomes_visitId_key" ON "spin_outcomes"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_responseCode_key" ON "submissions"("responseCode");

-- CreateIndex
CREATE INDEX "submissions_experimentId_phoneHash_idx" ON "submissions"("experimentId", "phoneHash");

-- CreateIndex
CREATE INDEX "submissions_streamSessionId_submittedAt_idx" ON "submissions"("streamSessionId", "submittedAt");

-- CreateIndex
CREATE INDEX "submissions_canonicalId_idx" ON "submissions"("canonicalId");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_visitorId_idempotencyKey_key" ON "submissions"("visitorId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_phone_entries_canonicalSubmissionId_key" ON "campaign_phone_entries"("canonicalSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_contacts_submissionId_key" ON "submission_contacts"("submissionId");

-- CreateIndex
CREATE INDEX "data_use_permissions_submissionId_type_recordedAt_idx" ON "data_use_permissions"("submissionId", "type", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "submission_follow_ups_submissionId_key" ON "submission_follow_ups"("submissionId");

-- CreateIndex
CREATE INDEX "submission_contact_attempts_submissionId_idx" ON "submission_contact_attempts"("submissionId");

-- CreateIndex
CREATE INDEX "submission_interviews_submissionId_idx" ON "submission_interviews"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "reward_draws_finalizedKey_key" ON "reward_draws"("finalizedKey");

-- CreateIndex
CREATE INDEX "reward_draws_experimentId_idx" ON "reward_draws"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "draw_winners_drawId_submissionId_key" ON "draw_winners"("drawId", "submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "draw_winners_drawId_rank_key" ON "draw_winners"("drawId", "rank");

-- CreateIndex
CREATE INDEX "platform_metrics_streamSessionId_idx" ON "platform_metrics"("streamSessionId");

-- CreateIndex
CREATE INDEX "session_annotations_streamSessionId_occurredAt_idx" ON "session_annotations"("streamSessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_experimentId_createdAt_idx" ON "audit_logs"("experimentId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "stream_sessions_currentConfigId_key" ON "stream_sessions"("currentConfigId");

-- AddForeignKey
ALTER TABLE "stream_sessions" ADD CONSTRAINT "stream_sessions_currentConfigId_fkey" FOREIGN KEY ("currentConfigId") REFERENCES "session_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_collaborators" ADD CONSTRAINT "experiment_collaborators_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_collaborators" ADD CONSTRAINT "experiment_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_policy_decisions" ADD CONSTRAINT "study_policy_decisions_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_policy_decisions" ADD CONSTRAINT "study_policy_decisions_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_configs" ADD CONSTRAINT "session_configs_streamSessionId_fkey" FOREIGN KEY ("streamSessionId") REFERENCES "stream_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_configs" ADD CONSTRAINT "session_configs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_timing_changes" ADD CONSTRAINT "session_timing_changes_streamSessionId_fkey" FOREIGN KEY ("streamSessionId") REFERENCES "stream_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "browser_visitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_streamSessionId_fkey" FOREIGN KEY ("streamSessionId") REFERENCES "stream_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_configId_fkey" FOREIGN KEY ("configId") REFERENCES "session_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_trackingLinkId_fkey" FOREIGN KEY ("trackingLinkId") REFERENCES "tracking_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_events" ADD CONSTRAINT "study_events_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_events" ADD CONSTRAINT "study_events_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_events" ADD CONSTRAINT "study_events_streamSessionId_fkey" FOREIGN KEY ("streamSessionId") REFERENCES "stream_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_events" ADD CONSTRAINT "study_events_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spin_outcomes" ADD CONSTRAINT "spin_outcomes_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spin_outcomes" ADD CONSTRAINT "spin_outcomes_streamSessionId_fkey" FOREIGN KEY ("streamSessionId") REFERENCES "stream_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spin_outcomes" ADD CONSTRAINT "spin_outcomes_configId_fkey" FOREIGN KEY ("configId") REFERENCES "session_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_streamSessionId_fkey" FOREIGN KEY ("streamSessionId") REFERENCES "stream_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_configId_fkey" FOREIGN KEY ("configId") REFERENCES "session_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "browser_visitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_spinOutcomeId_fkey" FOREIGN KEY ("spinOutcomeId") REFERENCES "spin_outcomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_trackingLinkId_fkey" FOREIGN KEY ("trackingLinkId") REFERENCES "tracking_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_canonicalId_fkey" FOREIGN KEY ("canonicalId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_phone_entries" ADD CONSTRAINT "campaign_phone_entries_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_phone_entries" ADD CONSTRAINT "campaign_phone_entries_canonicalSubmissionId_fkey" FOREIGN KEY ("canonicalSubmissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_contacts" ADD CONSTRAINT "submission_contacts_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_use_permissions" ADD CONSTRAINT "data_use_permissions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_use_permissions" ADD CONSTRAINT "data_use_permissions_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_follow_ups" ADD CONSTRAINT "submission_follow_ups_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_follow_ups" ADD CONSTRAINT "submission_follow_ups_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_contact_attempts" ADD CONSTRAINT "submission_contact_attempts_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_contact_attempts" ADD CONSTRAINT "submission_contact_attempts_researcherId_fkey" FOREIGN KEY ("researcherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_interviews" ADD CONSTRAINT "submission_interviews_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_interviews" ADD CONSTRAINT "submission_interviews_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_draws" ADD CONSTRAINT "reward_draws_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_draws" ADD CONSTRAINT "reward_draws_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draw_winners" ADD CONSTRAINT "draw_winners_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "reward_draws"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draw_winners" ADD CONSTRAINT "draw_winners_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draw_winners" ADD CONSTRAINT "draw_winners_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_metrics" ADD CONSTRAINT "platform_metrics_streamSessionId_fkey" FOREIGN KEY ("streamSessionId") REFERENCES "stream_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_metrics" ADD CONSTRAINT "platform_metrics_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_annotations" ADD CONSTRAINT "session_annotations_streamSessionId_fkey" FOREIGN KEY ("streamSessionId") REFERENCES "stream_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_annotations" ADD CONSTRAINT "session_annotations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Supabase exposure lock-down (hand-written, not generated by Prisma).
--
-- The app reaches the database only through Prisma on the server, connecting
-- as the table-owning role, which bypasses RLS. Supabase additionally exposes
-- the public schema over PostgREST to the browser-visible anon key, so every
-- table gets RLS enabled with NO policies (deny-all for anon/authenticated)
-- and those roles lose their table privileges. Guarded so it also runs on
-- plain PostgreSQL (local dev/test), where the Supabase roles don't exist.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated';
  END IF;
END $$;
