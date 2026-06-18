-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_scope_orgId_createdAt_idx" ON "ChatMessage"("scope", "orgId", "createdAt");
