/**
 * Despliegue automático de producción:
 * - Lee Aiven (API o DATABASE_URL / DB_* en .env o .env.production)
 * - Sube variables a Vercel (proyecto project-bm9ko)
 * - Opcional: Render si existe RENDER_API_KEY
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import dotenv from 'dotenv'

const PRODUCTION_ORIGIN = 'https://project-bm9ko.vercel.app'
const VERCEL_PROJECT = 'project-bm9ko'

function loadEnv() {
  const merged = {}
  for (const f of ['.env', '.env.production', '.env.local']) {
    if (existsSync(f)) Object.assign(merged, dotenv.parse(readFileSync(f)))
  }
  return merged
}

function parseDatabaseUrl(url) {
  try {
    const u = new URL(url.replace(/^mysql:\/\//, 'http://'))
    return {
      DB_HOST: u.hostname,
      DB_PORT: u.port || '3306',
      DB_USER: decodeURIComponent(u.username),
      DB_PASSWORD: decodeURIComponent(u.password),
      DB_NAME: u.pathname.replace(/^\//, '') || 'defaultdb',
      DB_SSL: 'true',
    }
  } catch {
    return null
  }
}

function parseServiceUriParams(raw) {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return typeof raw === 'object' ? raw : null
}

function isRedacted(value) {
  const v = String(value || '').trim()
  return !v || v === '<redacted>' || /^REDACTED$/i.test(v)
}

async function waitForAivenService(project, service, headers, maxWaitMs = 300000) {
  const started = Date.now()
  while (Date.now() - started < maxWaitMs) {
    const detail = await fetch(
      `https://api.aiven.io/v1/project/${encodeURIComponent(project)}/service/${encodeURIComponent(service)}`,
      { headers },
    )
    const info = await detail.json()
    const svc = info?.service
    const state = String(svc?.state || '').toUpperCase()
    if (state === 'RUNNING') return svc
    if (['POWEROFF', 'OFF'].includes(state)) {
      await fetch(
        `https://api.aiven.io/v1/project/${encodeURIComponent(project)}/service/${encodeURIComponent(service)}`,
        { method: 'PUT', headers, body: JSON.stringify({ powered: true }) },
      )
    }
    await new Promise((r) => setTimeout(r, 10000))
  }
  throw new Error(`Servicio ${service} no llegó a RUNNING a tiempo`)
}

async function ensureAivenMysqlPassword(project, service, user, headers) {
  const { randomBytes } = await import('node:crypto')
  const newPassword = `Colgo_${randomBytes(12).toString('base64url')}`
  const reset = await fetch(
    `https://api.aiven.io/v1/project/${encodeURIComponent(project)}/service/${encodeURIComponent(service)}/user/${encodeURIComponent(user)}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ operation: 'reset-credentials', new_password: newPassword }),
    },
  )
  if (!reset.ok) {
    const err = await reset.text()
    throw new Error(`No se pudo configurar contraseña MySQL en Aiven: ${err.slice(0, 200)}`)
  }
  return newPassword
}

async function fetchAivenFromApi(token, projectName, serviceName) {
  const headers = { Authorization: `aivenv1 ${token}`, 'Content-Type': 'application/json' }
  let project = projectName
  if (!project) {
    const pr = await fetch('https://api.aiven.io/v1/project', { headers })
    const pdata = await pr.json()
    const list = pdata?.projects || []
    if (!list.length) throw new Error('No hay proyectos en Aiven para este token')
    project =
      list.find((p) => /colgo/i.test(p.project_name || ''))?.project_name || list[0].project_name
  }

  const sr = await fetch(`https://api.aiven.io/v1/project/${encodeURIComponent(project)}/service`, {
    headers,
  })
  const sdata = await sr.json()
  const services = sdata?.services || []
  let service = serviceName
  if (!service) {
    const mysqlSvc = services.find((s) => String(s.service_type || '').includes('mysql'))
    if (!mysqlSvc) throw new Error(`No hay servicio MySQL en proyecto ${project}`)
    service = mysqlSvc.service_name
  }

  console.log(`  Aiven: ${project} / ${service}`)
  const svc = await waitForAivenService(project, service, headers)
  const mysqlInfo =
    svc?.connection_info?.mysql?.[0] || svc?.connection_info?.mysql || null
  const uriParams = parseServiceUriParams(svc?.service_uri_params)
  const host = mysqlInfo?.host || uriParams?.host
  const port = mysqlInfo?.port || uriParams?.port || 3306
  const user = mysqlInfo?.user || uriParams?.user || 'avnadmin'
  const database = mysqlInfo?.database || uriParams?.dbname || 'defaultdb'
  let password = mysqlInfo?.password || uriParams?.password

  if (!host) throw new Error('Aiven no devolvió host MySQL (servicio apagado o sin URI)')

  if (isRedacted(password)) {
    console.log('  Contraseña no visible en API — configurando credencial de servicio…')
    password = await ensureAivenMysqlPassword(project, service, user, headers)
  }

  return {
    DB_HOST: host,
    DB_PORT: String(port),
    DB_USER: user,
    DB_PASSWORD: password,
    DB_NAME: database,
    DB_SSL: 'true',
    AIVEN_PROJECT: project,
    AIVEN_SERVICE: service,
  }
}

function pickDb(env) {
  const url = String(env.DATABASE_URL || env.MYSQL_URL || '').trim()
  if (url) {
    const parsed = parseDatabaseUrl(url)
    if (parsed) return parsed
  }
  const host = String(env.DB_HOST || '').trim()
  if (!host || host === 'localhost' || host === '127.0.0.1') return null
  return {
    DB_HOST: host,
    DB_PORT: String(env.DB_PORT || '3306').trim(),
    DB_USER: String(env.DB_USER || '').trim(),
    DB_PASSWORD: String(env.DB_PASSWORD || ''),
    DB_NAME: String(env.DB_NAME || 'defaultdb').trim(),
    DB_SSL: String(env.DB_SSL || 'true').trim(),
  }
}

async function resolveDbConfig(env) {
  let db = pickDb(env)
  if (db) return db

  const token = String(env.AIVEN_TOKEN || '').trim()
  if (!token) {
    console.error('\n❌ Falta conexión a Aiven en el proyecto.')
    console.error('   Opción A — en .env pega la URI de Aiven (Connection information):')
    console.error('   DATABASE_URL=mysql://usuario:pass@host:puerto/defaultdb?ssl-mode=REQUIRED')
    console.error('   Opción B — token API (console.aiven.io → User profile → API tokens):')
    console.error('   AIVEN_TOKEN=tu_token')
    console.error('   AIVEN_PROJECT=nombre_proyecto   (opcional)')
    console.error('   AIVEN_SERVICE=nombre_servicio   (opcional)\n')
    process.exit(1)
  }

  console.log('Obteniendo credenciales desde API de Aiven…')
  db = await fetchAivenFromApi(
    token,
    String(env.AIVEN_PROJECT || '').trim() || undefined,
    String(env.AIVEN_SERVICE || '').trim() || undefined,
  )
  return db
}

function buildProductionEnv(env, db) {
  return {
    NODE_ENV: 'production',
    VITE_API_URL: '/api',
    FRONTEND_URL: PRODUCTION_ORIGIN,
    CORS_ORIGIN: `${PRODUCTION_ORIGIN},https://colgo-academi-saas.vercel.app,http://localhost:5173,http://localhost:5174`,
    CORS_ALLOW_VERCEL: 'true',
    JWT_SECRET: String(env.JWT_SECRET || 'colgo-prod-jwt-2026-stable-do-not-rotate').trim(),
    JWT_EXPIRES_IN: String(env.JWT_EXPIRES_IN || '7d').trim(),
    BOOTSTRAP_ADMIN_EMAIL: String(env.BOOTSTRAP_ADMIN_EMAIL || 'mario@colgo.edu').trim(),
    BOOTSTRAP_ADMIN_PASSWORD: String(env.BOOTSTRAP_ADMIN_PASSWORD || '123').trim(),
    DB_AUTO_MIGRATE: 'true',
    ...db,
  }
}

function pushVercelEnv(name, value) {
  if (value == null || String(value).trim() === '') return
  console.log(`  Vercel → ${name}`)
  execSync(`npx --yes vercel@latest env add ${name} production --force`, {
    input: String(value),
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true,
    cwd: process.cwd(),
  })
}

async function main() {
  const env = loadEnv()
  const db = await resolveDbConfig(env)
  const values = buildProductionEnv(env, db)

  writeFileSync('.env.production', Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n'))
  console.log('\n✅ .env.production generado')

  console.log(`\nSubiendo variables a Vercel (${VERCEL_PROJECT})…`)
  execSync(`npx --yes vercel@latest link --yes --project ${VERCEL_PROJECT}`, {
    stdio: 'inherit',
    shell: true,
  })
  for (const [key, val] of Object.entries(values)) {
    pushVercelEnv(key, val)
  }

  const renderKey = String(env.RENDER_API_KEY || process.env.RENDER_API_KEY || '').trim()
  const renderServiceId = String(env.RENDER_SERVICE_ID || '').trim()
  if (renderKey && renderServiceId) {
    console.log('\nActualizando Render…')
    for (const [key, val] of Object.entries(values)) {
      if (key.startsWith('VITE_')) continue
      await fetch(`https://api.render.com/v1/services/${renderServiceId}/env-vars`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${renderKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ key, value: String(val) }]),
      })
    }
    console.log('✅ Render actualizado (redeploy automático en ~2 min)')
  } else {
    console.log('\n(Render: sin RENDER_API_KEY — usa solo API en Vercel /api)')
  }

  console.log('\nDesplegando frontend…')
  execSync('npx --yes vercel@latest deploy --prod --yes', { stdio: 'inherit', shell: true })

  console.log('\n✅ Listo. Prueba: npm run check:production')
  console.log(`   Login: ${PRODUCTION_ORIGIN}/login?force_login=1  (MARIO / 123)\n`)
}

main().catch((e) => {
  console.error('\n❌', e.message || e)
  process.exit(1)
})
