-- Propostas / orçamentos com link público.
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "contactName" TEXT,
    "title" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Proposal_publicId_key" ON "Proposal"("publicId");
CREATE INDEX "Proposal_orgId_idx" ON "Proposal"("orgId");
