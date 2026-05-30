import { query } from '../db.js'

export const ESTADOS_ACCESO = ['activo', 'suspendido', 'cancelado', 'finalizado']

export function normalizeEstadoAcceso(value, fallback = 'activo') {
  const v = String(value ?? '')
    .trim()
    .toLowerCase()
  return ESTADOS_ACCESO.includes(v) ? v : fallback
}

export function activoFromEstadoAcceso(estado) {
  return normalizeEstadoAcceso(estado) === 'activo'
}

export function puedeAccederPanel(estado) {
  return activoFromEstadoAcceso(estado)
}

/** Deriva estado desde fila BD (compatibilidad con columna legacy `activo`). */
export function resolveEstadoAccesoFromRow(row) {
  if (row?.estado_acceso != null && String(row.estado_acceso).trim() !== '') {
    return normalizeEstadoAcceso(row.estado_acceso)
  }
  if (row?.activo === false || row?.activo === 0) return 'suspendido'
  return 'activo'
}

export function mensajeAccesoDenegado(estado) {
  const e = normalizeEstadoAcceso(estado, 'suspendido')
  if (e === 'suspendido') {
    return 'Tu cuenta está suspendida. Contacta al administrador para más información.'
  }
  if (e === 'cancelado') {
    return 'Tu cuenta fue cancelada. Ya no tienes acceso al sistema.'
  }
  if (e === 'finalizado') {
    return 'Tu proceso ha finalizado. Ya no tienes acceso al panel.'
  }
  return 'No tienes acceso al sistema.'
}

export const ETIQUETAS_ESTADO_ACCESO = {
  activo: 'Activo',
  suspendido: 'Suspendido',
  cancelado: 'Cancelado',
  finalizado: 'Finalizado',
}

async function columnExists(tableName, columnName) {
  const rows = await query(
    `SELECT 1 AS ok FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND LOWER(COLUMN_NAME) = LOWER(?)
     LIMIT 1`,
    [tableName, columnName],
  )
  return Array.isArray(rows) && rows.length > 0
}

let estadoAccesoColumnReady = false

export async function ensureEstadoAccesoColumn() {
  if (estadoAccesoColumnReady) return
  const exists = await columnExists('usuarios', 'estado_acceso')
  if (!exists) {
    await query(`ALTER TABLE usuarios ADD COLUMN estado_acceso VARCHAR(20) NOT NULL DEFAULT 'activo'`)
  }
  try {
    await query(
      `UPDATE usuarios SET estado_acceso = 'suspendido'
       WHERE activo = FALSE AND estado_acceso = 'activo'`,
    )
    await query(
      `UPDATE usuarios SET activo = TRUE WHERE estado_acceso = 'activo' AND activo = FALSE`,
    )
    await query(
      `UPDATE usuarios SET activo = FALSE WHERE estado_acceso <> 'activo' AND activo = TRUE`,
    )
  } catch (e) {
    console.warn('[COLGO] backfill estado_acceso:', e?.code || e?.message || e)
  }
  estadoAccesoColumnReady = true
}

export async function fetchEstadoAccesoUsuario(usuarioId) {
  await ensureEstadoAccesoColumn()
  const rows = await query('SELECT activo, estado_acceso FROM usuarios WHERE id = ? LIMIT 1', [usuarioId])
  if (!Array.isArray(rows) || !rows[0]) return null
  return resolveEstadoAccesoFromRow(rows[0])
}
