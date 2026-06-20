-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "resellerOrgId" TEXT;

-- CreateIndex
CREATE INDEX "Organization_resellerOrgId_idx" ON "Organization"("resellerOrgId");
