const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const boutiques = await prisma.boutique.findMany({
    where: {
      produits: { some: {} }
    },
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
  console.log(JSON.stringify(boutiques, null, 2));
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
