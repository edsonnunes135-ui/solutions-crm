-- White-label atacado recorrente: assinatura do cliente (na conta do parceiro)
-- e taxa da plataforma (parceiro paga a Solutions), ambas via Mercado Pago /preapproval.

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "mpPreapprovalId" TEXT;

-- AlterTable
ALTER TABLE "OrgSetting" ADD COLUMN     "platformFeePreapprovalId" TEXT,
ADD COLUMN     "platformFeeStatus" TEXT,
ADD COLUMN     "platformFeeAmount" INTEGER;
