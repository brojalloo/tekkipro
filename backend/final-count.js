const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const sales = await prisma.vente.count();
  const products = await prisma.produit.count();
  console.log(`Global Sales: ${sales}`);
  console.log(`Global Products: ${products}`);
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
