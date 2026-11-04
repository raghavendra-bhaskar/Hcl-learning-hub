import { Router } from 'express';
import https from 'node:https';
import http from 'node:http';
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

/**
 * Probe a VidFlow Streamlit endpoint and return reachability status.
 *
 * Uses Node's low-level http/https modules instead of global fetch so we can
 * set rejectUnauthorized:false — necessary when VidFlow uses a self-signed cert
 * (the common case for on-prem / LAN deployments).
 *
 * The probe hits /_stcore/health which Streamlit exposes as a lightweight 200 OK
 * once the server is ready, avoiding any redirect or auth overhead.
 */
function probeVidFlow(endpoint: string, timeoutMs = 7000): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve, reject) => {
    let base = endpoint.replace(/\/$/, '');
    const healthUrl = new URL('/_stcore/health', base + '/');
    const isHttps = healthUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    const req = client.request(
      {
        hostname: healthUrl.hostname,
        port: healthUrl.port || (isHttps ? 443 : 80),
        path: healthUrl.pathname,
        method: 'GET',
        timeout: timeoutMs,
        rejectUnauthorized: false,   // accept self-signed / LAN certs
        headers: { 'User-Agent': 'HCL-LearningHub-VidFlow-Probe/1.0' },
      },
      (r) => {
        r.resume();
        const status = r.statusCode ?? 0;
        resolve({ ok: status >= 200 && status < 400, status });
      },
    );
    req.on('timeout', () => { req.destroy(new Error('Connection timed out after ' + timeoutMs + 'ms')); });
    req.on('error', reject);
    req.end();
  });
}

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
      const result = await probeVidFlow(config.endpoint);
      res.json(result);
    } catch (fetchErr) {
      res.json({ reachable: false, message: (fetchErr as Error).message || 'Connection failed' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Status check failed' });
  }
});
