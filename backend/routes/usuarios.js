import express from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { ensureSchemaRuntime } from '../schemaRuntime.js'
import { sendAdminPasswordResetEmail, sendColgoUsuarioInvitacion } from '../utils/emailService.js'
import { generateSecurePassword } from '../utils/passwordGenerator.js'

const router = express.Router()

const ROLES = ['admin', 'estudiante', 'docente', 'staff']
let supportTablesReady = false

function resolveFrontendBase(req) {
  const envBase = String(process.env.FRONTEND_URL || '').trim().replace(/\/$/, '')
  const origin = String(req?.get?.('origin') || req?.headers?.origin || '').trim().replace(/\/$/, '')
  if (/^https?:\/\//i.test(origin)) return origin

  const host = String(req?.get?.('x-forwarded-host') || req?.get?.('host') || '').trim()
  if (host) {
    const proto = String(req?.get?.('x-forwarded-proto') || req?.protocol || 'https')
      .trim()
      .toLowerCase()
    const safeProto = proto === 'http' ? 'http' : 'https'
    return `${safeProto}://${host}`.replace(/\/$/, '')
  }
  if (envBase) return envBase
  return 'http://localhost:5173'
}

async function ensureUltimoAccesoColumn() {
  const existsRows = await query(
    `SELECT 1 AS ok
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'usuarios'
       AND COLUMN_NAME = 'ultimo_acceso'
     LIMIT 1`,
  )
  if (!Array.isArray(existsRows) || existsRows.length === 0) {
    await query('ALTER TABLE usuarios ADD COLUMN ultimo_acceso DATETIME NULL')
  }
}

/** Añade columnas opcionales si la tabla se creó con el DDL mínimo de ensureSupportTables. */
async function ensureMysqlColumns(tableName, cols) {
  for (const [name, def] of cols) {
    try {
      const existsRows = await query(
        `SELECT 1 AS ok FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND COLUMN_NAME = ? LIMIT 1`,
        [tableName, name],
      )
      if (!Array.isArray(existsRows) || existsRows.length === 0) {
        await query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${name}\` ${def}`)
      }
    } catch (e) {
      if (e?.errno === 1060 || e?.code === 'ER_DUP_FIELDNAME') continue
      console.error(`ensureMysqlColumns ${tableName}.${name}:`, e)
      throw e
    }
  }
}

/** Perfil estudiante: contacto, ubicación, documento, fechas (panel admin). */
async function ensureEstudiantesUbicacionColumns() {
  await ensureMysqlColumns('estudiantes', [
    ['telefono', 'VARCHAR(20) NULL'],
    ['direccion', 'VARCHAR(255) NULL'],
    ['ciudad', 'VARCHAR(255) NULL'],
    ['fecha_nacimiento', 'DATE NULL'],
    ['estado_civil', 'VARCHAR(50) NULL'],
    ['pais', 'VARCHAR(120) NULL'],
    ['departamento', 'VARCHAR(120) NULL'],
    ['municipio', 'VARCHAR(180) NULL'],
    ['tipo_documento', 'VARCHAR(32) NULL'],
  ])
}

async function ensureDocentesExtraColumns() {
  await ensureMysqlColumns('docentes', [
    ['telefono', 'VARCHAR(20) NULL'],
    ['especialidad', 'VARCHAR(100) NULL'],
  ])
}

async function ensureStaffProfileTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS staff_perfiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL UNIQUE,
      nombre VARCHAR(100) NULL,
      apellido VARCHAR(100) NULL,
      documento VARCHAR(20) NULL,
      telefono VARCHAR(20) NULL,
      area VARCHAR(120) NULL,
      fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_staff_usuario (usuario_id),
      CONSTRAINT fk_staff_perfiles_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `)
}

async function ensureAdminProfileTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_perfiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL UNIQUE,
      nombre VARCHAR(100) NULL,
      apellido VARCHAR(100) NULL,
      documento VARCHAR(20) NULL,
      telefono VARCHAR(20) NULL,
      cargo VARCHAR(120) NULL,
      fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_usuario (usuario_id),
      CONSTRAINT fk_admin_perfiles_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `)
}

async function getExistingColumnNames(tableName) {
  const rows = await query(
    `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?)`,
    [tableName],
  )
  if (!Array.isArray(rows)) return new Set()
  return new Set(
    rows
      .map((r) => String(r.c ?? r.C ?? r.COLUMN_NAME ?? '').trim())
      .filter(Boolean),
  )
}

/** SELECT de perfil estudiante solo con columnas que existan (evita 500 si migración a medias). */
async function selectEstudiantePerfilCampos(usuarioId) {
  try {
    await ensureEstudiantesUbicacionColumns()
    const have = await getExistingColumnNames('estudiantes')
    const want = [
      'telefono',
      'direccion',
      'ciudad',
      'fecha_nacimiento',
      'estado_civil',
      'pais',
      'departamento',
      'municipio',
      'tipo_documento',
    ]
    const cols = want.filter((c) => have.has(c))
    if (cols.length === 0) return {}
    const quoted = cols.map((c) => `\`${c}\``).join(', ')
    const eRows = await query(`SELECT ${quoted} FROM estudiantes WHERE usuario_id = ? LIMIT 1`, [usuarioId])
    return Array.isArray(eRows) && eRows[0] ? eRows[0] : {}
  } catch (e) {
    console.error('[usuarios] selectEstudiantePerfilCampos:', e?.code || e?.errno, e?.sqlMessage || e?.message || e)
    return {}
  }
}

async function selectDocentePerfilCampos(usuarioId) {
  try {
    await ensureDocentesExtraColumns()
    const have = await getExistingColumnNames('docentes')
    const want = ['telefono', 'especialidad']
    const cols = want.filter((c) => have.has(c))
    if (cols.length === 0) return {}
    const quoted = cols.map((c) => `\`${c}\``).join(', ')
    const dRows = await query(`SELECT ${quoted} FROM docentes WHERE usuario_id = ? LIMIT 1`, [usuarioId])
    return Array.isArray(dRows) && dRows[0] ? dRows[0] : {}
  } catch (e) {
    console.error('[usuarios] selectDocentePerfilCampos:', e?.code || e?.errno, e?.sqlMessage || e?.message || e)
    return {}
  }
}

async function selectStaffPerfilCampos(usuarioId) {
  try {
    await ensureStaffProfileTable()
    const rows = await query(
      `SELECT nombre, apellido, documento, telefono, area
       FROM staff_perfiles
       WHERE usuario_id = ?
       LIMIT 1`,
      [usuarioId],
    )
    return Array.isArray(rows) && rows[0] ? rows[0] : {}
  } catch (e) {
    console.error('[usuarios] selectStaffPerfilCampos:', e?.code || e?.errno, e?.sqlMessage || e?.message || e)
    return {}
  }
}

async function selectAdminPerfilCampos(usuarioId) {
  try {
    await ensureAdminProfileTable()
    const rows = await query(
      `SELECT nombre, apellido, documento, telefono, cargo
       FROM admin_perfiles
       WHERE usuario_id = ?
       LIMIT 1`,
      [usuarioId],
    )
    return Array.isArray(rows) && rows[0] ? rows[0] : {}
  } catch (e) {
    console.error('[usuarios] selectAdminPerfilCampos:', e?.code || e?.errno, e?.sqlMessage || e?.message || e)
    return {}
  }
}

function isMissingTableError(error) {
  return error?.code === 'ER_NO_SUCH_TABLE'
}

async function ensureSupportTables() {
  if (!supportTablesReady) {
    await query(`
    CREATE TABLE IF NOT EXISTS estudiantes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL UNIQUE,
      nombre VARCHAR(100) NOT NULL,
      apellido VARCHAR(100) NOT NULL,
      documento VARCHAR(20) UNIQUE,
      activo BOOLEAN DEFAULT TRUE,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_usuario (usuario_id)
    )
  `)
    await query(`
    CREATE TABLE IF NOT EXISTS docentes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL UNIQUE,
      nombre VARCHAR(100) NOT NULL,
      apellido VARCHAR(100) NOT NULL,
      documento VARCHAR(20) UNIQUE,
      activo BOOLEAN DEFAULT TRUE,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_usuario (usuario_id)
    )
  `)
    await query(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NULL,
      accion VARCHAR(255) NOT NULL,
      tabla_afectada VARCHAR(50),
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_usuario (usuario_id),
      INDEX idx_fecha (fecha)
    )
  `)
    try {
      await query(`
    CREATE TABLE IF NOT EXISTS usuario_permisos (
      usuario_id INT PRIMARY KEY,
      nivel_confianza ENUM('baja', 'media', 'alta') NOT NULL DEFAULT 'baja',
      gestionar_usuarios BOOLEAN DEFAULT FALSE,
      asignar_cursos BOOLEAN DEFAULT FALSE,
      bloquear_usuarios BOOLEAN DEFAULT FALSE,
      ver_logs BOOLEAN DEFAULT FALSE,
      eliminar_usuarios BOOLEAN DEFAULT FALSE,
      fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_usuario_permisos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `)
    } catch (e) {
      console.warn('[COLGO] usuario_permisos (no crítico):', e?.code || e?.errno || e?.message || e)
    }
    try {
      await query(`
    CREATE TABLE IF NOT EXISTS actividad_usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      actor_usuario_id INT NULL,
      actor_rol VARCHAR(30) NULL,
      objetivo_usuario_id INT NULL,
      accion VARCHAR(120) NOT NULL,
      detalle TEXT NULL,
      ip_origen VARCHAR(80) NULL,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_actividad_actor (actor_usuario_id, fecha),
      INDEX idx_actividad_objetivo (objetivo_usuario_id, fecha),
      INDEX idx_actividad_accion (accion, fecha)
    )
  `)
    } catch (e) {
      console.warn('[COLGO] actividad_usuarios (no crítico):', e?.code || e?.errno || e?.message || e)
    }
    try {
      await ensureStaffProfileTable()
    } catch (e) {
      console.warn('[COLGO] staff_perfiles (no crítico):', e?.code || e?.errno || e?.message || e)
    }
    try {
      await ensureAdminProfileTable()
    } catch (e) {
      console.warn('[COLGO] admin_perfiles (no crítico):', e?.code || e?.errno || e?.message || e)
    }
    supportTablesReady = true
    try {
      await query(`
    ALTER TABLE usuarios
    MODIFY COLUMN rol ENUM('admin', 'estudiante', 'docente', 'staff') NOT NULL DEFAULT 'estudiante'
  `)
    } catch (e) {
      console.warn('[COLGO] ALTER usuarios.rol omitido (datos o motor incompatibles):', e?.code || e?.errno || e?.message || e)
    }
  }
  await ensureUltimoAccesoColumn()
  await ensureEstudiantesUbicacionColumns()
  await ensureDocentesExtraColumns()
  await ensureSchemaRuntime()
}

async function logActividad({ actorId = null, actorRol = null, objetivoId = null, accion, detalle = null, ip = null }) {
  try {
    await ensureSupportTables()
    await query(
      `INSERT INTO actividad_usuarios
      (actor_usuario_id, actor_rol, objetivo_usuario_id, accion, detalle, ip_origen)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [actorId, actorRol, objetivoId, accion, detalle, ip],
    )
  } catch (error) {
    console.error('Error registrando actividad:', error)
  }
}

function normalizeRol(rol) {
  const r = String(rol || '')
    .trim()
    .toLowerCase()
  if (r === 'administrador' || r === 'admin') return 'admin'
  if (r === 'staff' || r === 'personal') return 'staff'
  if (r === 'docente') return 'docente'
  if (r === 'estudiante') return 'estudiante'
  return null
}

function rolEtiqueta(rolDb) {
  if (rolDb === 'admin') return 'Administrador'
  if (rolDb === 'staff') return 'Staff'
  if (rolDb === 'docente') return 'Docente'
  return 'Estudiante'
}

function isStaffUser(req) {
  return String(req.user?.rol || '').toLowerCase() === 'staff'
}

function isAdminRole(rol) {
  return String(rol || '') === 'admin'
}

function normalizeTrustLevel(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'baja' || v === 'media' || v === 'alta') return v
  return 'baja'
}

function buildPermissionPreset(nivelConfianza) {
  const nivel = normalizeTrustLevel(nivelConfianza)
  if (nivel === 'alta') {
    return {
      nivel_confianza: 'alta',
      gestionar_usuarios: true,
      asignar_cursos: true,
      bloquear_usuarios: true,
      ver_logs: true,
      eliminar_usuarios: false,
    }
  }
  if (nivel === 'media') {
    return {
      nivel_confianza: 'media',
      gestionar_usuarios: true,
      asignar_cursos: true,
      bloquear_usuarios: false,
      ver_logs: true,
      eliminar_usuarios: false,
    }
  }
  return {
    nivel_confianza: 'baja',
    gestionar_usuarios: false,
    asignar_cursos: false,
    bloquear_usuarios: false,
    ver_logs: false,
    eliminar_usuarios: false,
  }
}

async function getUserPermissions(userId, rol) {
  const role = String(rol || '').toLowerCase()
  if (role === 'admin') {
    return {
      nivel_confianza: 'alta',
      gestionar_usuarios: true,
      asignar_cursos: true,
      bloquear_usuarios: true,
      ver_logs: true,
      eliminar_usuarios: true,
    }
  }
  if (role !== 'staff') {
    return {
      nivel_confianza: 'baja',
      gestionar_usuarios: false,
      asignar_cursos: false,
      bloquear_usuarios: false,
      ver_logs: false,
      eliminar_usuarios: false,
    }
  }
  const rows = await query(
    `SELECT nivel_confianza, gestionar_usuarios, asignar_cursos, bloquear_usuarios, ver_logs, eliminar_usuarios
     FROM usuario_permisos
     WHERE usuario_id = ?
     LIMIT 1`,
    [userId],
  )
  if (!Array.isArray(rows) || rows.length === 0) {
    return buildPermissionPreset('baja')
  }
  const row = rows[0]
  return {
    nivel_confianza: normalizeTrustLevel(row.nivel_confianza),
    gestionar_usuarios: Boolean(row.gestionar_usuarios),
    asignar_cursos: Boolean(row.asignar_cursos),
    bloquear_usuarios: Boolean(row.bloquear_usuarios),
    ver_logs: Boolean(row.ver_logs),
    eliminar_usuarios: Boolean(row.eliminar_usuarios),
  }
}

async function requireStaffPermission(req, res, permissionKey) {
  if (!isStaffUser(req)) return true
  await ensureSupportTables()
  const actorRol = String(req.user?.rol || 'staff').toLowerCase()
  const perms = await getUserPermissions(Number(req.user?.id || 0), actorRol)
  if (!perms[permissionKey]) {
    res.status(403).json({ error: 'No tienes permisos para esta acción según tu nivel de confianza.' })
    return false
  }
  return true
}

function parseCursoIds(input) {
  const list = Array.isArray(input) ? input : input != null ? [input] : []
  const ids = list
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
  return [...new Set(ids)]
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

/** Fecha para columna DATE: solo YYYY-MM-DD o null (tolerante a ISO con hora y dd/mm/aaaa). */
function normalizeMysqlDateInput(value) {
  const s = String(value ?? '').trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const head = s.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(head)) return null
    const [ys, ms, ds] = head.split('-')
    const y = Number(ys)
    const mo = Number(ms)
    const d = Number(ds)
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
    const dt = new Date(Date.UTC(y, mo - 1, d))
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
    if (y < 1900 || y > 2100) return null
    return head
  }
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

async function ensureEstudianteRow(usuarioId, nombre, apellido, documento) {
  const rows = await query('SELECT id FROM estudiantes WHERE usuario_id = ? LIMIT 1', [usuarioId])
  if (Array.isArray(rows) && rows.length > 0) return
  await query(
    'INSERT INTO estudiantes (usuario_id, nombre, apellido, documento) VALUES (?, ?, ?, ?)',
    [usuarioId, nombre || '—', apellido || '—', documento || null],
  )
}

async function ensureDocenteRow(usuarioId, nombre, apellido, documento) {
  const rows = await query('SELECT id FROM docentes WHERE usuario_id = ? LIMIT 1', [usuarioId])
  if (Array.isArray(rows) && rows.length > 0) return
  await query(
    'INSERT INTO docentes (usuario_id, nombre, apellido, documento) VALUES (?, ?, ?, ?)',
    [usuarioId, nombre || '—', apellido || '—', documento || null],
  )
}

async function getPersonaPorUsuarioId(usuarioId) {
  try {
    const rows = await query(
      `SELECT u.id, u.email, u.rol,
          COALESCE(
            NULLIF(TRIM(e.documento), ''),
            NULLIF(TRIM(d.documento), ''),
            NULLIF(TRIM(sp.documento), ''),
            NULLIF(TRIM(ap.documento), '')
          ) AS documento,
          COALESCE(
            TRIM(CONCAT(e.nombre, ' ', e.apellido)),
            TRIM(CONCAT(d.nombre, ' ', d.apellido)),
            TRIM(CONCAT(sp.nombre, ' ', sp.apellido)),
            TRIM(CONCAT(ap.nombre, ' ', ap.apellido)),
            u.email
          ) AS nombre_completo
        FROM usuarios u
        LEFT JOIN estudiantes e ON e.usuario_id = u.id
        LEFT JOIN docentes d ON d.usuario_id = u.id
        LEFT JOIN staff_perfiles sp ON sp.usuario_id = u.id
        LEFT JOIN admin_perfiles ap ON ap.usuario_id = u.id
        WHERE u.id = ?
        LIMIT 1`,
      [usuarioId],
    )
    if (!Array.isArray(rows) || rows.length === 0) return null
    return rows[0]
  } catch {
    // Fallback mínimo para esquemas incompletos en producción.
    const rows = await query(
      `SELECT id, email, rol, NULL AS documento, email AS nombre_completo
       FROM usuarios
       WHERE id = ?
       LIMIT 1`,
      [usuarioId],
    )
    if (!Array.isArray(rows) || rows.length === 0) return null
    return rows[0]
  }
}

async function existeDocumentoGlobal(documento) {
  await ensureSupportTables()
  await ensureStaffProfileTable()
  await ensureAdminProfileTable()
  const [dupEst, dupDoc, dupStaff, dupAdmin] = await Promise.all([
    query('SELECT id FROM estudiantes WHERE documento = ? LIMIT 1', [documento]),
    query('SELECT id FROM docentes WHERE documento = ? LIMIT 1', [documento]),
    query('SELECT usuario_id FROM staff_perfiles WHERE documento = ? LIMIT 1', [documento]),
    query('SELECT usuario_id FROM admin_perfiles WHERE documento = ? LIMIT 1', [documento]),
  ])
  return (
    (Array.isArray(dupEst) && dupEst.length > 0) ||
    (Array.isArray(dupDoc) && dupDoc.length > 0) ||
    (Array.isArray(dupStaff) && dupStaff.length > 0) ||
    (Array.isArray(dupAdmin) && dupAdmin.length > 0)
  )
}

/**
 * GET /api/usuarios — listado (solo admin)
 */
router.get('/', async (req, res) => {
  try {
    if (!(await requireStaffPermission(req, res, 'gestionar_usuarios'))) return
    await ensureSupportTables()
    let usuarios
    try {
      usuarios = await query(`
        SELECT u.id, u.email, u.rol, u.activo, u.ultimo_acceso, NULL AS fecha_creacion,
          e.id AS estudiante_id,
          d.id AS docente_id,
          COALESCE(
            TRIM(CONCAT(e.nombre, ' ', e.apellido)),
            TRIM(CONCAT(d.nombre, ' ', d.apellido)),
            TRIM(CONCAT(sp.nombre, ' ', sp.apellido)),
            TRIM(CONCAT(ap.nombre, ' ', ap.apellido)),
            u.email
          ) AS nombre_completo,
          COALESCE(e.documento, d.documento, sp.documento, ap.documento) AS documento,
          CASE
            WHEN u.rol = 'docente' THEN (
              SELECT GROUP_CONCAT(c.nombre ORDER BY c.nombre SEPARATOR ', ')
              FROM cursos c
              WHERE c.docente_id = d.id
            )
            WHEN u.rol = 'estudiante' THEN (
              SELECT GROUP_CONCAT(c2.nombre ORDER BY c2.nombre SEPARATOR ', ')
              FROM matriculas m
              JOIN cursos c2 ON c2.id = m.curso_id
              WHERE m.estudiante_id = e.id AND m.estado = 'activa'
            )
            ELSE NULL
          END AS cursos_asignados,
          COALESCE(up.nivel_confianza, 'baja') AS nivel_confianza
        FROM usuarios u
        LEFT JOIN estudiantes e ON e.usuario_id = u.id
        LEFT JOIN docentes d ON d.usuario_id = u.id
        LEFT JOIN staff_perfiles sp ON sp.usuario_id = u.id
        LEFT JOIN admin_perfiles ap ON ap.usuario_id = u.id
        LEFT JOIN usuario_permisos up ON up.usuario_id = u.id
        ORDER BY u.id DESC
      `)
    } catch {
      usuarios = await query(`
        SELECT u.id, u.email, u.rol, u.activo, NULL AS ultimo_acceso, NULL AS fecha_creacion,
               NULL AS estudiante_id, NULL AS docente_id,
               u.email AS nombre_completo, NULL AS documento,
               NULL AS cursos_asignados, 'baja' AS nivel_confianza
        FROM usuarios u
        ORDER BY u.id DESC
      `)
    }
    res.json(usuarios)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

/**
 * GET /api/usuarios/cursos-disponibles — cursos activos con docente asignado
 */
router.get('/cursos-disponibles', async (_req, res) => {
  try {
    const cCols = await getExistingColumnNames('cursos')
    const dCols = await getExistingColumnNames('docentes')
    const nombreCol = cCols.has('nombre') ? 'nombre' : cCols.has('title') ? 'title' : null
    if (!nombreCol) return res.json([])
    const codigoExpr = cCols.has('codigo') ? 'c.codigo' : 'NULL AS codigo'
    const activoExpr = cCols.has('activo') ? 'c.activo = TRUE' : '1=1'
    const docenteFk = cCols.has('docente_id') ? 'docente_id' : cCols.has('teacher_id') ? 'teacher_id' : null
    const joinDoc = docenteFk && dCols.size > 0 ? `LEFT JOIN docentes d ON d.id = c.${docenteFk}` : ''
    const docenteExpr =
      docenteFk && dCols.size > 0
        ? `TRIM(CONCAT(${dCols.has('nombre') ? 'd.nombre' : "''"}, ' ', ${dCols.has('apellido') ? 'd.apellido' : "''"})) AS docente`
        : 'NULL AS docente'
    const whereDoc = docenteFk ? `AND c.${docenteFk} IS NOT NULL` : ''
    const cursos = await query(
      `SELECT c.id, c.${nombreCol} AS nombre, ${codigoExpr}, ${cCols.has('activo') ? 'c.activo' : '1 AS activo'},
              ${docenteExpr}
       FROM cursos c
       ${joinDoc}
       WHERE ${activoExpr} ${whereDoc}
       ORDER BY c.${nombreCol} ASC`,
    )
    return res.json(Array.isArray(cursos) ? cursos : [])
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error al cargar cursos disponibles' })
  }
})

/**
 * GET /api/usuarios/logs — últimos eventos de auditoría (ruta fija antes de /:id)
 */
router.get('/logs', async (_req, res) => {
  try {
    if (!(await requireStaffPermission(_req, res, 'ver_logs'))) return
    await ensureSupportTables()
    const logs = await query(
      `SELECT a.id, a.accion, a.tabla_afectada, a.fecha, u.email AS usuario_email
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       ORDER BY a.fecha DESC
       LIMIT 20`,
    )
    res.json(Array.isArray(logs) ? logs : [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener logs del sistema' })
  }
})

/**
 * Perfil propio staff/admin (montado en `GET/PUT /api/auth/me/perfil`).
 */
export async function handleMePerfilGet(req, res) {
  try {
    const rol = String(req.user?.rol || '')
    if (rol !== 'staff' && rol !== 'admin') {
      return res.status(403).json({ error: 'Solo disponible para usuarios staff o administradores.' })
    }
    await ensureSupportTables()
    const meId = Number(req.user?.id || 0)
    if (!meId) return res.status(401).json({ error: 'Sesión inválida' })
    const base = await getPersonaPorUsuarioId(meId)
    if (rol === 'admin') {
      const perfil = await selectAdminPerfilCampos(meId)
      return res.json({
        id: meId,
        rol: 'admin',
        email: String(base?.email || ''),
        nombre: String((perfil && perfil.nombre) || ''),
        apellido: String((perfil && perfil.apellido) || ''),
        documento: String((perfil && perfil.documento) || ''),
        telefono: String((perfil && perfil.telefono) || ''),
        cargo: String((perfil && perfil.cargo) || ''),
      })
    }
    const perfil = await selectStaffPerfilCampos(meId)
    return res.json({
      id: meId,
      rol: 'staff',
      email: String(base?.email || ''),
      nombre: String((perfil && perfil.nombre) || ''),
      apellido: String((perfil && perfil.apellido) || ''),
      documento: String((perfil && perfil.documento) || ''),
      telefono: String((perfil && perfil.telefono) || ''),
      area: String((perfil && perfil.area) || ''),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error al obtener el perfil' })
  }
}

export async function handleMePerfilPut(req, res) {
  try {
    const rol = String(req.user?.rol || '')
    if (rol !== 'staff' && rol !== 'admin') {
      return res.status(403).json({ error: 'Solo disponible para usuarios staff o administradores.' })
    }
    await ensureSupportTables()
    const meId = Number(req.user?.id || 0)
    if (!meId) return res.status(401).json({ error: 'Sesión inválida' })

    const raw = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
    const nombre = String(raw.nombre ?? '').trim()
    const apellido = String(raw.apellido ?? '').trim()
    const documento = String(raw.documento ?? '').trim()
    const telefono = String(raw.telefono ?? '').trim()
    const area = String(raw.area ?? '').trim()
    const cargo = String(raw.cargo ?? '').trim()

    if (rol === 'admin') {
      await ensureAdminProfileTable()
      await query(
        `INSERT INTO admin_perfiles (usuario_id, nombre, apellido, documento, telefono, cargo)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = VALUES(nombre),
           apellido = VALUES(apellido),
           documento = VALUES(documento),
           telefono = VALUES(telefono),
           cargo = VALUES(cargo)`,
        [meId, nombre || null, apellido || null, documento || null, telefono || null, cargo || null],
      )
      return res.json({ success: true, message: 'Perfil actualizado correctamente' })
    }

    await ensureStaffProfileTable()
    await query(
      `INSERT INTO staff_perfiles (usuario_id, nombre, apellido, documento, telefono, area)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nombre = VALUES(nombre),
         apellido = VALUES(apellido),
         documento = VALUES(documento),
         telefono = VALUES(telefono),
         area = VALUES(area)`,
      [
        meId,
        nombre || null,
        apellido || null,
        documento || null,
        telefono || null,
        area || null,
      ],
    )
    return res.json({ success: true, message: 'Perfil actualizado correctamente' })
  } catch (err) {
    console.error(err)
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese documento ya está en uso.' })
    }
    return res.status(500).json({ error: 'Error al actualizar el perfil' })
  }
}

/**
 * GET /api/usuarios/:id/detalle — datos completos para edición por rol
 */
router.get('/:id/detalle', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' })
  try {
    if (!(await requireStaffPermission(req, res, 'gestionar_usuarios'))) return
    await ensureSupportTables()
    const baseRows = await query(
      `SELECT u.id, u.email, u.rol, u.activo, u.foto_url,
              COALESCE(e.nombre, d.nombre, sp.nombre, ap.nombre, '') AS nombres,
              COALESCE(e.apellido, d.apellido, sp.apellido, ap.apellido, '') AS apellidos,
              COALESCE(e.documento, d.documento, sp.documento, ap.documento, '') AS cedula
       FROM usuarios u
       LEFT JOIN estudiantes e ON e.usuario_id = u.id
       LEFT JOIN docentes d ON d.usuario_id = u.id
       LEFT JOIN staff_perfiles sp ON sp.usuario_id = u.id
       LEFT JOIN admin_perfiles ap ON ap.usuario_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
      [id],
    )
    if (!Array.isArray(baseRows) || baseRows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' })
    const base = { ...baseRows[0] }
    if (Object.prototype.hasOwnProperty.call(base, 'foto_url')) {
      const fv = base.foto_url
      if (fv == null || fv === '') base.foto_url = null
      else if (Buffer.isBuffer(fv)) base.foto_url = fv.toString('utf8')
      else base.foto_url = String(fv)
    }
    let perfil = {}
    if (String(base.rol) === 'estudiante') {
      perfil = await selectEstudiantePerfilCampos(id)
    } else if (String(base.rol) === 'docente') {
      perfil = await selectDocentePerfilCampos(id)
    } else if (String(base.rol) === 'staff') {
      perfil = await selectStaffPerfilCampos(id)
    } else if (String(base.rol) === 'admin') {
      perfil = await selectAdminPerfilCampos(id)
    }
    return res.json({ ...base, ...perfil })
  } catch (err) {
    console.error(err)
    const hint =
      err?.code === 'ER_BAD_FIELD_ERROR'
        ? 'Esquema de base de datos desincronizado. Reinicia el backend o ejecuta las migraciones en schema.sql.'
        : err?.code === 'ER_NO_SUCH_TABLE'
          ? 'Falta una tabla (estudiantes/docentes). Reinicia el backend para crear tablas auxiliares.'
          : err?.code === 'ER_ACCESS_DENIED_ERROR'
            ? 'MySQL rechazó la conexión (usuario/contraseña). Revisa DB_USER y DB_PASSWORD en el .env de la raíz del proyecto.'
            : undefined
    const isProd = process.env.NODE_ENV === 'production'
    return res.status(500).json({
      error: 'Error obteniendo detalle del usuario',
      ...(hint ? { hint } : {}),
      ...(!isProd && err?.message ? { detail: String(err.message) } : {}),
    })
  }
})

/**
 * GET /api/usuarios/:id/permisos — permisos operativos por confianza
 */
router.get('/:id/permisos', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' })
  try {
    await ensureSupportTables()
    const rows = await query('SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1', [id])
    if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' })
    const rol = String(rows[0].rol || '')
    if (isStaffUser(req)) {
      return res.status(403).json({ error: 'Solo administradores pueden consultar permisos de confianza.' })
    }
    return res.json(await getUserPermissions(id, rol))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error al obtener permisos del usuario' })
  }
})

/**
 * PUT /api/usuarios/:id/permisos — actualizar permisos operativos por confianza
 */
router.put('/:id/permisos', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' })
  if (isStaffUser(req)) {
    return res.status(403).json({ error: 'Solo administradores pueden actualizar permisos de confianza.' })
  }
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
  try {
    await ensureSupportTables()
    const rows = await query('SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1', [id])
    if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' })
    const rol = String(rows[0].rol || '')
    if (rol !== 'staff') {
      return res.status(400).json({ error: 'Solo se puede configurar confianza/permisos para usuarios staff.' })
    }

    const nivel = normalizeTrustLevel(body.nivel_confianza)
    const preset = buildPermissionPreset(nivel)
    const gestionar = typeof body.gestionar_usuarios === 'boolean' ? body.gestionar_usuarios : preset.gestionar_usuarios
    const asignar = typeof body.asignar_cursos === 'boolean' ? body.asignar_cursos : preset.asignar_cursos
    const bloquear = typeof body.bloquear_usuarios === 'boolean' ? body.bloquear_usuarios : preset.bloquear_usuarios
    const verLogs = typeof body.ver_logs === 'boolean' ? body.ver_logs : preset.ver_logs
    const eliminar = typeof body.eliminar_usuarios === 'boolean' ? body.eliminar_usuarios : preset.eliminar_usuarios

    await query(
      `INSERT INTO usuario_permisos
      (usuario_id, nivel_confianza, gestionar_usuarios, asignar_cursos, bloquear_usuarios, ver_logs, eliminar_usuarios)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nivel_confianza = VALUES(nivel_confianza),
        gestionar_usuarios = VALUES(gestionar_usuarios),
        asignar_cursos = VALUES(asignar_cursos),
        bloquear_usuarios = VALUES(bloquear_usuarios),
        ver_logs = VALUES(ver_logs),
        eliminar_usuarios = VALUES(eliminar_usuarios)`,
      [id, nivel, Boolean(gestionar), Boolean(asignar), Boolean(bloquear), Boolean(verLogs), Boolean(eliminar)],
    )
    return res.json({
      success: true,
      usuario_id: id,
      nivel_confianza: nivel,
      gestionar_usuarios: Boolean(gestionar),
      asignar_cursos: Boolean(asignar),
      bloquear_usuarios: Boolean(bloquear),
      ver_logs: Boolean(verLogs),
      eliminar_usuarios: Boolean(eliminar),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error al actualizar permisos del usuario' })
  }
})

/**
 * PUT /api/usuarios/:id — editar datos del usuario/persona (admin)
 * Nota: no cambia de rol; solo datos del rol actual.
 */
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  const raw = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
  const nombre = String(raw.nombres ?? raw.nombre ?? '').trim()
  const apellido = String(raw.apellidos ?? raw.apellido ?? '').trim()
  const documento = String(raw.cedula ?? raw.documento ?? '').trim()
  const email = String(raw.email ?? '').trim().toLowerCase()
  const activoRaw = raw.activo
  const telefono = String(raw.telefono ?? '').trim()
  const direccion = String(raw.direccion ?? '').trim()
  const ciudad = String(raw.ciudad ?? '').trim()
  const pais = String(raw.pais ?? '').trim()
  const departamento = String(raw.departamento ?? '').trim()
  const municipio = String(raw.municipio ?? '').trim()
  const fechaNacimientoRaw = String(raw.fecha_nacimiento ?? '').trim()
  const estadoCivil = String(raw.estado_civil ?? '').trim()
  const especialidad = String(raw.especialidad ?? '').trim()
  const area = String(raw.area ?? '').trim()
  const tipoDocumento = String(raw.tipo_documento ?? '').trim()

  try {
    if (!(await requireStaffPermission(req, res, 'gestionar_usuarios'))) return
    await ensureSupportTables()
    const rows = await query('SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1', [id])
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    const rol = String(rows[0].rol || '')
    if (isStaffUser(req) && isAdminRole(rol)) {
      return res.status(403).json({ error: 'Staff no puede editar usuarios administradores.' })
    }

    if (email) {
      const exists = await query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1', [email, id])
      if (Array.isArray(exists) && exists.length > 0) {
        return res.status(409).json({ error: 'El correo ya está en uso por otro usuario' })
      }
      await query('UPDATE usuarios SET email = ? WHERE id = ?', [email, id])
    }
    if (typeof activoRaw === 'boolean') {
      await query('UPDATE usuarios SET activo = ? WHERE id = ?', [Boolean(activoRaw), id])
    }

    if (rol === 'estudiante') {
      await ensureEstudianteRow(id, nombre, apellido, documento)
      const fechaNacimientoSql = hasOwn(raw, 'fecha_nacimiento') ? normalizeMysqlDateInput(fechaNacimientoRaw) : undefined
      const updateFields = []
      const args = []
      if (nombre) { updateFields.push('nombre = ?'); args.push(nombre) }
      if (apellido) { updateFields.push('apellido = ?'); args.push(apellido) }
      if (documento) { updateFields.push('documento = ?'); args.push(documento) }
      if (hasOwn(raw, 'tipo_documento')) { updateFields.push('tipo_documento = ?'); args.push(tipoDocumento || null) }
      if (hasOwn(raw, 'telefono')) { updateFields.push('telefono = ?'); args.push(telefono || null) }
      if (hasOwn(raw, 'direccion')) { updateFields.push('direccion = ?'); args.push(direccion || null) }
      if (hasOwn(raw, 'ciudad')) { updateFields.push('ciudad = ?'); args.push(ciudad || null) }
      if (hasOwn(raw, 'pais')) { updateFields.push('pais = ?'); args.push(pais || null) }
      if (hasOwn(raw, 'departamento')) { updateFields.push('departamento = ?'); args.push(departamento || null) }
      if (hasOwn(raw, 'municipio')) { updateFields.push('municipio = ?'); args.push(municipio || null) }
      if (hasOwn(raw, 'fecha_nacimiento')) { updateFields.push('fecha_nacimiento = ?'); args.push(fechaNacimientoSql ?? null) }
      if (hasOwn(raw, 'estado_civil')) { updateFields.push('estado_civil = ?'); args.push(estadoCivil || null) }
      if (updateFields.length > 0) {
        await query(`UPDATE estudiantes SET ${updateFields.join(', ')} WHERE usuario_id = ?`, [...args, id])
      }
    } else if (rol === 'docente') {
      await ensureDocenteRow(id, nombre, apellido, documento)
      const updateFields = []
      const args = []
      if (nombre) { updateFields.push('nombre = ?'); args.push(nombre) }
      if (apellido) { updateFields.push('apellido = ?'); args.push(apellido) }
      if (documento) { updateFields.push('documento = ?'); args.push(documento) }
      if (hasOwn(raw, 'telefono')) { updateFields.push('telefono = ?'); args.push(telefono || null) }
      if (hasOwn(raw, 'especialidad')) { updateFields.push('especialidad = ?'); args.push(especialidad || null) }
      if (updateFields.length > 0) {
        await query(`UPDATE docentes SET ${updateFields.join(', ')} WHERE usuario_id = ?`, [...args, id])
      }
    } else if (rol === 'staff') {
      await ensureStaffProfileTable()
      await query(
        `INSERT INTO staff_perfiles (usuario_id, nombre, apellido, documento, telefono, area)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = VALUES(nombre),
           apellido = VALUES(apellido),
           documento = VALUES(documento),
           telefono = VALUES(telefono),
           area = VALUES(area)`,
        [
          id,
          nombre || null,
          apellido || null,
          documento || null,
          telefono || null,
          area || null,
        ],
      )
    } else if (rol === 'admin') {
      const cargo = String(raw.cargo ?? '').trim()
      await ensureAdminProfileTable()
      await query(
        `INSERT INTO admin_perfiles (usuario_id, nombre, apellido, documento, telefono, cargo)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = VALUES(nombre),
           apellido = VALUES(apellido),
           documento = VALUES(documento),
           telefono = VALUES(telefono),
           cargo = VALUES(cargo)`,
        [
          id,
          nombre || null,
          apellido || null,
          documento || null,
          telefono || null,
          cargo || null,
        ],
      )
    }

    try {
      await query('INSERT INTO auditoria (usuario_id, accion, tabla_afectada) VALUES (?, ?, ?)', [
        req.user?.id ?? null,
        `Usuario ${id} actualizado`,
        'usuarios',
      ])
    } catch (audErr) {
      console.error('Auditoría (no crítica):', audErr)
    }
    await logActividad({
      actorId: Number(req.user?.id || 0) || null,
      actorRol: String(req.user?.rol || ''),
      objetivoId: id,
      accion: 'usuario_actualizado',
      detalle: 'Actualización de datos básicos por panel admin/staff',
      ip: req.ip,
    })

    return res.json({ success: true, id })
  } catch (err) {
    console.error(err)
    if (err?.code === 'ER_DUP_ENTRY') {
      const msg = String(err.sqlMessage || '')
      if (msg.includes('documento')) {
        return res.status(409).json({ error: 'Ese número de documento ya está registrado en otro estudiante o docente.' })
      }
      return res.status(409).json({ error: 'No se pudo guardar: hay un dato duplicado en el sistema.' })
    }
    let hint
    if (err?.code === 'ER_BAD_FIELD_ERROR') {
      hint = 'La base de datos no tiene una columna esperada. Reinicia el servidor backend para aplicar migraciones automáticas.'
    } else if (err?.code === 'ER_TRUNCATED_WRONG_VALUE' || err?.errno === 1292 || err?.errno === 1366) {
      hint = 'Algún campo (por ejemplo la fecha de nacimiento) tiene un formato que MySQL no acepta. Usa la fecha del calendario o deja el campo vacío.'
    } else if (err?.code === 'ER_NO_SUCH_TABLE') {
      hint = 'Falta una tabla en la base de datos. Ejecuta el script schema.sql o reinicia el backend.'
    }
    const isProd = process.env.NODE_ENV === 'production'
    return res.status(500).json({
      error: 'Error actualizando usuario',
      ...(hint ? { hint } : {}),
      ...(!isProd && err?.message ? { detail: String(err.message) } : {}),
    })
  }
})

/**
 * GET /api/usuarios/:id/actividad — historial de actividad del usuario
 */
router.get('/:id/actividad', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' })
  try {
    if (!(await requireStaffPermission(req, res, 'ver_logs'))) return
    await ensureSupportTables()
    const rows = await query(
      `SELECT id, actor_usuario_id, actor_rol, objetivo_usuario_id, accion, detalle, ip_origen, fecha
       FROM actividad_usuarios
       WHERE objetivo_usuario_id = ? OR actor_usuario_id = ?
       ORDER BY fecha DESC
       LIMIT 100`,
      [id, id],
    )
    return res.json(Array.isArray(rows) ? rows : [])
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'No se pudo consultar la actividad del usuario' })
  }
})

/**
 * GET /api/usuarios/anomalias — detección básica de eventos sospechosos
 */
router.get('/seguridad/anomalias', async (req, res) => {
  try {
    if (!(await requireStaffPermission(req, res, 'ver_logs'))) return
    await ensureSupportTables()
    const rows = await query(
      `SELECT objetivo_usuario_id AS usuario_id, COUNT(*) AS total_fallos
       FROM actividad_usuarios
       WHERE accion = 'login_failed' AND fecha >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       GROUP BY objetivo_usuario_id
       HAVING COUNT(*) >= 3
       ORDER BY total_fallos DESC
       LIMIT 20`,
    )
    return res.json(Array.isArray(rows) ? rows : [])
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'No se pudieron detectar anomalías' })
  }
})

/**
 * GET /api/usuarios/validate?cedula=...&email=... — validación en tiempo real de duplicados
 */
router.get('/validate', async (req, res) => {
  const cedula = String(req.query?.cedula ?? '').trim()
  const email = String(req.query?.email ?? '')
    .trim()
    .toLowerCase()

  if (!cedula && !email) {
    return res.status(400).json({ error: 'Envía cedula o email para validar.' })
  }

  try {
    if (!(await requireStaffPermission(req, res, 'gestionar_usuarios'))) return
    await ensureSupportTables()
    let emailExists = false
    let cedulaExists = false

    if (email) {
      const dupEmail = await query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1', [email])
      emailExists = Array.isArray(dupEmail) && dupEmail.length > 0
    }

    if (cedula) {
      cedulaExists = await existeDocumentoGlobal(cedula)
    }

    return res.json({
      cedulaExists,
      emailExists,
      available: !cedulaExists && !emailExists,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error validando duplicados' })
  }
})

/**
 * POST /api/usuarios/:id/reenviar-bienvenida — reintento de correo de invitación
 */
router.post('/:id/reenviar-bienvenida', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  try {
    if (!(await requireStaffPermission(req, res, 'gestionar_usuarios'))) return
    await ensureSupportTables()
    const persona = await getPersonaPorUsuarioId(id)
    if (!persona) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const emailTo = String(persona.email || '').trim()
    if (!emailTo) {
      return res.status(400).json({
        error: 'El usuario no tiene correo electrónico registrado; no se puede enviar la invitación.',
      })
    }

    let cedula = String(persona.documento ?? '').trim()
    if (!cedula) {
      const docRows = await query(
        `SELECT COALESCE(
            NULLIF(TRIM(e.documento), ''),
            NULLIF(TRIM(d.documento), ''),
            NULLIF(TRIM(sp.documento), ''),
            NULLIF(TRIM(ap.documento), '')
          ) AS doc
         FROM usuarios u
         LEFT JOIN estudiantes e ON e.usuario_id = u.id
         LEFT JOIN docentes d ON d.usuario_id = u.id
         LEFT JOIN staff_perfiles sp ON sp.usuario_id = u.id
         LEFT JOIN admin_perfiles ap ON ap.usuario_id = u.id
         WHERE u.id = ?
         LIMIT 1`,
        [id],
      )
      cedula = String(docRows?.[0]?.doc ?? '').trim()
    }
    if (!cedula) {
      return res.status(400).json({
        error:
          'Este usuario no tiene documento de identidad en el perfil (estudiante/docente/staff/admin). Complétalo en «Perfil y datos» y vuelve a intentar.',
      })
    }

    const baseFront = resolveFrontendBase(req)
    const loginUrl = `${baseFront}/login`
    let panelUrl = `${baseFront}/admin/dashboard`
    if (persona.rol === 'estudiante') panelUrl = `${baseFront}/estudiante/dashboard`
    if (persona.rol === 'docente') panelUrl = `${baseFront}/docente/dashboard`

    const emailResult = await sendColgoUsuarioInvitacion({
      to: emailTo,
      nombreCompleto: String(persona.nombre_completo || persona.email || 'Usuario'),
      cedula,
      rolEtiqueta: rolEtiqueta(String(persona.rol)),
      loginUrl,
      panelUrl,
    })

    if (!emailResult.success) {
      return res.status(502).json({
        error: 'No se pudo reenviar el correo de bienvenida.',
        detail: emailResult.error || 'fallo SMTP',
      })
    }

    await query('INSERT INTO auditoria (usuario_id, accion, tabla_afectada) VALUES (?, ?, ?)', [
      req.user?.id ?? null,
      `Correo de bienvenida reenviado a usuario ${id}`,
      'usuarios',
    ])

    return res.json({ success: true, id, email: persona.email })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error reenviando correo de bienvenida' })
  }
})

/**
 * POST /api/usuarios/:id/reset-password — reset con temporal y forzar cambio
 */
router.post('/:id/reset-password', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' })
  try {
    if (!(await requireStaffPermission(req, res, 'gestionar_usuarios'))) return
    const rows = await query('SELECT id, email, rol FROM usuarios WHERE id = ? LIMIT 1', [id])
    if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' })
    const temporal = generateSecurePassword(12)
    const hash = await bcrypt.hash(temporal, 10)
    await query('UPDATE usuarios SET password_hash = ?, cambiar_password = ? WHERE id = ?', [hash, true, id])
    const sendEmail = Boolean(req.body?.send_email)
    let emailResult = { success: false, skipped: false, error: '' }
    if (sendEmail) {
      const persona = await getPersonaPorUsuarioId(id)
      emailResult = await sendAdminPasswordResetEmail({
        to: String(rows[0].email || ''),
        nombreCompleto: String(persona?.nombre_completo || rows[0].email || 'Usuario'),
        passwordTemporal: temporal,
        loginUrl: `${resolveFrontendBase(req)}/login`,
      })
    }
    await logActividad({
      actorId: Number(req.user?.id || 0) || null,
      actorRol: String(req.user?.rol || ''),
      objetivoId: id,
      accion: 'password_reset_admin',
      detalle: 'Restablecimiento de contraseña temporal con cambio forzado',
      ip: req.ip,
    })
    return res.json({
      success: true,
      usuario_id: id,
      password_temporal: temporal,
      forzar_cambio_password: true,
      mensaje: 'Contraseña temporal generada. El usuario deberá cambiarla al ingresar.',
      emailSent: sendEmail ? Boolean(emailResult.success) : false,
      ...(sendEmail && !emailResult.success
        ? { emailWarning: 'No se pudo enviar correo con la temporal.', emailDetail: emailResult.error || 'fallo SMTP' }
        : {}),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'No se pudo restablecer la contraseña' })
  }
})

/**
 * GET /api/usuarios/:id/supervision — vista controlada para admin
 */
router.get('/:id/supervision', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' })
  if (String(req.user?.rol || '') !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden usar ver como usuario.' })
  }
  try {
    await ensureSupportTables()
    const baseRows = await query(
      `SELECT u.id, u.email, u.rol, u.activo, u.ultimo_acceso,
              COALESCE(
                TRIM(CONCAT(e.nombre, ' ', e.apellido)),
                TRIM(CONCAT(d.nombre, ' ', d.apellido)),
                TRIM(CONCAT(sp.nombre, ' ', sp.apellido)),
                TRIM(CONCAT(ap.nombre, ' ', ap.apellido)),
                u.email
              ) AS nombre
       FROM usuarios u
       LEFT JOIN estudiantes e ON e.usuario_id = u.id
       LEFT JOIN docentes d ON d.usuario_id = u.id
       LEFT JOIN staff_perfiles sp ON sp.usuario_id = u.id
       LEFT JOIN admin_perfiles ap ON ap.usuario_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
      [id],
    )
    if (!Array.isArray(baseRows) || baseRows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' })
    const user = baseRows[0]
    let panel = {}
    if (user.rol === 'docente') {
      const cursos = await query(
        `SELECT c.id, c.nombre, c.codigo, COUNT(m.id) AS estudiantes_inscritos
         FROM cursos c
         INNER JOIN docentes d ON d.id = c.docente_id
         LEFT JOIN matriculas m ON m.curso_id = c.id AND m.estado = 'activa'
         WHERE d.usuario_id = ?
         GROUP BY c.id
         ORDER BY c.nombre`,
        [id],
      )
      panel = { cursos: Array.isArray(cursos) ? cursos : [] }
    } else if (user.rol === 'estudiante') {
      const cursos = await query(
        `SELECT c.id, c.nombre, c.codigo, m.estado, m.calificacion_final
         FROM matriculas m
         JOIN estudiantes e ON e.id = m.estudiante_id
         JOIN cursos c ON c.id = m.curso_id
         WHERE e.usuario_id = ?
         ORDER BY m.fecha_matricula DESC`,
        [id],
      )
      panel = { cursos: Array.isArray(cursos) ? cursos : [] }
    }
    await logActividad({
      actorId: Number(req.user?.id || 0) || null,
      actorRol: String(req.user?.rol || ''),
      objetivoId: id,
      accion: 'supervision_ver_como',
      detalle: `Visualización controlada del rol ${String(user.rol || '')}`,
      ip: req.ip,
    })
    return res.json({
      modo_visual: true,
      aviso: `Estás viendo como ${user.nombre}`,
      usuario: user,
      panel,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'No se pudo cargar la vista de supervisión' })
  }
})

/**
 * PATCH /api/usuarios/:id/estado — activar/desactivar usuario
 */
router.patch('/:id/estado', async (req, res) => {
  const id = Number(req.params.id)
  const activo = Boolean(req.body?.activo)
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  try {
    if (!(await requireStaffPermission(req, res, 'bloquear_usuarios'))) return
    await ensureSupportTables()
    const userRows = await query('SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1', [id])
    if (!Array.isArray(userRows) || userRows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    const targetRol = String(userRows[0].rol || '')
    if (isStaffUser(req) && isAdminRole(targetRol)) {
      return res.status(403).json({ error: 'Staff no puede cambiar estado de administradores.' })
    }

    await query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo, id])
    await query('INSERT INTO auditoria (usuario_id, accion, tabla_afectada) VALUES (?, ?, ?)', [
      id,
      activo ? 'Usuario activado' : 'Usuario desactivado',
      'usuarios',
    ])
    await logActividad({
      actorId: Number(req.user?.id || 0) || null,
      actorRol: String(req.user?.rol || ''),
      objetivoId: id,
      accion: activo ? 'usuario_activado' : 'usuario_bloqueado',
      detalle: `Cambio de estado a ${activo ? 'activo' : 'bloqueado'}`,
      ip: req.ip,
    })
    return res.json({ success: true, id, activo })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error actualizando estado de usuario' })
  }
})

/**
 * DELETE /api/usuarios/:id — eliminar usuario definitivamente
 */
router.delete('/:id', async (req, res) => {
  if (isStaffUser(req)) {
    if (!(await requireStaffPermission(req, res, 'eliminar_usuarios'))) return
  }
  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  // Evitar que el admin autenticado se elimine a sí mismo accidentalmente.
  if (req.user?.id && Number(req.user.id) === id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario.' })
  }

  try {
    await ensureSupportTables()

    const exists = await query('SELECT id FROM usuarios WHERE id = ? LIMIT 1', [id])
    if (!Array.isArray(exists) || exists.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    await query('DELETE FROM estudiantes WHERE usuario_id = ?', [id])
    await query('DELETE FROM docentes WHERE usuario_id = ?', [id])
    await query('DELETE FROM usuarios WHERE id = ?', [id])
    await query('INSERT INTO auditoria (usuario_id, accion, tabla_afectada) VALUES (?, ?, ?)', [
      req.user?.id ?? null,
      `Usuario ${id} eliminado definitivamente`,
      'usuarios',
    ])
    await logActividad({
      actorId: Number(req.user?.id || 0) || null,
      actorRol: String(req.user?.rol || ''),
      objetivoId: id,
      accion: 'usuario_eliminado',
      detalle: 'Eliminación definitiva de usuario',
      ip: req.ip,
    })

    return res.json({ success: true, id })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error eliminando usuario' })
  }
})

/**
 * POST /api/usuarios — crear persona + correo con cédula como usuario y contraseña
 */
router.post('/', async (req, res) => {
  const raw = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
  if (Object.keys(raw).length === 0) {
    return res.status(400).json({
      error:
        'No se recibieron datos. Envía JSON con nombres, apellidos, cedula, email y rol (Content-Type: application/json).',
    })
  }

  // Acepta variantes de nombre de campo (front, Postman, integraciones)
  const nombre = String(raw.nombres ?? raw.nombre ?? raw.Nombres ?? '').trim()
  const apellido = String(raw.apellidos ?? raw.apellido ?? raw.Apellidos ?? '').trim()
  const doc = String(raw.cedula ?? raw.documento ?? raw.cédula ?? raw.Cedula ?? '').trim()
  const mail = String(raw.email ?? raw.correo ?? raw.Email ?? '')
    .trim()
    .toLowerCase()
  const rolDb = normalizeRol(raw.rol ?? raw.Rol)
  const cursoIds = parseCursoIds(raw.curso_ids ?? raw.cursos_ids ?? raw.curso_id ?? raw.cursos)

  if (!nombre || !apellido || !doc || !mail) {
    return res.status(400).json({
      error: 'Faltan datos obligatorios: nombres, apellidos, cédula y correo.',
    })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return res.status(400).json({ error: 'Correo electrónico inválido' })
  }
  if (!rolDb || !ROLES.includes(rolDb)) {
    return res.status(400).json({ error: 'Rol inválido. Use: estudiante, docente, staff o admin' })
  }
  if (isStaffUser(req) && rolDb === 'admin') {
    return res.status(403).json({ error: 'Staff no puede crear usuarios administradores.' })
  }

  let usuarioId = null
  try {
    if (!(await requireStaffPermission(req, res, 'gestionar_usuarios'))) return
    await ensureSupportTables()
    const existeMail = await query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?)', [mail])
    if (Array.isArray(existeMail) && existeMail.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' })
    }

    if (rolDb === 'estudiante' || rolDb === 'docente') {
      const cedulaDuplicada = await existeDocumentoGlobal(doc)
      if (cedulaDuplicada) {
        return res.status(409).json({ error: 'La cédula ya está registrada' })
      }
    }

    if (rolDb === 'estudiante' && cursoIds.length > 0) {
      const placeholders = cursoIds.map(() => '?').join(',')
      const cursosRows = await query(
        `SELECT id, docente_id FROM cursos WHERE id IN (${placeholders})`,
        cursoIds,
      )
      const cursosValidos = Array.isArray(cursosRows) ? cursosRows : []
      if (cursosValidos.length !== cursoIds.length) {
        return res.status(400).json({
          error: 'Uno o más cursos seleccionados no existen.',
        })
      }
      const cursosSinDocente = cursosValidos.filter((c) => !c.docente_id)
      if (cursosSinDocente.length > 0) {
        return res.status(400).json({
          error: 'No puedes inscribir estudiantes en cursos sin docente asignado.',
        })
      }
    }

    const password_hash = await bcrypt.hash(doc, 10)
    const usuarioResult = await query(
      'INSERT INTO usuarios (email, password_hash, rol, activo, cambiar_password) VALUES (?, ?, ?, ?, ?)',
      [mail, password_hash, rolDb, true, true],
    )
    usuarioId =
      usuarioResult && typeof usuarioResult === 'object' && 'insertId' in usuarioResult
        ? usuarioResult.insertId
        : null

    if (!usuarioId) {
      return res.status(500).json({ error: 'No se pudo crear el usuario' })
    }

    if (rolDb === 'estudiante') {
      const estudianteResult = await query(
        'INSERT INTO estudiantes (usuario_id, nombre, apellido, documento) VALUES (?, ?, ?, ?)',
        [usuarioId, nombre, apellido, doc],
      )
      const estudianteId =
        estudianteResult && typeof estudianteResult === 'object' && 'insertId' in estudianteResult
          ? Number(estudianteResult.insertId)
          : 0
      if (!estudianteId) {
        return res.status(500).json({ error: 'No se pudo crear el estudiante' })
      }

      for (const cursoId of cursoIds) {
        await query(
          'INSERT INTO matriculas (estudiante_id, curso_id, estado) VALUES (?, ?, "activa")',
          [estudianteId, cursoId],
        )
      }
    } else if (rolDb === 'docente') {
      await query(
        'INSERT INTO docentes (usuario_id, nombre, apellido, documento) VALUES (?, ?, ?, ?)',
        [usuarioId, nombre, apellido, doc],
      )
    } else if (rolDb === 'staff') {
      const preset = buildPermissionPreset('baja')
      await query(
        `INSERT INTO usuario_permisos
         (usuario_id, nivel_confianza, gestionar_usuarios, asignar_cursos, bloquear_usuarios, ver_logs, eliminar_usuarios)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          usuarioId,
          preset.nivel_confianza,
          preset.gestionar_usuarios,
          preset.asignar_cursos,
          preset.bloquear_usuarios,
          preset.ver_logs,
          preset.eliminar_usuarios,
        ],
      )
    }

  } catch (err) {
    console.error(err)
    if (isMissingTableError(err)) {
      supportTablesReady = false
    }
    if (usuarioId) {
      try {
        await query('DELETE FROM usuarios WHERE id = ?', [usuarioId])
      } catch (e) {
        console.error('Rollback usuario:', e)
      }
    }
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Datos duplicados (correo o cédula)' })
    }
    res.status(500).json({ error: 'Error al crear usuario' })
    return
  }

  const baseFront = resolveFrontendBase(req)
  const loginUrl = `${baseFront}/login`
  let panelUrl = `${baseFront}/admin/dashboard`
  if (rolDb === 'estudiante') panelUrl = `${baseFront}/estudiante/dashboard`
  if (rolDb === 'docente') panelUrl = `${baseFront}/docente/dashboard`

  let emailResult = { success: false, skipped: false, error: '' }
  try {
    emailResult = await sendColgoUsuarioInvitacion({
      to: mail,
      nombreCompleto: `${nombre} ${apellido}`,
      cedula: doc,
      rolEtiqueta: rolEtiqueta(rolDb),
      loginUrl,
      panelUrl,
    })
  } catch (mailErr) {
    console.error('Correo de invitación:', mailErr)
    emailResult = { success: false, skipped: false, error: mailErr instanceof Error ? mailErr.message : 'error' }
  }

  const detalle = emailResult.skipped
    ? 'SMTP no está configurado (SMTP_USER y SMTP_PASSWORD en backend/.env).'
    : emailResult.error || 'fallo SMTP'

  // Política requerida por negocio:
  // Alta de usuario SOLO si el correo de bienvenida se envía exitosamente.
  if (!emailResult.success) {
    try {
      await query('DELETE FROM usuarios WHERE id = ?', [usuarioId])
    } catch (rollbackErr) {
      console.error('Rollback usuario por fallo SMTP:', rollbackErr)
    }
    return res.status(502).json({
      error:
        'No se pudo enviar el correo de bienvenida. El usuario NO fue creado. Verifica SMTP_USER/SMTP_PASSWORD (Gmail requiere contraseña de aplicación).',
      emailDetail: detalle,
    })
  }

  res.status(201).json({
    id: usuarioId,
    email: mail,
    rol: rolDb,
    ...(rolDb === 'estudiante' ? { curso_ids: cursoIds } : {}),
    emailSent: true,
  })
  await logActividad({
    actorId: Number(req.user?.id || 0) || null,
    actorRol: String(req.user?.rol || ''),
    objetivoId: Number(usuarioId),
    accion: 'usuario_creado',
    detalle: `Creación de usuario con rol ${rolDb}`,
    ip: req.ip,
  })
})

export default router
