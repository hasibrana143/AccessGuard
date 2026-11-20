ALTER TABLE "Violation" ADD COLUMN IF NOT EXISTS "elementPath" TEXT;
ALTER TABLE "Violation" ADD COLUMN IF NOT EXISTS "helpUrl" TEXT;
ALTER TABLE "Violation" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT;
CREATE INDEX IF NOT EXISTS "Violation_projectId_fingerprint_idx" ON "Violation"("projectId", "fingerprint");
CREATE UNIQUE INDEX IF NOT EXISTS "Violation_fingerprint_key" ON "Violation"("fingerprint") WHERE "fingerprint" IS NOT NULL;