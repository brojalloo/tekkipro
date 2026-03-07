-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('ACTIF', 'EXPIRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "ModePaiementAbo" AS ENUM ('WAVE', 'ORANGE_MONEY', 'FREE_MONEY', 'VIREMENT', 'CASH');

-- CreateTable
CREATE TABLE "abonnements" (
    "id" SERIAL NOT NULL,
    "plan" "Plan" NOT NULL,
    "statut" "StatutAbonnement" NOT NULL DEFAULT 'ACTIF',
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "boutiqueId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abonnements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_abonnement" (
    "id" SERIAL NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "modePaiement" "ModePaiementAbo" NOT NULL,
    "reference" TEXT,
    "telephone" TEXT,
    "abonnementId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_abonnement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "boutiques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_abonnement" ADD CONSTRAINT "paiements_abonnement_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "abonnements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
