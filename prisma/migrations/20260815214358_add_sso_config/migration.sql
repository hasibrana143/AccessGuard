-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "ssoCertificate" TEXT,
ADD COLUMN     "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ssoEntryPoint" TEXT,
ADD COLUMN     "ssoIssuer" TEXT,
ADD COLUMN     "ssoProvider" TEXT;
