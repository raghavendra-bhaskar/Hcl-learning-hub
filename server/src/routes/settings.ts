import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/requireRole.js';

export const settingsRouter = Router();

// GET all settings (authenticated)
settingsRouter.get('/', async (_req, res) => {
  const rows = await (prisma as any).setting.findMany({ where: { NOT: { key: { startsWith: 'ai.' } } } });
  const map: Record<string, string> = {};
  rows.forEach((r: any) => { map[r.key] = r.value; });
  res.json(map);
});

// PUT upsert a setting (ADMIN)
settingsRouter.put('/:key', requireRole('ADMIN'), async (req, res) => {
  if (req.params.key.startsWith('ai.')) return res.status(400).json({ error: 'Use AI Provider settings to configure AI.' });
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: 'value required' });
  const s = await (prisma as any).setting.upsert({
    where: { key: req.params.key },
    update: { value: String(value) },
    create: { key: req.params.key, value: String(value) },
  });
  res.json(s);
});

// DELETE a setting (ADMIN)
settingsRouter.delete('/:key', requireRole('ADMIN'), async (req, res) => {
  if (req.params.key.startsWith('ai.')) return res.status(400).json({ error: 'Use AI Provider settings to configure AI.' });
  try {
    await (prisma as any).setting.delete({ where: { key: req.params.key } });
  } catch {}
  res.json({ ok: true });
});
