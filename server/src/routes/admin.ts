import { Router } from 'express';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { createDatabaseBackup } from '../lib/dbBackup.js';
import { getDeploymentStatus, getRollbackPreview, getUpgradePreview, startRollback, startUpgrade } from '../lib/deployment.js';
import { requireRole } from '../middleware/requireRole.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../../data/oidc-config.json');
const DATA_DIR    = join(__dirname, '../../data');

function readOidcConfig(): Record<string, unknown> {
  try {
    if (existsSync(CONFIG_PATH)) return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {}
  return {};
}

function writeOidcConfig(data: Record<string, unknown>): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export const adminRouter = Router();

adminRouter.use(requireRole('ADMIN'));

adminRouter.post('/db-backups', async (req, res) => {
  try {
    const rawLabel = typeof req.body?.label === 'string' ? req.body.label : 'manual-admin';
    const backup = await createDatabaseBackup({ label: rawLabel });
    res.status(201).json({ ok: true, backup });
  } catch (error) {
    console.error('[admin] db backup failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Database backup failed' });
  }
});

adminRouter.get('/deployment/status', async (_req, res) => {
  res.json(getDeploymentStatus('2'));
});

adminRouter.get('/deployment/upgrade-preview', async (_req, res) => {
  res.json(await getUpgradePreview('2'));
});

adminRouter.get('/deployment/rollback-preview', async (req, res) => {
  const version = typeof req.query?.version === 'string' ? req.query.version : undefined;
  res.json(await getRollbackPreview(version, '2'));
});

adminRouter.post('/deployment/upgrade', async (req, res) => {
  try {
    const version = typeof req.body?.version === 'string' && req.body.version.trim() ? req.body.version.trim() : '3';
    const result = startUpgrade(version);
    await prisma.setting.upsert({
      where: { key: 'deployment.currentVersion' },
      create: { key: 'deployment.currentVersion', value: version },
      update: { value: version },
    });
    res.status(202).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upgrade could not be started.';
    const status = /Linux VM runtime/i.test(message) ? 409 : 500;
    console.error('[admin] deployment upgrade failed:', error);
    res.status(status).json({ error: message });
  }
});

adminRouter.post('/deployment/rollback', async (req, res) => {
  try {
    const version = typeof req.body?.version === 'string' && req.body.version.trim() ? req.body.version.trim() : '';
    if (!version) return res.status(400).json({ error: 'Rollback version is required.' });
    const result = startRollback(version);
    await prisma.setting.upsert({
      where: { key: 'deployment.currentVersion' },
      create: { key: 'deployment.currentVersion', value: version },
      update: { value: version },
    });
    res.status(202).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rollback could not be started.';
    const status = /Linux VM runtime/i.test(message) ? 409 : 500;
    console.error('[admin] deployment rollback failed:', error);
    res.status(status).json({ error: message });
  }
});

adminRouter.get('/users', async (_req, res) => {
  const users = await (prisma.user as any).findMany({
    include: {
      manager:          { select: { id: true, email: true, name: true } },
      assignedManagers: { include: { manager: { select: { id: true, email: true, name: true } } } },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
  res.json(users);
});

adminRouter.post('/users/:id/managers', async (req, res) => {
  const userId     = req.params.id;
  const managerIds = (req.body as { managerIds?: string[] }).managerIds ?? [];

  await (prisma as any).userManager.deleteMany({ where: { userId } });

  if (managerIds.length > 0) {
    await (prisma as any).userManager.createMany({
      data: managerIds.map((managerId: string) => ({ userId, managerId })),
      skipDuplicates: true,
    });
    await prisma.user.update({ where: { id: userId }, data: { managerId: managerIds[0] } });
  } else {
    await prisma.user.update({ where: { id: userId }, data: { managerId: null } });
  }

  const updated = await (prisma.user as any).findUnique({
    where:   { id: userId },
    include: {
      manager:          { select: { id: true, email: true, name: true } },
      assignedManagers: { include: { manager: { select: { id: true, email: true, name: true } } } },
    },
  });
  res.json(updated);
});

const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional(),
  managerEmail: z.string().email().nullable().optional(),
  name: z.string().min(1).optional(),
});

adminRouter.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (id === req.user!.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  await prisma.user.delete({ where: { id } });
  res.status(204).end();
});

adminRouter.patch('/users/:id', async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { role, managerEmail, name } = parsed.data;

  let managerId: string | null | undefined;
  if (managerEmail === null) {
    managerId = null;
    await (prisma as any).userManager.deleteMany({ where: { userId: req.params.id } });
  } else if (managerEmail) {
    const manager = await prisma.user.upsert({
      where: { email: managerEmail.toLowerCase() },
      update: {},
      create: { email: managerEmail.toLowerCase(), name: managerEmail, role: 'MANAGER' },
    });
    managerId = manager.id;
    await (prisma as any).userManager.upsert({
      where:  { userId_managerId: { userId: req.params.id, managerId: manager.id } },
      update: {},
      create: { userId: req.params.id, managerId: manager.id },
    });
  }

  const updated = await (prisma as any).user.update({
    where: { id: req.params.id },
    data: { role, name, managerId },
    include: {
      manager:          { select: { id: true, email: true, name: true } },
      assignedManagers: { include: { manager: { select: { id: true, email: true, name: true } } } },
    },
  });
  res.json(updated);
});

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).default('USER'),
  managerEmail: z.string().email().optional(),
});

adminRouter.post('/users', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, name, role, managerEmail } = parsed.data;

  let managerId: string | undefined;
  if (managerEmail) {
    const manager = await prisma.user.upsert({
      where: { email: managerEmail.toLowerCase() },
      update: {},
      create: { email: managerEmail.toLowerCase(), name: managerEmail, role: 'MANAGER' },
    });
    managerId = manager.id;
  }

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { name, role, managerId },
    create: { email: email.toLowerCase(), name, role, managerId },
  });
  res.status(201).json(user);
});

// ── Local user management ────────────────────────────────────────────────────

const createLocalUserSchema = z.object({
  email:    z.string().min(1),
  name:     z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role:     z.enum(['ADMIN', 'MANAGER', 'USER']).default('USER'),
});

const transferOktaUsersSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

adminRouter.post('/local-users', async (req, res) => {
  const parsed = createLocalUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, name, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { name, role, passwordHash, isLocalUser: true },
    create: { email: email.toLowerCase(), name, role, passwordHash, isLocalUser: true },
  });
  const { passwordHash: _ph, ...safe } = user as typeof user & { passwordHash?: string };
  res.status(201).json(safe);
});

adminRouter.post('/local-users/transfer-okta', async (req, res) => {
  const parsed = transferOktaUsersSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const oktaUsers = await prisma.user.findMany({
    where: { oktaSub: { not: null } },
    select: { id: true, email: true, name: true },
    orderBy: { name: 'asc' },
  });

  if (oktaUsers.length === 0) {
    return res.json({ transferred: 0, users: [] });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction(oktaUsers.map((user) => prisma.user.update({
    where: { id: user.id },
    data: {
      isLocalUser: true,
      passwordHash,
      oktaSub: null,
    },
  })));

  res.json({
    transferred: oktaUsers.length,
    users: oktaUsers.map((user) => ({ id: user.id, email: user.email, name: user.name })),
  });
});

adminRouter.patch('/local-users/:id/password', async (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.isLocalUser) return res.status(400).json({ error: 'Not a local user' });
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: hash } });
  res.json({ ok: true });
});

adminRouter.delete('/local-users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.isLocalUser) return res.status(400).json({ error: 'Not a local user' });
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ── OIDC / Authentication Realm configuration ────────────────────────────────

const oidcConfigSchema = z.object({
  enabled:               z.boolean().optional(),
  realmName:             z.string().optional(),
  description:           z.string().optional(),
  issuer:                z.string().url().optional().or(z.literal('')),
  clientId:              z.string().optional(),
  clientSecret:          z.string().optional(),
  scopes:                z.string().optional(),
  jwksUri:               z.string().optional(),
  authorizationEndpoint: z.string().optional(),
  tokenEndpoint:         z.string().optional(),
  userinfoEndpoint:      z.string().optional(),
  endSessionEndpoint:    z.string().optional(),
  managerClaim:          z.string().optional(),
  managerIdClaim:        z.string().optional(),
  oktaApiToken:          z.string().optional(),
});

adminRouter.get('/oidc-config', (_req, res) => {
  res.json(readOidcConfig());
});

adminRouter.put('/oidc-config', (req, res) => {
  const parsed = oidcConfigSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const current = readOidcConfig();
  const merged  = { ...current, ...parsed.data };
  writeOidcConfig(merged);
  res.json(merged);
});

// ── Okta Management API: bulk-sync manager assignments for all Okta users ───
adminRouter.post('/users/sync-okta-managers', async (_req, res) => {
  const cfg = readOidcConfig();
  const apiToken = cfg.oktaApiToken as string | undefined;
  if (!apiToken) return res.status(400).json({ error: 'Okta API token not configured in Authentication Realm' });

  const issuer = String(cfg.issuer || '');
  const orgUrl = issuer.replace(/\/oauth2.*$/, '').replace(/\/$/, '');
  if (!orgUrl) return res.status(400).json({ error: 'Okta issuer not configured' });

  const oktaUsers = await (prisma.user as any).findMany({
    where: { oktaSub: { not: null } },
  });

  console.log(`[admin] sync-okta-managers: syncing ${oktaUsers.length} Okta users via ${orgUrl}`);

  const results: Array<Record<string, unknown>> = [];
  for (const user of oktaUsers) {
    try {
      const r = await fetch(`${orgUrl}/api/v1/users/${user.oktaSub}/manager`, {
        headers: { Authorization: `SSWS ${apiToken}`, Accept: 'application/json' },
      });
      if (r.ok) {
        const mgr = await r.json() as Record<string, any>;
        const mgrEmail = (mgr.profile?.email || mgr.profile?.login || '').toLowerCase();
        const mgrName  = mgr.profile?.displayName || mgr.profile?.firstName
          ? `${mgr.profile?.firstName || ''} ${mgr.profile?.lastName || ''}`.trim()
          : mgrEmail;
        if (mgrEmail) {
          const manager = await (prisma.user as any).upsert({
            where:  { email: mgrEmail },
            update: { role: 'MANAGER', ...(mgrName ? { name: mgrName } : {}) },
            create: { email: mgrEmail, name: mgrName || mgrEmail, role: 'MANAGER' },
          });
          await (prisma.user as any).update({ where: { id: user.id }, data: { managerId: manager.id } });
          await (prisma.userManager as any).upsert({
            where:  { userId_managerId: { userId: user.id, managerId: manager.id } },
            update: {},
            create: { userId: user.id, managerId: manager.id },
          });
          results.push({ email: user.email, managerEmail: mgrEmail, status: 'assigned' });
          console.log(`[admin] sync: ${user.email} → manager: ${mgrEmail}`);
        } else {
          results.push({ email: user.email, status: 'no-manager' });
        }
      } else if (r.status === 404) {
        results.push({ email: user.email, status: 'no-manager-in-okta' });
      } else {
        const errText = await r.text();
        console.warn(`[admin] sync error for ${user.email}:`, r.status, errText);
        results.push({ email: user.email, status: 'okta-error', detail: errText.slice(0, 200) });
      }
    } catch (err) {
      results.push({ email: user.email, status: 'error', detail: String(err) });
    }
  }

  const assigned = results.filter(r => r.status === 'assigned').length;
  console.log(`[admin] sync-okta-managers complete: ${assigned}/${oktaUsers.length} managers assigned`);
  res.json({ total: oktaUsers.length, assigned, results });
});

adminRouter.post('/oidc-config/discover', async (req, res) => {
  const { issuer } = req.body as { issuer?: string };
  if (!issuer) return res.status(400).json({ error: 'issuer is required' });
  try {
    const wellKnown = issuer.replace(/\/$/, '') + '/.well-known/openid-configuration';
    const r = await fetch(wellKnown);
    if (!r.ok) return res.status(502).json({ error: `Discovery endpoint returned ${r.status}` });
    const meta = await r.json() as Record<string, unknown>;
    res.json({
      issuer:                meta.issuer                || '',
      jwksUri:               meta.jwks_uri              || '',
      authorizationEndpoint: meta.authorization_endpoint || '',
      tokenEndpoint:         meta.token_endpoint         || '',
      userinfoEndpoint:      meta.userinfo_endpoint       || '',
      endSessionEndpoint:    meta.end_session_endpoint    || '',
    });
  } catch (err) {
    console.error('[admin] OIDC discovery failed:', err);
    res.status(502).json({ error: 'Failed to fetch OIDC discovery document' });
  }
});
