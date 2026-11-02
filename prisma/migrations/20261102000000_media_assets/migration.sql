-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- Same lock-down as the study revision: no PostgREST access for anon/authenticated.
ALTER TABLE "media_assets" ENABLE ROW LEVEL SECURITY;
