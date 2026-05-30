/**
 * Limpia usuarios finalizados/de prueba, perfiles huérfanos e historial obsoleto.
 * Uso: node scripts/limpiar-usuarios-historial.mjs
 */
import { config } from 'dotenv'
config({ path: '.env.production' })
config({ path: '.env' })

const { ensureEstadoAccesoColumn } = await import('../backend/utils/estadoAcceso.js')
const { limpiarUsuariosEHistorial } = await import('../backend/utils/purgeUsuario.js')

console.log('BD:', process.env.DB_HOST)
await ensureEstadoAccesoColumn()

const resumen = await limpiarUsuariosEHistorial({
  purgeFinalizados: true,
  purgeTestAuto: true,
  purgeHistorialHuerfano: true,
  purgeLoginsAntiguos: true,
  diasLogins: 14,
})

console.log('\n=== LIMPIEZA COMPLETADA ===')
console.log(JSON.stringify(resumen, null, 2))

const { query } = await import('../backend/db.js')
const restantes = await query('SELECT id, email, rol, estado_acceso FROM usuarios ORDER BY id')
console.log('\n=== USUARIOS RESTANTES ===')
console.table(restantes)

process.exit(0)
