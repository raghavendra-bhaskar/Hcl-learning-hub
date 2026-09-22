import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, oktaEnabled } from '../env.js';
import { prisma } from '../lib/prisma.js';
import type { Role } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OIDC_CONFIG_PATH = join(__dirname, '../../data/oidc-config.json');

function getOidcConfig(): { issuer: string; clientId: string; jwksUri: string } {
  try {
    if (existsSync(OIDC_CONFIG_PATH)) {
      const cfg = JSON.parse(readFileSync(OIDC_CONFIG_PATH, 'utf8'));
      if (cfg.issuer && cfg.clientId) return cfg;
    }
  } catch {}
  return { issuer: env.oktaIssuer, clientId: env.oktaClientId, jwksUri: '' };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  managerId: string | null;
  source: 'okta' | 'local-admin' | 'local-user';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// JWKS is created lazily from oidc-config.json (or env fallback) on first Okta token verification.
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let _jwksIssuer = '';

function getJwks() {
  const cfg = getOidcConfig();
  if (!cfg.issuer || !cfg.clientId) return null;
  if (_jwks && _jwksIssuer === cfg.issuer) return _jwks;
  const keysUrl = cfg.jwksUri || `${cfg.issuer.replace(/\/$/, '')}/v1/keys`;
  _jwks = createRemoteJWKSet(new URL(keysUrl));
  _jwksIssuer = cfg.issuer;
  return _jwks;
}

const localSecret = new TextEncoder().encode(env.localAdminSecret);

export async function signLocalAdminToken(payload: { sub: string; email: string; name: string }) {
  return new SignJWT({ ...payload, role: 'ADMIN', kind: 'local-admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('hcl-hub-local')
    .setAudience('hcl-hub')
    .setExpirationTime('12h')
    .setSubject(payload.sub)
    .sign(localSecret);
}

export async function signLocalUserToken(payload: { sub: string; email: string; name: string; role: string }) {
  return new SignJWT({ ...payload, kind: 'local-user' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('hcl-hub-local')
    .setAudience('hcl-hub')
    .setExpirationTime('12h')
    .setSubject(payload.sub)
    .sign(localSecret);
}

async function verifyToken(token: string) {
  // Try local admin token first (fast, symmetric)
  try {
    const { payload } = await jwtVerify(token, localSecret, {
      issuer: 'hcl-hub-local',
      audience: 'hcl-hub',
    });
    if (payload.kind === 'local-admin') return { source: 'local-admin' as const, payload };
    if (payload.kind === 'local-user')  return { source: 'local-user'  as const, payload };
  } catch {
    /* fall through to Okta */
  }

  const jwks = getJwks();
  const cfg   = getOidcConfig();
  if (!jwks) throw new Error('No Okta verifier available. Configure OIDC in the admin panel.');

  // Okta JWKS can contain mixed key types (signing + encryption). Some encryption keys
  // (e.g. ECDH-ES, RSA-OAEP) use algorithms that jose does not support for JWT verification.
  // Restrict to RS256/RS384/RS512/PS256/PS384/PS512/ES256/ES384/ES512 — the standard signing algs.
  // Fall back to no restriction if all restricted algorithms fail.
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer:     cfg.issuer,
      audience:   cfg.clientId,
      algorithms: ['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512'],
    });
    return { source: 'okta' as const, payload };
  } catch (err: any) {
    // ERR_JOSE_NOT_SUPPORTED means the JWKS has unsupported keys — treat as invalid token
    if (err.code === 'ERR_JOSE_NOT_SUPPORTED') {
      throw new Error('Okta JWT uses an unsupported algorithm. Ensure your Okta authorization server uses RS256.');
    }
    throw err;
  }
}

// Read manager claim keys from OIDC config file (admin-configured) or env fallbacks
function getManagerClaimKeys() {
  try {
    if (existsSync(OIDC_CONFIG_PATH)) {
      const cfg = JSON.parse(readFileSync(OIDC_CONFIG_PATH, 'utf8'));
      return {
        managerClaim:   (cfg.managerClaim   as string) || env.oktaManagerClaim   || 'manager',
        managerIdClaim: (cfg.managerIdClaim as string) || env.oktaManagerIdClaim || 'managerId',
      };
    }
  } catch {}
  return {
    managerClaim:   env.oktaManagerClaim   || 'manager',
    managerIdClaim: env.oktaManagerIdClaim || 'managerId',
  };
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function upsertUserFromOkta(claims: Record<string, unknown>) {
  const email   = String(claims.email ?? '').toLowerCase();
  const name    = String(claims.name ?? claims.preferred_username ?? email ?? 'Commander');
  const oktaSub = String(claims.sub ?? '');
  const groups  = Array.isArray(claims.groups) ? (claims.groups as string[]) : [];

  const { managerClaim, managerIdClaim } = getManagerClaimKeys();

  // Try to extract manager email from configured claim keys and common fallbacks
  // Okta may use different attribute names depending on how the claim is mapped in the authorization server
  const managerRaw =
    claims[managerClaim]     ??
    claims['manager']        ??
    claims['managerEmail']   ??
    claims['manager_email']  ??
    claims['supervisorEmail']??
    claims['supervisor']     ??
    claims['Manager']        ??
    null;
  const managerIdRaw =
    claims[managerIdClaim]   ??
    claims['managerId']      ??
    claims['manager_id']     ??
    claims['managerLogin']   ??
    claims['manager_login']  ??
    null;
  const managerNameRaw = claims['managerName'] ?? claims['manager_name'] ?? claims['supervisorName'] ?? null;
  console.log('[auth] manager claim extraction — raw:', { managerRaw, managerIdRaw, managerNameRaw });

  let managerEmail = '';
  let managerName  = '';

  if (typeof managerRaw === 'string' && managerRaw.trim()) {
    const raw = managerRaw.trim();
    if (looksLikeEmail(raw)) {
      // Claim contains manager's email directly
      managerEmail = raw.toLowerCase();
      managerName  = typeof managerNameRaw === 'string' ? managerNameRaw.trim() : managerEmail;
    } else {
      // Claim contains manager's display name — look for email in the ID claim
      managerName = raw;
      if (typeof managerIdRaw === 'string' && looksLikeEmail(managerIdRaw.trim())) {
        managerEmail = managerIdRaw.trim().toLowerCase();
      }
    }
  } else if (typeof managerIdRaw === 'string' && looksLikeEmail(managerIdRaw.trim())) {
    managerEmail = managerIdRaw.trim().toLowerCase();
    managerName  = managerEmail;
  }

  const role: Role =
    groups.some((g) => /admin/i.test(g))   ? 'ADMIN'
    : groups.some((g) => /manager/i.test(g)) ? 'MANAGER'
    : 'USER';

  const manager = managerEmail
    ? await prisma.user.upsert({
        where:  { email: managerEmail },
        update: { ...(managerName ? { name: managerName } : {}) },
        create: { email: managerEmail, name: managerName || managerEmail, role: 'MANAGER' },
      })
    : null;

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      oktaSub,
      managerId: manager?.id ?? undefined,
      // Do not demote an ADMIN; only promote.
      role: role === 'USER' ? undefined : role,
    },
    create: {
      email,
      name,
      oktaSub,
      role,
      managerId: manager?.id ?? undefined,
    },
  });

  // Keep UserManager table in sync so all-learners queries work correctly
  if (manager) {
    await (prisma.userManager as any).upsert({
      where:  { userId_managerId: { userId: user.id, managerId: manager.id } },
      update: {},
      create: { userId: user.id, managerId: manager.id },
    });
  }

  return user;
}

async function upsertLocalAdmin(payload: { email: string; name: string; sub: string }) {
  return prisma.user.upsert({
    where: { email: payload.email },
    update: { role: 'ADMIN', name: payload.name },
    create: { email: payload.email, name: payload.name, role: 'ADMIN' },
  });
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: 'Missing bearer token' });

    const { source, payload } = await verifyToken(match[1]);

    let user;
    if (source === 'local-admin') {
      user = await upsertLocalAdmin({
        email: String(payload.email ?? 'admin@local'),
        name: String(payload.name ?? 'Administrator'),
        sub: String(payload.sub ?? 'local-admin'),
      });
    } else if (source === 'local-user') {
      user = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
      if (!user) throw new Error('Local user not found');
    } else {
      // Okta: look up by email — user was already created during the OAuth callback.
      // Using findUnique (not upsert) ensures deleted users cannot continue accessing the app.
      const email = String((payload as any).email ?? '').toLowerCase();
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error('User not found. Please log in again.');
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      managerId: user.managerId,
      source,
    };
    next();
  } catch (err) {
    console.error('[auth] verification failed:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
