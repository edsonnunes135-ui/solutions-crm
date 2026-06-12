-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "assigneeId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'trial',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
