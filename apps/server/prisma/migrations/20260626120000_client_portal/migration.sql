-- Portal do cliente (magic-link) + vínculo proposta→contato
ALTER TABLE "Proposal" ADD COLUMN "contactId" TEXT;
CREATE INDEX "Proposal_contactId_idx" ON "Proposal"("contactId");

ALTER TABLE "Contact" ADD COLUMN "portalToken" TEXT;
CREATE UNIQUE INDEX "Contact_portalToken_key" ON "Contact"("portalToken");
