-- AlterTable
ALTER TABLE "site_content" ADD COLUMN     "aboutContent" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "debriefContent" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "entryReceivedContent" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "footerContent" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "navContent" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "siteDescription" TEXT NOT NULL DEFAULT 'Academic research prototype studying livestream gaming recruitment and disclosure behaviour.',
ADD COLUMN     "siteName" TEXT NOT NULL DEFAULT 'LiveDrop Arena',
ADD COLUMN     "supportContent" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "termsContent" JSONB NOT NULL DEFAULT '{}';
