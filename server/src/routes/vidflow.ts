import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const vidflowRouter = Router();

const VIDFLOW_CONFIG_KEY = 'vidflow.config';

const vidflowConfigSchema = z.object({
  enabled:  z.boolean().default(false),
  endpoint: z.string().trim().max(500).default(''),
  name:     z.string().trim().max(120).default('VidFlow — Script to Screen'),
}).strict();

type VidFlowConfig = z.infer<typeof vidflowConfigSchema>;

function normalizeConfig(raw: unknown): VidFlowConfig {
  const parsed = vidflowConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : vidflowConfigSchema.parse({});
}

function ensureAdmin(req: any, res: any): boolean {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return false; }
  if (req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Administrator access required' }); return false; }
  return true;
}

/* GET /vidflow/config — returns current VidFlow config (admin only) */
vidflowRouter.get('/config', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const row = await prisma.setting.findUnique({ where: { key: VIDFLOW_CONFIG_KEY } });
    res.json(normalizeConfig(row ? JSON.parse(row.value) : null));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read VidFlow config' });
  }
});

/* PUT /vidflow/config — saves VidFlow config (admin only) */
vidflowRouter.put('/config', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const config = vidflowConfigSchema.parse(req.body);
    await prisma.setting.upsert({
      where:  { key: VIDFLOW_CONFIG_KEY },
      create: { key: VIDFLOW_CONFIG_KEY, value: JSON.stringify(config) },
      update: { value: JSON.stringify(config) },
    });
    res.json(config);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0]?.message || 'Invalid VidFlow config' });
    } else {
      res.status(500).json({ error: 'Failed to save VidFlow config' });
    }
  }
});

/* GET /vidflow/status — checks whether the VidFlow Streamlit server is reachable (admin only) */
vidflowRouter.get('/status', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const row = await prisma.setting.findUnique({ where: { key: VIDFLOW_CONFIG_KEY } });
    const config = normalizeConfig(row ? JSON.parse(row.value) : null);
    if (!config.endpoint) {
      res.json({ reachable: false, message: 'No endpoint configured' });
      return;
    }
    try {
      const response = await fetch(config.endpoint, {
        signal: AbortSignal.timeout(6000),
        redirect: 'follow',
      });
      res.json({ reachable: response.ok || response.status === 200 || response.status === 302 || response.status === 301, status: response.status });
    } catch (fetchErr) {
      res.json({ reachable: false, message: (fetchErr as Error).message || 'Connection failed' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Status check failed' });
  }
});
