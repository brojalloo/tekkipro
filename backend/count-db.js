const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const counts = {
    users: await prisma.user.count(),
    boutiques: await prisma.boutique.count(),
    products: await prisma.produit.count(),
    sales: await prisma.vente.count(),
    categories: await prisma.categorie.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
