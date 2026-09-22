import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@local' },
    update: { role: 'ADMIN' },
    create: { email: 'admin@local', name: 'Administrator', role: 'ADMIN' },
  });

  const manager1 = await prisma.user.upsert({
    where: { email: 'manager1@hcl-software.com' },
    update: { role: 'MANAGER' },
    create: { email: 'manager1@hcl-software.com', name: 'Meera Iyer', role: 'MANAGER' },
  });

  const manager2 = await prisma.user.upsert({
    where: { email: 'manager2@hcl-software.com' },
    update: { role: 'MANAGER' },
    create: { email: 'manager2@hcl-software.com', name: 'David Park', role: 'MANAGER' },
  });

  const learners = [
    { email: 'alex.chen@hcl-software.com',    name: 'Alex Chen',    managerId: manager1.id },
    { email: 'sarah.kim@hcl-software.com',    name: 'Sarah Kim',    managerId: manager1.id },
    { email: 'marcus.lee@hcl-software.com',   name: 'Marcus Lee',   managerId: manager1.id },
    { email: 'priya.singh@hcl-software.com',  name: 'Priya Singh',  managerId: manager2.id },
    { email: 'tom.wright@hcl-software.com',   name: 'Tom Wright',   managerId: manager2.id },
    { email: 'ravi.kumar@hcl-software.com',   name: 'Ravi Kumar',   managerId: manager2.id },
    { email: 'lin.zhang@hcl-software.com',    name: 'Lin Zhang',    managerId: manager1.id },
  ];

  for (const l of learners) {
    const u = await prisma.user.upsert({
      where: { email: l.email },
      update: { managerId: l.managerId },
      create: { email: l.email, name: l.name, managerId: l.managerId, role: 'USER' },
    });

    // A little demo progress so the manager dashboard has something to render.
    await prisma.progress.upsert({
      where: { userId_module_questId: { userId: u.id, module: 'ai-quest', questId: 'python-ai' } },
      update: {},
      create: { userId: u.id, module: 'ai-quest', questId: 'python-ai', score: 5, totalQuestions: 6, xpEarned: 120 },
    });
    await prisma.progress.upsert({
      where: { userId_module_questId: { userId: u.id, module: 'devops-loop', questId: 'dq-install-steps' } },
      update: {},
      create: { userId: u.id, module: 'devops-loop', questId: 'dq-install-steps', score: 4, totalQuestions: 6, xpEarned: 100 },
    });
    await prisma.badge.upsert({
      where: { userId_badgeName: { userId: u.id, badgeName: 'Python Padawan' } },
      update: {},
      create: { userId: u.id, module: 'ai-quest', badgeName: 'Python Padawan' },
    });
  }

  console.log('Seed complete:');
  console.log('  admin       ->', admin.email);
  console.log('  manager1    ->', manager1.email);
  console.log('  manager2    ->', manager2.email);
  console.log('  learners    ->', learners.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
