const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const boutiques = await prisma.boutique.findMany({
    include: {
      _count: {
        select: {
          produits: true,
          ventes: true,
          clients: true,
        }
      }
    }
  });
  console.log('--- BOUTIQUES AUDIT ---');
  boutiques.forEach(b => {
    console.log(`Boutique: ${b.nom} (ID: ${b.id})`);
    console.log(`  Products: ${b._count.produits}`);
    console.log(`  Sales:    ${b._count.ventes}`);
    console.log(`  Clients:  ${b._count.clients}`);
  });
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
