import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const meRouter = Router();

meRouter.get('/', async (req, res) => {
  const me = await (prisma.user as any).findUnique({
    where: { id: req.user!.id },
    include: {
      manager:          { select: { id: true, name: true, email: true } },
      assignedManagers: { include: { manager: { select: { id: true, name: true, email: true } } } },
      progress:         true,
      badges:           true,
      certifications:   true,
    },
  });
  res.json(me);
});

meRouter.post('/avatar-done', async (req, res) => {
  const { avatar, playerName } = req.body || {};
  const data: Record<string, unknown> = { hasAvatar: true };
  if (avatar) data.avatarData = { avatar, playerName: playerName ?? null };
  await (prisma.user as any).update({ where: { id: req.user!.id }, data });
  res.json({ ok: true });
});

meRouter.get('/progress', async (req, res) => {
  const progress = await prisma.progress.findMany({
    where: { userId: req.user!.id },
    orderBy: { completedAt: 'desc' },
  });
  res.json(progress);
});

const upsertProgressSchema = z.object({
  module: z.string().min(1),
  questId: z.string().min(1),
  score: z.number().int().nonnegative(),
  totalQuestions: z.number().int().positive(),
  xpEarned: z.number().int().nonnegative(),
  badgeName: z.string().optional(),
});

meRouter.post('/progress', async (req, res) => {
  const parsed = upsertProgressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { module, questId, score, totalQuestions, xpEarned, badgeName } = parsed.data;
  const userId = req.user!.id;

  const existing = await prisma.progress.findUnique({
    where: { userId_module_questId: { userId, module, questId } },
  });
  const shouldWrite = !existing || existing.score < score;

  const progress = shouldWrite
    ? await prisma.progress.upsert({
        where: { userId_module_questId: { userId, module, questId } },
        create: { userId, module, questId, score, totalQuestions, xpEarned },
        update: { score, totalQuestions, xpEarned, completedAt: new Date() },
      })
    : existing;

  let badge = null;
  if (badgeName) {
    badge = await prisma.badge.upsert({
      where: { userId_badgeName: { userId, badgeName } },
      create: { userId, module, badgeName },
      update: {},
    });
  }

  res.json({ progress, badge });
});

const setManagerSchema = z.object({
  managerEmail: z.string().email().optional().nullable(),
});

meRouter.post('/manager', async (req, res) => {
  const parsed = setManagerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const email = parsed.data.managerEmail?.toLowerCase() ?? null;
  const userId = req.user!.id;

  if (!email) {
    const user = await prisma.user.update({ where: { id: userId }, data: { managerId: null } });
    return res.json(user);
  }

  const manager = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: email, role: 'MANAGER' },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { managerId: manager.id },
    include: { manager: { select: { id: true, name: true, email: true } } },
  });
  res.json(user);
});
