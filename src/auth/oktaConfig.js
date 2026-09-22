// Feature-flagged Okta wrapper. Reads Vite env vars; if issuer + clientId are
// missing the whole module reports `enabled: false` and the app uses local auth.
import { OktaAuth } from '@okta/okta-auth-js';

const issuer   = import.meta.env.VITE_OKTA_ISSUER?.trim();
const clientId = import.meta.env.VITE_OKTA_CLIENT_ID?.trim();
const redirectUri = import.meta.env.VITE_OKTA_REDIRECT_URI?.trim()
  || (typeof window !== 'undefined' ? `${window.location.origin}/login/callback` : '');
const postLogoutRedirectUri = import.meta.env.VITE_OKTA_POST_LOGOUT_REDIRECT_URI?.trim()
  || (typeof window !== 'undefined' ? `${window.location.origin}/login` : '');
const scopesRaw = import.meta.env.VITE_OKTA_SCOPES?.trim() || 'openid profile email';
const managerClaim = import.meta.env.VITE_OKTA_MANAGER_CLAIM?.trim() || 'manager';
const managerIdClaim = import.meta.env.VITE_OKTA_MANAGER_ID_CLAIM?.trim() || 'managerId';

export const oktaEnabled = Boolean(issuer && clientId);

let cached = null;
export function getOktaAuth() {
  if (!oktaEnabled) return null;
  if (cached) return cached;
  cached = new OktaAuth({
    issuer,
    clientId,
    redirectUri,
    postLogoutRedirectUri,
    scopes: scopesRaw.split(/\s+/).filter(Boolean),
    pkce: true,
    responseMode: 'query',
    tokenManager: { storage: 'localStorage' },
  });
  return cached;
}

// Convert an Okta ID token into the same auth shape the local flow produces.
export function claimsToAuthRecord(claims, dbRole) {
  if (!claims) return null;
  const manager = claims[managerClaim] || claims.manager || claims.managerEmail || '';
  const managerId = claims[managerIdClaim] || claims.managerId || claims.manager_id || claims.managerEmployeeId || '';
  const groups = Array.isArray(claims.groups) ? claims.groups : [];
  // Derive a preliminary role from Okta groups; will be overridden by DB role if available.
  const claimRole = groups.some((g) => /admin/i.test(g))
    ? 'ADMIN'
    : groups.some((g) => /manager/i.test(g))
    ? 'MANAGER'
    : 'USER';
  return {
    isLoggedIn: true,
    source: 'okta',
    name: claims.name || claims.preferred_username || claims.email || 'Commander',
    email: claims.email || '',
    role: dbRole || claimRole,
    managerEmail: typeof manager === 'string' ? manager : (manager?.mail || manager?.email || ''),
    managerId: typeof managerId === 'string' ? managerId : (managerId?.id || managerId?.employeeId || ''),
    sub: claims.sub || '',
    groups,
    loginAt: Date.now(),
  };
}
