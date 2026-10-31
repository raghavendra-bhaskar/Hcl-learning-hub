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
  localAdminUser: process.env.LOCAL_ADMIN_USERNAME ?? 'admin@local',
  localAdminPass: process.env.LOCAL_ADMIN_PASSWORD ?? 'admin',
  localAdminSecret: required('LOCAL_ADMIN_JWT_SECRET', 'dev-only-change-me'),

  smtp: {
    enabled: bool('SMTP_ENABLED', false),
    host:    process.env.SMTP_HOST    ?? '',
    port:    Number(process.env.SMTP_PORT ?? 587),
    secure:  bool('SMTP_SECURE', false),
    user:    process.env.SMTP_USER    ?? '',
    pass:    process.env.SMTP_PASS    ?? '',
    from:    process.env.SMTP_FROM    ?? 'noreply@hcllearninghub.local',
    appUrl:  process.env.APP_URL      ?? 'http://localhost:5173',
  },
};

export const oktaEnabled = Boolean(env.oktaIssuer && env.oktaClientId);
