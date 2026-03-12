require('dotenv').config();
const prisma = require('../src/config/database');
const jwt = require('jsonwebtoken');

(async () => {
  try {
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) {
      console.error('No ADMIN user found in DB. Create one via /api/auth/register');
      process.exit(1);
    }
    const token = jwt.sign({ id: user.id, role: user.role, boutiqueId: user.boutiqueId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    console.log(token);
  } catch (err) {
    console.error('Error generating token', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
