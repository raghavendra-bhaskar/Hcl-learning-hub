import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { signLocalUserToken, upsertUserFromOkta } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OIDC_CONFIG_PATH = join(__dirname, '../../data/oidc-config.json');

function readOidcConfig() {
  try {
    if (existsSync(OIDC_CONFIG_PATH)) return JSON.parse(readFileSync(OIDC_CONFIG_PATH, 'utf8'));
  } catch {}
  return null;
}

export const authRouter = Router();

// ── Okta server-side token exchange (confidential client — client secret stays on server) ──

authRouter.post('/okta/callback', async (req, res) => {
  try {
    const { code, redirectUri } = req.body as { code?: string; redirectUri?: string };
    if (!code || !redirectUri) return res.status(400).json({ error: 'Missing code or redirectUri' });

    const cfg = readOidcConfig();
    if (!cfg?.enabled || !cfg?.clientId || !cfg?.tokenEndpoint || !cfg?.jwksUri) {
      return res.status(503).json({ error: 'SSO not configured on server' });
    }

    // Exchange auth code at Okta token endpoint (server-side — secret never leaves server)
    const body = new URLSearchParams({
      grant_type:   'authorization_code',
      client_id:    cfg.clientId as string,
      code,
      redirect_uri: redirectUri,
    });
    if (cfg.clientSecret) body.set('client_secret', cfg.clientSecret as string);

    const tokenRes = await fetch(cfg.tokenEndpoint as string, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[auth] Okta token exchange failed:', errText);
      return res.status(401).json({ error: 'Okta rejected the code exchange', detail: errText });
    }

    const oktaTokens = await tokenRes.json() as Record<string, unknown>;
    const rawIdToken   = oktaTokens.id_token    as string | undefined;
    const accessToken  = oktaTokens.access_token as string | undefined;
    if (!rawIdToken) return res.status(401).json({ error: 'No ID token returned by Okta' });

    // Verify ID token signature and issuer
    const jwks = createRemoteJWKSet(new URL(cfg.jwksUri as string));
    const { payload } = await jwtVerify(rawIdToken, jwks, { issuer: cfg.issuer as string });

    // Okta puts custom profile attributes (managerId, manager, department, etc.) ONLY in the
    // userinfo endpoint — NOT in the ID token. Fetch userinfo and merge so upsertUserFromOkta
    // can read manager claims correctly.
    // If userinfoEndpoint is not explicitly configured, auto-derive it from the issuer URL.
    const userinfoEndpoint = (cfg.userinfoEndpoint as string | undefined)
      || (cfg.issuer ? `${String(cfg.issuer).replace(/\/$/, '')}/v1/userinfo` : null);

    let mergedClaims: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
    if (accessToken && userinfoEndpoint) {
      try {
        const uiRes = await fetch(userinfoEndpoint, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (uiRes.ok) {
          const userinfo = await uiRes.json() as Record<string, unknown>;
          // userinfo wins for custom claims; ID token wins for standard JWT fields
          mergedClaims = { ...mergedClaims, ...userinfo };
          console.log('[auth] userinfo claims for', userinfo['email'], ':', JSON.stringify(userinfo, null, 2));
          console.log('[auth] manager =', userinfo['manager'], '| managerId =', userinfo['managerId'],
            '| managerEmail =', userinfo['managerEmail'], '| manager_email =', userinfo['manager_email']);
        } else {
          const errText = await uiRes.text();
          console.warn('[auth] userinfo fetch failed:', uiRes.status, errText);
        }
      } catch (uiErr) {
        console.warn('[auth] userinfo fetch error (non-fatal):', uiErr);
      }
    } else if (!accessToken) {
      console.warn('[auth] no access_token returned by Okta — userinfo skipped (manager claims unavailable)');
    } else {
      console.warn('[auth] userinfoEndpoint not configured and could not be derived from issuer');
    }

    // Fallback: if manager not yet found via userinfo claims, try Okta Management API
    const hasManagerClaim = !!(mergedClaims['manager'] || mergedClaims['managerEmail'] ||
      mergedClaims['manager_email'] || mergedClaims['managerId'] || mergedClaims['manager_id']);
    if (!hasManagerClaim && cfg.oktaApiToken && mergedClaims.sub) {
      const orgUrl = String(cfg.issuer || '').replace(/\/oauth2.*$/, '').replace(/\/$/, '');
      if (orgUrl) {
        try {
          const mgrRes = await fetch(`${orgUrl}/api/v1/users/${mergedClaims.sub}/manager`, {
            headers: { Authorization: `SSWS ${cfg.oktaApiToken}`, Accept: 'application/json' },
          });
          if (mgrRes.ok) {
            const mgrData = await mgrRes.json() as Record<string, any>;
            const mgrEmail = (mgrData.profile?.email || mgrData.profile?.login || '').toLowerCase();
            if (mgrEmail) {
              mergedClaims['manager'] = mgrEmail;
              console.log('[auth] manager from Okta Management API:', mgrEmail);
            } else {
              console.log('[auth] Okta Management API: manager found but no email in profile');
            }
          } else if (mgrRes.status === 404) {
            console.log('[auth] Okta Management API: no manager assigned for', mergedClaims.email);
          } else {
            console.warn('[auth] Okta Management API error:', mgrRes.status);
          }
        } catch (mgrErr) {
          console.warn('[auth] Okta Management API call failed (non-fatal):', mgrErr);
        }
      }
    }

    // Upsert user with manager claim extraction, group-based role assignment, and UserManager sync
    const user = await upsertUserFromOkta(mergedClaims);

    // Issue our own short-lived JWT (same format as local login)
    const token = await signLocalUserToken({
      sub:   user.id,
      email: user.email,
      name:  user.name,
      role:  user.role,
    });

    res.json({
      token,
      tokenType: 'Bearer',
      expiresIn:   12 * 60 * 60,
      user:        { name: user.name, email: user.email, role: user.role, hasAvatar: (user as any).hasAvatar ?? false },
      claims:      mergedClaims,
      oktaIdToken: rawIdToken,
    });
  } catch (err) {
    console.error('[auth] Okta callback error:', err);
    res.status(500).json({ error: 'SSO authentication failed — check server logs' });
  }
});

// ── Local user login (email + password — covers both regular users and ADMIN role) ──

const localLoginSchema = z.object({
  email:    z.string().min(1),
  password: z.string().min(1),
});

authRouter.post('/local/login', async (req, res) => {
  try {
    const parsed = localLoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || !user.isLocalUser || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = await signLocalUserToken({
      sub:   user.id,
      email: user.email,
      name:  user.name,
      role:  user.role,
    });

    res.json({
      token,
      tokenType: 'Bearer',
      expiresIn: 12 * 60 * 60,
      user: { name: user.name, email: user.email, role: user.role, hasAvatar: (user as any).hasAvatar ?? false },
    });
  } catch (err) {
    console.error('[auth] local login error:', err);
    res.status(500).json({ error: 'Login failed — check server logs' });
  }
});
