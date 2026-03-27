const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const sales = await prisma.vente.findMany({
    include: {
      boutique: true,
      details: true,
    }
  });
  console.log(`Total Sales found: ${sales.length}`);
  if (sales.length > 0) {
    console.log('Sample Sale:', JSON.stringify({
      id: sales[0].id,
      numero: sales[0].numero,
      date: sales[0].createdAt,
      boutiqueId: sales[0].boutiqueId,
      boutiqueNom: sales[0].boutique.nom
    }, null, 2));
  }
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
