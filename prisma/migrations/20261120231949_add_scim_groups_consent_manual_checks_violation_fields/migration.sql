-- Add ScimGroup table
CREATE TABLE "ScimGroup" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "members" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScimGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScimGroup_orgId_displayName_key" ON "ScimGroup"("orgId", "displayName");
CREATE INDEX "ScimGroup_orgId_idx" ON "ScimGroup"("orgId");
ALTER TABLE "ScimGroup" ADD CONSTRAINT "ScimGroup_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add CookieConsent table
CREATE TABLE "CookieConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consent" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CookieConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CookieConsent_userId_key" ON "CookieConsent"("userId");
CREATE INDEX "CookieConsent_consent_idx" ON "CookieConsent"("consent");
ALTER TABLE "CookieConsent" ADD CONSTRAINT "CookieConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add ManualCheck table
CREATE TABLE "ManualCheck" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "checkedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManualCheck_projectId_checkId_key" ON "ManualCheck"("projectId", "checkId");
CREATE INDEX "ManualCheck_projectId_idx" ON "ManualCheck"("projectId");
ALTER TABLE "ManualCheck" ADD CONSTRAINT "ManualCheck_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add Violation fields: elementPath, helpUrl, fingerprint
ALTER TABLE "Violation" ADD COLUMN "elementPath" TEXT;
ALTER TABLE "Violation" ADD COLUMN "helpUrl" TEXT;
ALTER TABLE "Violation" ADD COLUMN "fingerprint" TEXT;

-- Add unique index on fingerprint (partial for non-null)
CREATE UNIQUE INDEX "Violation_fingerprint_key" ON "Violation"("fingerprint") WHERE "fingerprint" IS NOT NULL;

-- Add index on projectId + fingerprint for reconciliation queries
CREATE INDEX "Violation_projectId_fingerprint_idx" ON "Violation"("projectId", "fingerprint");

-- Update Organization pagesQuota default to 100 (if not already)
-- This is a no-op if already 100, but ensures consistency
ALTER TABLE "Organization" ALTER COLUMN "pagesQuota" SET DEFAULT 100;