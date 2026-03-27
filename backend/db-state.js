const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const bCounts = await prisma.boutique.findMany({
    select: { id: true, nom: true, _count: { select: { produits: true, ventes: true, clients: true } } }
  });
  const uCounts = await prisma.user.findMany({
    select: { id: true, email: true, boutiqueId: true }
  });
  console.log('--- DB STATE ---');
  console.log('Boutiques:', JSON.stringify(bCounts, null, 2));
  console.log('Users:', JSON.stringify(uCounts, null, 2));
  const totalSales = await prisma.vente.count();
  console.log('Total Global Sales:', totalSales);
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
