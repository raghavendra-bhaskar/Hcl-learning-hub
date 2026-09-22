import 'node:process';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function bool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendOrigin: required('FRONTEND_ORIGIN', 'http://localhost:5173'),

  oktaIssuer: process.env.OKTA_ISSUER?.trim() || '',
  oktaAudience: process.env.OKTA_AUDIENCE?.trim() || 'api://default',
  oktaClientId: process.env.OKTA_CLIENT_ID?.trim() || '',
  oktaManagerClaim: process.env.OKTA_MANAGER_CLAIM?.trim() || 'manager',
  oktaManagerIdClaim: process.env.OKTA_MANAGER_ID_CLAIM?.trim() || 'managerId',

  enableLocalAdmin: bool('ENABLE_LOCAL_ADMIN', true),
  localAdminUser: process.env.LOCAL_ADMIN_USERNAME ?? 'admin',
  localAdminPass: process.env.LOCAL_ADMIN_PASSWORD ?? 'admin',
  localAdminSecret: required('LOCAL_ADMIN_JWT_SECRET', 'dev-only-change-me'),
};

export const oktaEnabled = Boolean(env.oktaIssuer && env.oktaClientId);
