-- AlterTable: record GDPR consent for EU data-transfer (data residency = eu)
ALTER TABLE "Organization" ADD COLUMN     "euConsentAt" TIMESTAMP(3),
ADD COLUMN     "euConsentedBy" TEXT;
