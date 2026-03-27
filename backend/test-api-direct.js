const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@tekkipro.com' }
  });

  if (!user) {
    console.error('Admin user not found');
    process.exit(1);
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log('--- TOKEN GENERATED ---');
  console.log(token);
  console.log('--- USER INFO ---');
  console.log(JSON.stringify(user, null, 2));
  
  // Also check counts as seen by THIS client
  const counts = await prisma.vente.count({ where: { boutiqueId: user.boutiqueId } });
  console.log(`Boutique ID ${user.boutiqueId} has ${counts} sales according to this script.`);
  
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
