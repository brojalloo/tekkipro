const prisma = require('../src/config/database');

async function main() {
  try {
    const boutique = await prisma.boutique.findFirst();
    if (!boutique) {
      console.error('No boutique found in DB. Create one via /api/auth/register first.');
      process.exit(1);
    }

    const commercialMode = 'poids';
    const commercialSize = 50; // kg
    const commercialCount = 2;

    let stockBase = commercialCount * commercialSize * 1000; // grams

    const unitsToCreate = [];
    const nomCommercial = `Sac ${commercialSize}kg`;
    const facteur = commercialSize * 1000;
    unitsToCreate.push({ nom: nomCommercial, facteurConversion: facteur, prix: 0, prixAchat: null, estDefaut: true });

    console.log('Attempting to create product with boutiqueId=', boutique.id);
    console.log('unitsToCreate=', unitsToCreate);

    const produit = await prisma.produit.create({
      data: {
        nom: 'DbgScript Product',
        description: 'Created by test script',
        prixVente: 15000,
        prixAchat: 10000,
        stock: stockBase,
        stockAlerte: 0,
        uniteBase: 'g',
        boutiqueId: boutique.id,
        unitesVente: { create: unitsToCreate },
      },
      include: { unitesVente: true },
    });

    console.log('Created product:', produit);
  } catch (err) {
    console.error('Error in test create:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
