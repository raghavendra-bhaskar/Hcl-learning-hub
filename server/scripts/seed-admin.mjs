import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const password = process.env.LOCAL_ADMIN_PASSWORD || 'Admin@HCL2026!';
const hash = await bcrypt.hash(password, 12);

const u = await prisma.user.upsert({
  where:  { email: 'admin@local' },
  update: { name: 'Administrator', role: 'ADMIN', isLocalUser: true, passwordHash: hash },
  create: { email: 'admin@local', name: 'Administrator', role: 'ADMIN', isLocalUser: true, passwordHash: hash },
});

console.log('Admin upserted:', u.email, u.role);
await prisma.$disconnect();
