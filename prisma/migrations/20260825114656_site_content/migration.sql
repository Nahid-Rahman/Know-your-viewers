-- CreateTable
CREATE TABLE "site_content" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "heroHeadline" TEXT NOT NULL,
    "heroSubtext" TEXT NOT NULL,
    "claimedCount" TEXT NOT NULL,
    "countdownSeconds" INTEGER NOT NULL,
    "trustBadges" JSONB NOT NULL,
    "gameCategories" JSONB NOT NULL,
    "rewardPool" JSONB NOT NULL,
    "gameTypeOptions" JSONB NOT NULL,
    "watchFrequencyOptions" JSONB NOT NULL,
    "faqItems" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);
