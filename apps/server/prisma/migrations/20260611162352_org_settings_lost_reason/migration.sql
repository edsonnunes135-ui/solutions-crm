-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "lostReason" TEXT;

-- CreateTable
CREATE TABLE "OrgSetting" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "whatsappAccessToken" TEXT,
    "whatsappPhoneNumberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgSetting_orgId_key" ON "OrgSetting"("orgId");

-- AddForeignKey
ALTER TABLE "OrgSetting" ADD CONSTRAINT "OrgSetting_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
