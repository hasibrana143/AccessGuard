-- AccessGuard CHECK constraints (idempotent)
-- Apply after `prisma db push` with:
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/check-constraints.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_organization_plan') THEN
    ALTER TABLE "Organization" ADD CONSTRAINT ck_organization_plan
      CHECK ("plan" IN ('free', 'starter', 'growth', 'agency', 'enterprise'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_project_risk_score') THEN
    ALTER TABLE "Project" ADD CONSTRAINT ck_project_risk_score
      CHECK ("riskScore" IS NULL OR ("riskScore" >= 0 AND "riskScore" <= 100));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_scan_status') THEN
    ALTER TABLE "Scan" ADD CONSTRAINT ck_scan_status
      CHECK ("status" IN ('pending', 'queued', 'running', 'completed', 'failed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_scan_pages_non_negative') THEN
    ALTER TABLE "Scan" ADD CONSTRAINT ck_scan_pages_non_negative
      CHECK ("pagesScanned" >= 0 AND "violationsFound" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_violation_severity') THEN
    ALTER TABLE "Violation" ADD CONSTRAINT ck_violation_severity
      CHECK ("severity" IN ('critical', 'serious', 'moderate', 'minor'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_violation_status') THEN
    ALTER TABLE "Violation" ADD CONSTRAINT ck_violation_status
      CHECK ("status" IN ('open', 'fixed', 'ignored', 'false_positive'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_violation_confidence') THEN
    ALTER TABLE "Violation" ADD CONSTRAINT ck_violation_confidence
      CHECK ("aiConfidenceScore" IS NULL OR ("aiConfidenceScore" >= 0 AND "aiConfidenceScore" <= 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_report_status') THEN
    ALTER TABLE "ComplianceReport" ADD CONSTRAINT ck_report_status
      CHECK ("status" IN ('pending', 'generating', 'generated', 'ready', 'failed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_report_format') THEN
    ALTER TABLE "ComplianceReport" ADD CONSTRAINT ck_report_format
      CHECK ("format" IN ('web', 'pdf', 'html', 'csv'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_report_type') THEN
    ALTER TABLE "ComplianceReport" ADD CONSTRAINT ck_report_type
      CHECK ("reportType" IN ('wcag', 'full', 'executive', 'legal', 'vpat'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_user_role') THEN
    ALTER TABLE "User" ADD CONSTRAINT ck_user_role
      CHECK ("role" IN ('owner', 'admin', 'member'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_schedule_frequency') THEN
    ALTER TABLE "ScheduledScan" ADD CONSTRAINT ck_schedule_frequency
      CHECK ("frequency" IN ('daily', 'weekly', 'monthly', 'custom'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_invite_role') THEN
    ALTER TABLE "TeamInvite" ADD CONSTRAINT ck_invite_role
      CHECK ("role" IN ('owner', 'admin', 'member'));
  END IF;
END $$;
