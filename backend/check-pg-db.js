const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const result = await prisma.$queryRaw`SELECT datname FROM pg_database WHERE datistemplate = false;`;
  console.log('Available Databases:');
  console.log(JSON.stringify(result, null, 2));

  const currentDB = await prisma.$queryRaw`SELECT current_database();`;
  console.log('Current Database:');
  console.log(JSON.stringify(currentDB, null, 2));
  
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
