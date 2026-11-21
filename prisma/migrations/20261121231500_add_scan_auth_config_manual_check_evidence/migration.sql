-- Add ManualCheck evidence + checkedAt (manual checks v1: evidence upload, tester sign-off)
ALTER TABLE "ManualCheck" ADD COLUMN IF NOT EXISTS "evidence" TEXT;
ALTER TABLE "ManualCheck" ADD COLUMN IF NOT EXISTS "checkedAt" TIMESTAMP(3);

-- Add ScanAuthConfig table (authenticated scans: cookies, headers, login scripts)
CREATE TABLE IF NOT EXISTS "ScanAuthConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanAuthConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScanAuthConfig_projectId_idx" ON "ScanAuthConfig"("projectId");
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScanAuthConfig_projectId_fkey') THEN
        ALTER TABLE "ScanAuthConfig" ADD CONSTRAINT "ScanAuthConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
