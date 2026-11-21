-- Align the migration chain with prisma/schema.prisma.
--
-- Several P1 feature areas (agency workspace, integrations, violation indexes)
-- only ever reached local databases through `prisma db push`, so they never
-- got a migration. A database built from the migration chain was missing
-- these tables, columns, indexes and foreign keys.
--
-- Every statement is guarded so this migration converges BOTH a fresh
-- database (chain state) and an existing development database (db-push state)
-- onto the same schema.

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "pagesUsedThisMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ALTER COLUMN "plan" SET DEFAULT 'free';

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientGroup" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WhiteLabelConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "clientGroupId" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "fontFamily" TEXT,
    "companyName" TEXT,
    "companyUrl" TEXT,
    "footerText" TEXT,
    "showPoweredBy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhiteLabelConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Integration" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IntegrationLog" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" TEXT,
    "response" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientGroup_orgId_idx" ON "ClientGroup"("orgId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientGroup_orgId_slug_key" ON "ClientGroup"("orgId", "slug");
CREATE INDEX IF NOT EXISTS "WhiteLabelConfig_orgId_idx" ON "WhiteLabelConfig"("orgId");
CREATE UNIQUE INDEX IF NOT EXISTS "WhiteLabelConfig_orgId_clientGroupId_key" ON "WhiteLabelConfig"("orgId", "clientGroupId");
CREATE INDEX IF NOT EXISTS "Integration_orgId_idx" ON "Integration"("orgId");
CREATE UNIQUE INDEX IF NOT EXISTS "Integration_orgId_type_name_key" ON "Integration"("orgId", "type", "name");
CREATE INDEX IF NOT EXISTS "IntegrationLog_integrationId_idx" ON "IntegrationLog"("integrationId");
CREATE INDEX IF NOT EXISTS "IntegrationLog_createdAt_idx" ON "IntegrationLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_orgId_action_createdAt_idx" ON "AuditLog"("orgId", "action", "createdAt");

-- Violation.fingerprint: schema.prisma declares @unique, the earlier migration
-- created a partial unique index (WHERE fingerprint IS NOT NULL). Postgres
-- treats NULLs as distinct in both forms, so the plain unique index is
-- equivalent and matches the declared schema.
DROP INDEX IF EXISTS "Violation_fingerprint_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Violation_fingerprint_key" ON "Violation"("fingerprint");
CREATE INDEX IF NOT EXISTS "Violation_projectId_status_severity_idx" ON "Violation"("projectId", "status", "severity");
CREATE INDEX IF NOT EXISTS "Violation_status_createdAt_idx" ON "Violation"("status", "createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientGroup_orgId_fkey') THEN
        ALTER TABLE "ClientGroup" ADD CONSTRAINT "ClientGroup_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WhiteLabelConfig_orgId_fkey') THEN
        ALTER TABLE "WhiteLabelConfig" ADD CONSTRAINT "WhiteLabelConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Integration_orgId_fkey') THEN
        ALTER TABLE "Integration" ADD CONSTRAINT "Integration_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IntegrationLog_integrationId_fkey') THEN
        ALTER TABLE "IntegrationLog" ADD CONSTRAINT "IntegrationLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScanAuthConfig_projectId_fkey') THEN
        ALTER TABLE "ScanAuthConfig" ADD CONSTRAINT "ScanAuthConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
