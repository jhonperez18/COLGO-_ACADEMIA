import { query } from '../db.js'

const MAX_FOTO_CHARS = 800000

async function ensureMysqlColumns(tableName, cols) {
  for (const [name, def] of cols) {
    try {
      const existsRows = await query(
        `SELECT 1 AS ok FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND LOWER(COLUMN_NAME) = LOWER(?) LIMIT 1`,
        [tableName, name],
      )
      if (!Array.isArray(existsRows) || existsRows.length === 0) {
        await query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${name}\` ${def}`)
      }
    } catch (e) {
      if (e?.errno === 1060 || e?.code === 'ER_DUP_FIELDNAME') continue
      throw e
    }
  }
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key)
}

function trimOrNull(value) {
  const v = String(value ?? '').trim()
  return v || null
}

export async function ensureDocenteProfileSchema() {
  await ensureMysqlColumns('docentes', [
    ['nombre', 'VARCHAR(100) NULL'],
    ['apellido', 'VARCHAR(100) NULL'],
    ['documento', 'VARCHAR(20) NULL'],
    ['telefono', 'VARCHAR(20) NULL'],
    ['especialidad', 'VARCHAR(100) NULL'],
  ])
}

export async function ensureEstudianteProfileSchema() {
  await ensureMysqlColumns('estudiantes', [
    ['nombre', 'VARCHAR(100) NULL'],
    ['apellido', 'VARCHAR(100) NULL'],
    ['documento', 'VARCHAR(20) NULL'],
    ['tipo_documento', 'VARCHAR(32) NULL'],
    ['telefono', 'VARCHAR(20) NULL'],
    ['direccion', 'VARCHAR(255) NULL'],
    ['ciudad', 'VARCHAR(255) NULL'],
    ['fecha_nacimiento', 'DATE NULL'],
    ['estado_civil', 'VARCHAR(50) NULL'],
    ['pais', 'VARCHAR(120) NULL'],
    ['departamento', 'VARCHAR(120) NULL'],
    ['municipio', 'VARCHAR(180) NULL'],
  ])
}

export async function ensureDocenteRowForUsuario(usuarioId, seed = {}) {
  await ensureDocenteProfileSchema()
  const rows = await query('SELECT id FROM docentes WHERE usuario_id = ? LIMIT 1', [usuarioId])
  if (Array.isArray(rows) && rows.length > 0) return Number(rows[0].id)
  const result = await query(
    `INSERT INTO docentes (usuario_id, nombre, apellido, documento)
     VALUES (?, ?, ?, ?)`,
    [
      usuarioId,
      trimOrNull(seed.nombre) || '—',
      trimOrNull(seed.apellido) || '—',
      trimOrNull(seed.documento),
    ],
  )
  return Number(result?.insertId || 0)
}

export async function ensureEstudianteRowForUsuario(usuarioId, seed = {}) {
  await ensureEstudianteProfileSchema()
  const rows = await query('SELECT id FROM estudiantes WHERE usuario_id = ? LIMIT 1', [usuarioId])
  if (Array.isArray(rows) && rows.length > 0) return Number(rows[0].id)
  const result = await query(
    `INSERT INTO estudiantes (usuario_id, nombre, apellido, documento)
     VALUES (?, ?, ?, ?)`,
    [
      usuarioId,
      trimOrNull(seed.nombre) || '—',
      trimOrNull(seed.apellido) || '—',
      trimOrNull(seed.documento),
    ],
  )
  return Number(result?.insertId || 0)
}

async function readFotoUrl(usuarioId) {
  const uRows = await query('SELECT foto_url FROM usuarios WHERE id = ? LIMIT 1', [usuarioId])
  if (!Array.isArray(uRows) || !uRows[0] || uRows[0].foto_url == null || uRows[0].foto_url === '') {
    return null
  }
  const fv = uRows[0].foto_url
  return Buffer.isBuffer(fv) ? fv.toString('utf8') : String(fv)
}

async function writeFotoUrl(usuarioId, foto_url) {
  if (!hasOwn({ foto_url }, 'foto_url')) return
  const raw = foto_url == null || foto_url === '' ? null : String(foto_url)
  if (raw && raw.length > MAX_FOTO_CHARS) {
    const err = new Error('La foto es demasiado grande. Usa una imagen más pequeña (por ejemplo menos de 1,5 MB).')
    err.status = 400
    throw err
  }
  await query('UPDATE usuarios SET foto_url = ? WHERE id = ?', [raw, usuarioId])
}

/**
 * Actualiza docentes + foto en usuarios. Misma fuente que el panel admin (/api/usuarios/:id).
 */
export async function syncDocentePerfilFromSelfService(usuarioId, raw = {}) {
  await ensureDocenteRowForUsuario(usuarioId, {
    nombre: raw.nombre ?? raw.nombres,
    apellido: raw.apellido ?? raw.apellidos,
    documento: raw.documento ?? raw.cedula,
  })

  const updateFields = []
  const args = []
  const pushField = (column, value) => {
    updateFields.push(`\`${column}\` = ?`)
    args.push(value)
  }

  if (hasOwn(raw, 'nombre') || hasOwn(raw, 'nombres')) {
    pushField('nombre', trimOrNull(raw.nombre ?? raw.nombres))
  }
  if (hasOwn(raw, 'apellido') || hasOwn(raw, 'apellidos')) {
    pushField('apellido', trimOrNull(raw.apellido ?? raw.apellidos))
  }
  if (hasOwn(raw, 'documento') || hasOwn(raw, 'cedula')) {
    pushField('documento', trimOrNull(raw.documento ?? raw.cedula))
  }
  if (hasOwn(raw, 'telefono')) pushField('telefono', trimOrNull(raw.telefono))
  if (hasOwn(raw, 'especialidad')) pushField('especialidad', trimOrNull(raw.especialidad))

  if (updateFields.length > 0) {
    await query(`UPDATE docentes SET ${updateFields.join(', ')} WHERE usuario_id = ?`, [...args, usuarioId])
  }

  if (hasOwn(raw, 'foto_url')) {
    await writeFotoUrl(usuarioId, raw.foto_url)
  }

  const rows = await query(
    `SELECT id, usuario_id, nombre, apellido, documento, telefono, especialidad
     FROM docentes WHERE usuario_id = ? LIMIT 1`,
    [usuarioId],
  )
  const perfil = Array.isArray(rows) && rows[0] ? rows[0] : null
  const foto_url = await readFotoUrl(usuarioId)
  return perfil ? { ...perfil, foto_url } : null
}

function normalizeMysqlDateInput(value) {
  const v = String(value ?? '').trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return null
}

/**
 * Actualiza estudiantes + foto. Misma fuente que el panel admin.
 */
export async function syncEstudiantePerfilFromSelfService(usuarioId, raw = {}) {
  await ensureEstudianteRowForUsuario(usuarioId, {
    nombre: raw.nombre ?? raw.nombres,
    apellido: raw.apellido ?? raw.apellidos,
    documento: raw.documento ?? raw.cedula,
  })

  const updateFields = []
  const args = []
  const pushField = (column, value) => {
    updateFields.push(`\`${column}\` = ?`)
    args.push(value)
  }

  if (hasOwn(raw, 'nombre') || hasOwn(raw, 'nombres')) {
    pushField('nombre', trimOrNull(raw.nombre ?? raw.nombres))
  }
  if (hasOwn(raw, 'apellido') || hasOwn(raw, 'apellidos')) {
    pushField('apellido', trimOrNull(raw.apellido ?? raw.apellidos))
  }
  if (hasOwn(raw, 'documento') || hasOwn(raw, 'cedula')) {
    pushField('documento', trimOrNull(raw.documento ?? raw.cedula))
  }
  if (hasOwn(raw, 'tipo_documento')) pushField('tipo_documento', trimOrNull(raw.tipo_documento))
  if (hasOwn(raw, 'telefono')) pushField('telefono', trimOrNull(raw.telefono))
  if (hasOwn(raw, 'direccion')) pushField('direccion', trimOrNull(raw.direccion))
  if (hasOwn(raw, 'ciudad')) pushField('ciudad', trimOrNull(raw.ciudad))
  if (hasOwn(raw, 'pais')) pushField('pais', trimOrNull(raw.pais))
  if (hasOwn(raw, 'departamento')) pushField('departamento', trimOrNull(raw.departamento))
  if (hasOwn(raw, 'municipio')) pushField('municipio', trimOrNull(raw.municipio))
  if (hasOwn(raw, 'fecha_nacimiento')) {
    pushField('fecha_nacimiento', normalizeMysqlDateInput(raw.fecha_nacimiento))
  }
  if (hasOwn(raw, 'estado_civil')) pushField('estado_civil', trimOrNull(raw.estado_civil))

  if (updateFields.length > 0) {
    await query(`UPDATE estudiantes SET ${updateFields.join(', ')} WHERE usuario_id = ?`, [...args, usuarioId])
  }

  if (hasOwn(raw, 'foto_url')) {
    await writeFotoUrl(usuarioId, raw.foto_url)
  }

  const rows = await query(
    `SELECT id, usuario_id, nombre, apellido, documento, tipo_documento, telefono,
            direccion, ciudad, pais, departamento, municipio, fecha_nacimiento, estado_civil
     FROM estudiantes WHERE usuario_id = ? LIMIT 1`,
    [usuarioId],
  )
  const perfil = Array.isArray(rows) && rows[0] ? rows[0] : null
  const foto_url = await readFotoUrl(usuarioId)
  return perfil ? { ...perfil, foto_url } : null
}
