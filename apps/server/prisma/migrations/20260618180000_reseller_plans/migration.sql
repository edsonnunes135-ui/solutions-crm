-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "planLabel" TEXT,
ADD COLUMN     "planPrice" INTEGER,
ADD COLUMN     "maxUsers" INTEGER,
ADD COLUMN     "maxContacts" INTEGER,
ADD COLUMN     "maxAutomations" INTEGER,
ADD COLUMN     "featBroadcast" BOOLEAN,
ADD COLUMN     "featAi" BOOLEAN;

-- CreateTable
CREATE TABLE "ResellerPlan" (
    "id" TEXT NOT NULL,
    "resellerOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "users" INTEGER NOT NULL DEFAULT 2,
    "contacts" INTEGER NOT NULL DEFAULT 1000,
    "automations" INTEGER NOT NULL DEFAULT 5,
    "broadcast" BOOLEAN NOT NULL DEFAULT false,
    "ai" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResellerPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResellerPlan_resellerOrgId_idx" ON "ResellerPlan"("resellerOrgId");
