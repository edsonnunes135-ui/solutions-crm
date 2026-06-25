-- Notas internas do contato (só a equipe vê).
CREATE TABLE "ContactNote" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactNote_contactId_idx" ON "ContactNote"("contactId");
