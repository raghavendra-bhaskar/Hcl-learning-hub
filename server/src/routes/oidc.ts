import { Router } from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../../data/oidc-config.json');

export const oidcRouter = Router();

function readConfig(): Record<string, unknown> {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch {}
  return {};
}

oidcRouter.get('/', (_req, res) => {
  const cfg = readConfig();
  res.json({
    enabled:               Boolean(cfg.enabled),
    realmName:             cfg.realmName             || 'HCL Learning Hub',
    issuer:                cfg.issuer                || '',
    clientId:              cfg.clientId              || '',
    scopes:                cfg.scopes                || 'openid profile email',
    authorizationEndpoint: cfg.authorizationEndpoint  || '',
    endSessionEndpoint:    cfg.endSessionEndpoint     || '',
    confidential:          Boolean(cfg.clientSecret),
  });
});
