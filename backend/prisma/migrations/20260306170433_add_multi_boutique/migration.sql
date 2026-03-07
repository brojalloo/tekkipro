-- AlterTable
ALTER TABLE "boutiques" ADD COLUMN     "parentBoutiqueId" INTEGER;

-- AddForeignKey
ALTER TABLE "boutiques" ADD CONSTRAINT "boutiques_parentBoutiqueId_fkey" FOREIGN KEY ("parentBoutiqueId") REFERENCES "boutiques"("id") ON DELETE SET NULL ON UPDATE CASCADE;
