-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "churnScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastChurnCalcAt" TIMESTAMP(3);
