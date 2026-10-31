#!/usr/bin/env node
// Resets the local admin password to match LOCAL_ADMIN_PASSWORD from the environment.
// Run on the server:  node --env-file=.env scripts/reset-admin-password.mjs
//
// If --env-file is unsupported (Node < 20.6) use:
//   LOCAL_ADMIN_PASSWORD=YourPass node scripts/reset-admin-password.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt  = require('bcryptjs');

// Inline minimal Prisma client bootstrap
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const email    = (process.env.LOCAL_ADMIN_USERNAME ?? 'admin@local').trim().toLowerCase() || 'admin@local';
const password = process.env.LOCAL_ADMIN_PASSWORD ?? 'admin';

const hash = await bcrypt.hash(password, 12);

const user = await prisma.user.upsert({
  where:  { email },
  update: { name: 'Administrator', role: 'ADMIN', isLocalUser: true, passwordHash: hash },
  create: { email, name: 'Administrator', role: 'ADMIN', isLocalUser: true, passwordHash: hash },
});

console.log(`✅  Admin password reset.`);
console.log(`    Email   : ${user.email}`);
console.log(`    Password: ${password}`);
await prisma.$disconnect();
