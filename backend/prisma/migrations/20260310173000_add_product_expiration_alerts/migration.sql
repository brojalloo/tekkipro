-- AlterTable
ALTER TABLE "produits"
ADD COLUMN "datePeremption" TIMESTAMP(3),
ADD COLUMN "alertePeremptionJours" INTEGER;