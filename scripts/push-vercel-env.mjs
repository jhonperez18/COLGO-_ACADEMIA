/**
 * Sincroniza variables de producción en Vercel (proyecto colgo-academi-saas).
 * Usa .env.production si existe; si no, aplica valores mínimos (API en Render + URL Vercel).
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import dotenv from 'dotenv'

const PRODUCTION_ORIGIN = 'https://colgo-academi-saas.vercel.app'
const RENDER_API = 'https://colgo-academi-saas.onrender.com/api'

const fromFile = existsSync('.env.production')
  ? dotenv.parse(readFileSync('.env.production'))
  : {}

const values = {
  NODE_ENV: 'production',
  VITE_API_URL: fromFile.VITE_API_URL?.trim() || RENDER_API,
  FRONTEND_URL: fromFile.FRONTEND_URL?.trim() || PRODUCTION_ORIGIN,
  CORS_ORIGIN:
    fromFile.CORS_ORIGIN?.trim() ||
    `${PRODUCTION_ORIGIN},http://localhost:5173,http://localhost:5174`,
  CORS_ALLOW_VERCEL: fromFile.CORS_ALLOW_VERCEL?.trim() || 'true',
  JWT_SECRET: fromFile.JWT_SECRET?.trim() || 'colgo-prod-jwt-change-me-in-vercel-dashboard',
  JWT_EXPIRES_IN: fromFile.JWT_EXPIRES_IN?.trim() || '7d',
  BOOTSTRAP_ADMIN_EMAIL: fromFile.BOOTSTRAP_ADMIN_EMAIL?.trim() || 'mario@colgo.edu',
  BOOTSTRAP_ADMIN_PASSWORD: fromFile.BOOTSTRAP_ADMIN_PASSWORD?.trim() || '123',
  DB_AUTO_MIGRATE: fromFile.DB_AUTO_MIGRATE?.trim() || 'true',
  ...pickDb(fromFile),
}

function pickDb(env) {
  const host = String(env.DB_HOST || '').trim()
  if (!host || host === 'localhost' || host === '127.0.0.1') return {}
  return {
    DB_HOST: host,
    DB_PORT: String(env.DB_PORT || '3306').trim(),
    DB_USER: String(env.DB_USER || '').trim(),
    DB_PASSWORD: String(env.DB_PASSWORD || '').trim(),
    DB_NAME: String(env.DB_NAME || 'defaultdb').trim(),
    DB_SSL: String(env.DB_SSL || 'true').trim(),
  }
}

function pushEnv(name, value) {
  if (value == null || String(value).trim() === '') return
  console.log(`→ ${name}`)
  execSync(`npx --yes vercel@latest env add ${name} production --force`, {
    input: String(value),
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true,
  })
}

console.log('Proyecto Vercel: colgo-academi-saas')
console.log('URL producción:', PRODUCTION_ORIGIN)
console.log('API (front):', values.VITE_API_URL)
console.log('')

for (const [key, val] of Object.entries(values)) {
  pushEnv(key, val)
}

console.log('\nListo. Ejecuta: npm run vercel:prod')
