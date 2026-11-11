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

function switchEndpointScheme(endpoint: string, scheme: 'http:' | 'https:'): string {
  const url = new URL(endpoint);
  url.protocol = scheme;
  if (scheme === 'https:' && url.port === '80') url.port = '';
  if (scheme === 'http:' && url.port === '443') url.port = '';
  return url.toString().replace(/\/$/, '');
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
    const endpoint = config.endpoint.replace(/\/$/, '');
    let protocol = '';
    try {
      protocol = new URL(endpoint).protocol;
    } catch {
      res.json({ reachable: false, message: 'Invalid endpoint URL' });
      return;
    }

    try {
      const result = await probeVidFlow(endpoint);
      let httpsReachable: boolean | null = null;
      let httpsStatus: number | null = null;
      let httpsEndpoint: string | null = null;

      if (protocol === 'http:') {
        httpsEndpoint = switchEndpointScheme(endpoint, 'https:');
        try {
          const secureProbe = await probeVidFlow(httpsEndpoint);
          httpsReachable = secureProbe.ok;
          httpsStatus = secureProbe.status;
        } catch {
          httpsReachable = false;
          httpsStatus = null;
        }
      }

      res.json({
        reachable: result.ok,
        status: result.status,
        protocol,
        endpoint,
        httpsReachable,
        httpsStatus,
        httpsEndpoint,
      });
    } catch (fetchErr) {
      const error = fetchErr as NodeJS.ErrnoException;
      if (protocol === 'https:') {
        const httpEndpoint = switchEndpointScheme(endpoint, 'http:');
        try {
          const fallback = await probeVidFlow(httpEndpoint);
          if (fallback.ok) {
            res.json({
              reachable: false,
              protocol,
              endpoint,
              message:
                'HTTPS endpoint is not reachable, but HTTP is reachable. Configure TLS on VidFlow or reverse proxy and save the HTTPS URL.',
              httpReachable: true,
              httpStatus: fallback.status,
              httpEndpoint,
            });
            return;
          }
        } catch {
          // fall through to generic error response
        }
      }
      const message = error.code === 'EPROTO' || /wrong version number/i.test(error.message)
        ? 'VidFlow answered without TLS. Use http:// for a plain HTTP listener, or configure HTTPS on VidFlow/reverse proxy before saving an https:// URL.'
        : error.message || 'Connection failed';
      res.json({ reachable: false, message });
    }
  } catch (err) {
    res.status(500).json({ error: 'Status check failed' });
  }
});
