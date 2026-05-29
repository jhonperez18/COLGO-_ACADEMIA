/**
 * 1) Lee credenciales Aiven desde .env.production
 * 2) Prueba conexión MySQL
 * 3) Muestra qué pegar en Render → Environment
 *
 * Antes: copia .env.production.example → .env.production y completa DB_* desde Aiven.
 */
import { existsSync, readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'

const envPath = '.env.production'
if (!existsSync(envPath)) {
  console.error(`\n❌ Falta ${envPath}`)
  console.error('   Copia:  copy .env.production.example .env.production')
  console.error('   Luego completa DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME desde Aiven.\n')
  process.exit(1)
}

const env = dotenv.parse(readFileSync(envPath))
const host = String(env.DB_HOST || '').trim()
const port = Number(env.DB_PORT || 3306)
const user = String(env.DB_USER || '').trim()
const password = String(env.DB_PASSWORD || '')
const database = String(env.DB_NAME || 'defaultdb').trim()
const sslOn = !['false', '0', 'no'].includes(String(env.DB_SSL || 'true').trim().toLowerCase())

if (!host || host === 'localhost' || host === '127.0.0.1') {
  console.error('\n❌ DB_HOST en .env.production sigue siendo localhost.')
  console.error('   En Aiven: Services → tu MySQL → Overview → Connection information')
  console.error('   Copia el Host (ej. xxx.aivencloud.com) a DB_HOST.\n')
  process.exit(1)
}

if (!user || !password) {
  console.error('\n❌ Completa DB_USER y DB_PASSWORD en .env.production\n')
  process.exit(1)
}

console.log('\n=== Probando Aiven ===')
console.log('Host:', host)
console.log('Port:', port)
console.log('User:', user)
console.log('Database:', database)
console.log('SSL:', sslOn)

let conn
try {
  conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    ssl: sslOn ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 15000,
  })
  const [rows] = await conn.query('SELECT 1 AS ok')
  const [users] = await conn.query(
    'SELECT id, email, rol, activo FROM usuarios WHERE LOWER(email) LIKE ? LIMIT 1',
    ['mario@%'],
  )
  console.log('\n✅ Conexión Aiven OK', rows[0])
  if (Array.isArray(users) && users[0]) {
    console.log('✅ Usuario MARIO en BD:', users[0].email, '| rol:', users[0].rol)
  } else {
    console.log('⚠️  No hay mario@colgo.edu — al arrancar Render creará admin (BOOTSTRAP_*)')
  }
} catch (e) {
  console.error('\n❌ No se pudo conectar a Aiven:', e.code || '', e.message || e)
  console.error('\nRevisa en Aiven:')
  console.error('  - Servicio MySQL en estado Running')
  console.error('  - Public access / trusted IP si aplica')
  console.error('  - Host, port, user, password, database name exactos\n')
  process.exit(1)
} finally {
  await conn?.end().catch(() => {})
}

const jwt = String(env.JWT_SECRET || '').trim() || 'colgo-jwt-cambiar-por-clave-larga-segura'
const cors =
  String(env.CORS_ORIGIN || '').trim() ||
  'https://project-bm9ko.vercel.app,https://colgo-academi-saas.vercel.app,http://localhost:5173'

console.log('\n=== Variables para Render (colgo-academi-saas) ===')
console.log('Dashboard: https://dashboard.render.com → tu servicio → Environment\n')
const renderVars = {
  DB_HOST: host,
  DB_PORT: String(port),
  DB_USER: user,
  DB_PASSWORD: password,
  DB_NAME: database,
  DB_SSL: 'true',
  JWT_SECRET: jwt,
  JWT_EXPIRES_IN: String(env.JWT_EXPIRES_IN || '7d').trim(),
  BOOTSTRAP_ADMIN_EMAIL: String(env.BOOTSTRAP_ADMIN_EMAIL || 'mario@colgo.edu').trim(),
  BOOTSTRAP_ADMIN_PASSWORD: String(env.BOOTSTRAP_ADMIN_PASSWORD || '123').trim(),
  CORS_ORIGIN: cors,
  CORS_ALLOW_VERCEL: 'true',
  NODE_ENV: 'production',
}
for (const [k, v] of Object.entries(renderVars)) {
  const show = k === 'DB_PASSWORD' || k === 'JWT_SECRET' ? '********' : v
  console.log(`${k}=${show}`)
}

console.log('\n1. Pega cada variable en Render y guarda.')
console.log('2. Espera el redeploy (~2 min).')
console.log('3. Ejecuta: npm run check:production')
console.log('4. Login: https://project-bm9ko.vercel.app/login?force_login=1  (MARIO / 123)\n')
