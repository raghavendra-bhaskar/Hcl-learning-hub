import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

export const learningPathsRouter = Router();

const pathItemInclude = {
  items: { orderBy: { order: 'asc' as const } },
};

// ── Get all paths for current user ───────────────────────────────────────────
learningPathsRouter.get('/', async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const paths = await (prisma as any).learningPath.findMany({
    where: { userId },
    include: { _count: { select: { items: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(paths);
});

// ── Get single path ───────────────────────────────────────────────────────────
learningPathsRouter.get('/:id', async (req: any, res) => {
  const userId = req.user?.id;
  const path = await (prisma as any).learningPath.findUnique({
    where: { id: req.params.id },
    include: pathItemInclude,
  });
  if (!path) return res.status(404).json({ error: 'Not found' });
  if (path.userId !== userId && path.visibility !== 'public') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(path);
});

// ── Create path ───────────────────────────────────────────────────────────────
learningPathsRouter.post('/', async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { title, description } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title required' });
  const path = await (prisma as any).learningPath.create({
    data: { userId, title: title.trim(), description: description?.trim() || null },
    include: pathItemInclude,
  });
  res.json(path);
});

// ── Update path metadata ──────────────────────────────────────────────────────
learningPathsRouter.put('/:id', async (req: any, res) => {
  const userId = req.user?.id;
  const path = await (prisma as any).learningPath.findUnique({ where: { id: req.params.id } });
  if (!path || path.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const { title, description, visibility, certificate } = req.body;
  const data: any = {};
  if (title       !== undefined) data.title       = title.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (visibility  !== undefined) data.visibility  = visibility;
  if (certificate !== undefined) data.certificate = certificate?.trim() || null;
  const updated = await (prisma as any).learningPath.update({
    where: { id: req.params.id },
    data,
    include: pathItemInclude,
  });
  res.json(updated);
});

// ── Delete path ───────────────────────────────────────────────────────────────
learningPathsRouter.delete('/:id', async (req: any, res) => {
  const userId = req.user?.id;
  const path = await (prisma as any).learningPath.findUnique({ where: { id: req.params.id } });
  if (!path || path.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  await (prisma as any).learningPath.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Add item to path ──────────────────────────────────────────────────────────
learningPathsRouter.post('/:id/items', async (req: any, res) => {
  const userId = req.user?.id;
  const lp = await (prisma as any).learningPath.findUnique({ where: { id: req.params.id } });
  if (!lp || lp.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const { type, refId, title, subtitle, emoji, accentColor, durationMinutes, order } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'type and title required' });
  const maxOrder = await (prisma as any).learningPathItem.findFirst({
    where: { pathId: req.params.id },
    orderBy: { order: 'desc' },
  });
  const item = await (prisma as any).learningPathItem.create({
    data: {
      pathId:          req.params.id,
      type,
      refId:           refId   || null,
      title,
      subtitle:        subtitle    || null,
      emoji:           emoji       || null,
      accentColor:     accentColor || null,
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      order:           order !== undefined ? Number(order) : (maxOrder?.order ?? -1) + 1,
    },
  });
  await (prisma as any).learningPath.update({ where: { id: req.params.id }, data: {} }); // touch updatedAt
  res.json(item);
});

// ── Update item (duration, title, order…) ────────────────────────────────────
learningPathsRouter.put('/items/:id', async (req: any, res) => {
  const userId = req.user?.id;
  const item = await (prisma as any).learningPathItem.findUnique({
    where: { id: req.params.id },
    include: { path: true },
  });
  if (!item || item.path.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const { title, subtitle, durationMinutes, order, emoji, accentColor } = req.body;
  const data: any = {};
  if (title           !== undefined) data.title           = title;
  if (subtitle        !== undefined) data.subtitle        = subtitle || null;
  if (durationMinutes !== undefined) data.durationMinutes = durationMinutes ? Number(durationMinutes) : null;
  if (order           !== undefined) data.order           = Number(order);
  if (emoji           !== undefined) data.emoji           = emoji || null;
  if (accentColor     !== undefined) data.accentColor     = accentColor || null;
  const updated = await (prisma as any).learningPathItem.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

// ── Delete item ───────────────────────────────────────────────────────────────
learningPathsRouter.delete('/items/:id', async (req: any, res) => {
  const userId = req.user?.id;
  const item = await (prisma as any).learningPathItem.findUnique({
    where: { id: req.params.id },
    include: { path: true },
  });
  if (!item || item.path.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  await (prisma as any).learningPathItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Reorder items ─────────────────────────────────────────────────────────────
learningPathsRouter.put('/:id/reorder-items', async (req: any, res) => {
  const userId = req.user?.id;
  const lp = await (prisma as any).learningPath.findUnique({ where: { id: req.params.id } });
  if (!lp || lp.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const { orders } = req.body; // [{ id, order }]
  if (!Array.isArray(orders)) return res.status(400).json({ error: 'orders array required' });
  await Promise.all(orders.map(({ id, order }: any) =>
    (prisma as any).learningPathItem.update({ where: { id }, data: { order: Number(order) } })
  ));
  res.json({ ok: true });
});
