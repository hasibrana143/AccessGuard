-- DropIndex
DROP INDEX "ScheduledScan_projectId_isActive_idx";

-- AlterTable
ALTER TABLE "ComplianceReport" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customRoleId" TEXT,
ADD COLUMN     "emailVerificationTokenExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Violation" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CustomRole" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomRole_orgId_idx" ON "CustomRole"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_orgId_name_key" ON "CustomRole"("orgId", "name");

-- CreateIndex
CREATE INDEX "ComplianceReport_deletedAt_idx" ON "ComplianceReport"("deletedAt");

-- CreateIndex
CREATE INDEX "PasswordReset_email_idx" ON "PasswordReset"("email");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE INDEX "Scan_createdAt_idx" ON "Scan"("createdAt");

-- CreateIndex
CREATE INDEX "Scan_deletedAt_idx" ON "Scan"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledScan_projectId_key" ON "ScheduledScan"("projectId");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE INDEX "Violation_deletedAt_idx" ON "Violation"("deletedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
