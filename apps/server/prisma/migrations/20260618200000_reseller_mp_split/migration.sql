-- AlterTable
ALTER TABLE "OrgSetting" ADD COLUMN     "mpAccessToken" TEXT,
ADD COLUMN     "mpRefreshToken" TEXT,
ADD COLUMN     "mpUserId" TEXT,
ADD COLUMN     "mpConnectedAt" TIMESTAMP(3);
