BEGIN;

-- CreateEnum
CREATE TYPE "BoutiqueStatut" AS ENUM ('ACTIVE', 'SUSPENDUE');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('IN', 'OUT', 'SALE', 'RETURN', 'ADJUSTMENT', 'LOSS');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'STOCK_ADJUST', 'PRICE_CHANGE');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'CONFIRME', 'ECHOUE', 'REMBOURSE');

-- AlterEnum
ALTER TYPE "ModePaiementAbo" ADD VALUE 'STRIPE';
ALTER TYPE "ModePaiementAbo" ADD VALUE 'PAYPAL';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';

-- AlterEnum
ALTER TYPE "StatutAbonnement" ADD VALUE 'EN_ATTENTE';

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_boutiqueId_fkey";

-- AlterTable
ALTER TABLE "boutiques" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "statut" "BoutiqueStatut" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "entree_stocks" ADD COLUMN     "quantiteBase" DOUBLE PRECISION,
ADD COLUMN     "uniteNom" TEXT;

-- AlterTable
ALTER TABLE "paiements_abonnement" ADD COLUMN     "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
ADD COLUMN     "stripePaymentId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT;

-- AlterTable
ALTER TABLE "produits" ALTER COLUMN "prixVente" SET DEFAULT 0,
ALTER COLUMN "prixAchat" SET DEFAULT 0,
ALTER COLUMN "stock" SET DEFAULT 0,
ALTER COLUMN "stockAlerte" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tokenResetPassword" TEXT,
ADD COLUMN     "tokenResetPasswordExp" TIMESTAMP(3),
ADD COLUMN     "tokenVerification" TEXT,
ADD COLUMN     "tokenVerificationExp" TIMESTAMP(3),
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "boutiqueId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "vente_details" ADD COLUMN     "quantiteBase" DOUBLE PRECISION;

-- Convertir les fractions existantes sans perdre leurs identifiants ni leurs valeurs.
ALTER TABLE "fractions_produit" RENAME TO "unites_vente";
ALTER TABLE "unites_vente" RENAME COLUMN "valeur" TO "facteurConversion";
ALTER TABLE "unites_vente" RENAME CONSTRAINT "fractions_produit_pkey" TO "unites_vente_pkey";
ALTER TABLE "unites_vente" RENAME CONSTRAINT "fractions_produit_produitId_fkey" TO "unites_vente_produitId_fkey";
ALTER SEQUENCE "fractions_produit_id_seq" RENAME TO "unites_vente_id_seq";
ALTER TABLE "unites_vente" ADD COLUMN "prixAchat" DOUBLE PRECISION,
ADD COLUMN "estDefaut" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "product_barcodes" (
    "id" SERIAL NOT NULL,
    "barcode" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "produitId" INTEGER NOT NULL,
    "uniteId" INTEGER,
    "boutiqueId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" SERIAL NOT NULL,
    "type" "TypeMouvement" NOT NULL,
    "quantiteBase" DOUBLE PRECISION NOT NULL,
    "uniteNom" TEXT,
    "facteurConv" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "coutUnitaire" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referenceType" TEXT,
    "referenceId" INTEGER,
    "note" TEXT,
    "produitId" INTEGER NOT NULL,
    "boutiqueId" INTEGER NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_balances" (
    "id" SERIAL NOT NULL,
    "stockBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dernierMouvement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "produitId" INTEGER NOT NULL,
    "boutiqueId" INTEGER NOT NULL,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" INTEGER,
    "message" TEXT,
    "avant" JSONB,
    "apres" JSONB,
    "userId" INTEGER,
    "boutiqueId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unites_vente_produitId_idx" ON "unites_vente"("produitId");

-- CreateIndex
CREATE INDEX "product_barcodes_boutiqueId_barcode_idx" ON "product_barcodes"("boutiqueId", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_boutiqueId_barcode_key" ON "product_barcodes"("boutiqueId", "barcode");

-- CreateIndex
CREATE INDEX "stock_movements_boutiqueId_produitId_idx" ON "stock_movements"("boutiqueId", "produitId");

-- CreateIndex
CREATE INDEX "stock_movements_boutiqueId_createdAt_idx" ON "stock_movements"("boutiqueId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "stock_balances_produitId_key" ON "stock_balances"("produitId");

-- CreateIndex
CREATE INDEX "stock_balances_boutiqueId_idx" ON "stock_balances"("boutiqueId");

-- CreateIndex
CREATE INDEX "audit_logs_boutiqueId_createdAt_idx" ON "audit_logs"("boutiqueId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_boutiqueId_entite_idx" ON "audit_logs"("boutiqueId", "entite");

-- CreateIndex
CREATE INDEX "dettes_clientId_idx" ON "dettes"("clientId");

-- CreateIndex
CREATE INDEX "dettes_statut_idx" ON "dettes"("statut");

-- CreateIndex
CREATE INDEX "entree_stocks_boutiqueId_produitId_idx" ON "entree_stocks"("boutiqueId", "produitId");

-- CreateIndex
CREATE INDEX "entree_stocks_boutiqueId_createdAt_idx" ON "entree_stocks"("boutiqueId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_abonnement_stripeSessionId_key" ON "paiements_abonnement"("stripeSessionId");

-- CreateIndex
CREATE INDEX "produits_boutiqueId_actif_idx" ON "produits"("boutiqueId", "actif");

-- CreateIndex
CREATE INDEX "produits_boutiqueId_nom_idx" ON "produits"("boutiqueId", "nom");

-- CreateIndex
CREATE INDEX "produits_boutiqueId_categorieId_idx" ON "produits"("boutiqueId", "categorieId");

-- CreateIndex
CREATE INDEX "remboursements_detteId_idx" ON "remboursements"("detteId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tokenVerification_key" ON "users"("tokenVerification");

-- CreateIndex
CREATE UNIQUE INDEX "users_tokenResetPassword_key" ON "users"("tokenResetPassword");

-- CreateIndex
CREATE INDEX "vente_details_venteId_idx" ON "vente_details"("venteId");

-- CreateIndex
CREATE INDEX "vente_details_produitId_idx" ON "vente_details"("produitId");

-- CreateIndex
CREATE INDEX "ventes_boutiqueId_createdAt_idx" ON "ventes"("boutiqueId", "createdAt");

-- CreateIndex
CREATE INDEX "ventes_boutiqueId_clientId_idx" ON "ventes"("boutiqueId", "clientId");

-- CreateIndex
CREATE INDEX "ventes_boutiqueId_statut_idx" ON "ventes"("boutiqueId", "statut");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
