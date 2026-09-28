/**
 * Generate a self-signed TLS certificate for the HCL Learning Hub dev server.
 *
 * Keystore  → certs/server.key   (private key  — keep this secret)
 * Cert      → certs/server.crt   (public cert  — share with browsers)
 * Truststore→ certs/truststore.crt (CA bundle  — same as cert for self-signed)
 *
 * To use a CA-signed certificate instead:
 *   Replace certs/server.key and certs/server.crt with your CA-issued files.
 *   The application will pick them up automatically on next start.
 *
 * Password convention (mirrors Java keystore defaults):
 *   The private key is stored unencrypted in PEM format.
 *   When converting to PKCS12/JKS for external tools, use passphrase: changeit
 */

import { fileURLToPath } from 'node:url';
import { dirname, join }  from 'node:path';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const certsDir  = join(__dirname, '..', 'certs');
const keyPath   = join(certsDir, 'server.key');
const certPath  = join(certsDir, 'server.crt');
const trustPath = join(certsDir, 'truststore.crt');

if (!existsSync(certsDir)) mkdirSync(certsDir, { recursive: true });

const pfxPath = join(certsDir, 'server.pfx');
if ((existsSync(pfxPath) || (existsSync(keyPath) && existsSync(certPath)))) {
  console.log('[certs] Existing certificates found — skipping generation.');
  process.exit(0);
}

// CERT_CN / CERT_FQDN override the detected hostname; CERT_ALT_NAMES adds extra SANs.
const osHost   = hostnameOf();
const hostname = process.env.CERT_CN || osHost.short;
const fqdn     = process.env.CERT_FQDN || osHost.fqdn || `${hostname}.prod.hclpnp.com`;

const extraNames = (process.env.CERT_ALT_NAMES || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// IP addresses must be IP: SANs, not DNS: SANs, or browsers reject them.
const extraIps = (process.env.CERT_ALT_IPS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const dnsNames = [...new Set([hostname, fqdn, 'localhost', ...extraNames])];
const ipNames  = [...new Set(['127.0.0.1', ...extraIps])];

function hostnameOf() {
  const raw = os.hostname();
  const short = raw.split('.')[0];
  return { short, fqdn: raw.includes('.') ? raw : '' };
}

console.log(`[certs] Generating self-signed certificate (CN=${hostname})…`);
console.log(`[certs] SANs: ${[...dnsNames, ...ipNames].join(', ')}`);

if (process.platform === 'win32') {
  // ── Windows: write a .ps1 file then execute it (avoids inline escaping) ─────
  const ps1Path = join(certsDir, '_gen.ps1');
  // PFX passphrase (mirrors Java keystore "changeit" convention)
  const passphrase = 'changeit';
  const ps1 = [
    `$ErrorActionPreference = 'Stop'`,
    `$certsDir = '${certsDir.replace(/'/g, "''")}'`,
    `$cert = New-SelfSignedCertificate \``,
    `    -Subject 'CN=${hostname}' \``,
    `    -DnsName ${[...dnsNames, ...ipNames].map(n => `'${n}'`).join(',')} \``,
    `    -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 \``,
    `    -CertStoreLocation 'Cert:\\CurrentUser\\My' \``,
    `    -NotAfter (Get-Date).AddYears(2) \``,
    `    -KeyExportPolicy Exportable`,
    // Export PFX (key + cert, password-protected) — loaded directly by Node.js/Vite
    `$pwd = ConvertTo-SecureString '${passphrase}' -Force -AsPlainText`,
    `Export-PfxCertificate -Cert $cert -FilePath "$certsDir\\server.pfx" -Password $pwd | Out-Null`,
    // Export DER cert → PEM (truststore / browser import)
    `$certB64 = [Convert]::ToBase64String($cert.RawData, [System.Base64FormattingOptions]::InsertLineBreaks)`,
    `Set-Content -Path "$certsDir\\truststore.crt" -Value "-----BEGIN CERTIFICATE-----\`n$certB64\`n-----END CERTIFICATE-----"`,
    `Copy-Item "$certsDir\\truststore.crt" "$certsDir\\server.crt" -Force`,
    `Write-Host '[certs] Done.'`,
  ].join('\r\n');
  // Write passphrase file so vite.config.js can read it
  writeFileSync(join(certsDir, 'passphrase.txt'), passphrase, 'utf8');

  writeFileSync(ps1Path, ps1, 'utf8');
  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1Path}"`, { stdio: 'inherit' });
  } finally {
    try { rmSync(ps1Path, { force: true }); } catch {}
  }
} else {
  // ── Linux / macOS: use OpenSSL ──────────────────────────────────────────────
  execSync(
    `openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes` +
    ` -keyout "${keyPath}" -out "${certPath}"` +
    ` -subj "/CN=${hostname}/O=HCL Software/C=IN"` +
    ` -addext "subjectAltName=${[...dnsNames.map(n => `DNS:${n}`), ...ipNames.map(i => `IP:${i}`)].join(',')}"`,
    { stdio: 'inherit' }
  );
  execSync(`cp "${certPath}" "${trustPath}"`);
}

console.log('[certs] Certificate created:');
console.log('  certs/server.key       ← private key (KEEP SECRET)');
console.log('  certs/server.crt       ← certificate');
console.log('  certs/truststore.crt   ← CA bundle (truststore)');
console.log('');
console.log('[certs] ⚠  Browser will show "Not Secure" warning for self-signed certs.');
console.log(`[certs]    Open https://${fqdn}:5173, click Advanced → Proceed.`);
console.log(`[certs]    Accept https://${fqdn}:4000/health in a separate tab too.`);
console.log('');
console.log('[certs] To use a CA-signed cert: replace certs/server.key + certs/server.crt');
