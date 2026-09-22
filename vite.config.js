import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadCerts() {
  const pfxPath  = join(__dirname, 'certs', 'server.pfx')
  const passPath = join(__dirname, 'certs', 'passphrase.txt')
  const keyPath  = join(__dirname, 'certs', 'server.key')
  const certPath = join(__dirname, 'certs', 'server.crt')

  if (existsSync(pfxPath)) {
    const passphrase = existsSync(passPath) ? readFileSync(passPath, 'utf8').trim() : 'changeit'
    return { pfx: readFileSync(pfxPath), passphrase }
  }
  if (existsSync(keyPath) && existsSync(certPath)) {
    return { key: readFileSync(keyPath), cert: readFileSync(certPath) }
  }
  return null
}

const certs = loadCerts()

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    https: certs ?? undefined,
    watch: {
      ignored: ['**/*.mp4', '**/*.mov', '**/*.avi', '**/*.mkv', '**/*.zip', '**/*.tar', '**/*.gz'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
      },
    },
  },
})
