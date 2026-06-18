-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "usageMinutes" INTEGER NOT NULL DEFAULT 0;
