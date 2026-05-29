import { query } from './db.js'
import bcrypt from 'bcryptjs'

let schemaRuntimeReady = false

/** Migraciones ligeras al arrancar (columnas que el DDL histórico podría no tener). */
export async function ensureSchemaRuntime() {
  if (schemaRuntimeReady) return
  try {
    const rows = await query(
      `SELECT DATA_TYPE AS dt
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'usuarios'
         AND COLUMN_NAME = 'foto_url'
       LIMIT 1`,
    )
    if (!Array.isArray(rows) || rows.length === 0) {
      await query('ALTER TABLE usuarios ADD COLUMN foto_url MEDIUMTEXT NULL')
    } else {
      const dt = String(rows[0].dt ?? rows[0].DATA_TYPE ?? '').toLowerCase()
      if (dt === 'varchar') {
        await query('ALTER TABLE usuarios MODIFY COLUMN foto_url MEDIUMTEXT NULL')
      }
    }
  } catch (e) {
    console.warn('[schemaRuntime] usuarios.foto_url:', e?.code || e?.message || e)
  }

  try {
    const bootstrapEmail = String(
      process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_BOOTSTRAP_EMAIL || 'mario@colgo.edu',
    )
      .trim()
      .toLowerCase()
    const bootstrapPassword = String(
      process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD || '123',
    ).trim()
    if (bootstrapEmail && bootstrapPassword) {
      const existing = await query('SELECT id, password_hash, rol FROM usuarios WHERE LOWER(email) = ? LIMIT 1', [
        bootstrapEmail,
      ])
      if (!Array.isArray(existing) || existing.length === 0) {
        const hash = bcrypt.hashSync(bootstrapPassword, 10)
        await query(
          `INSERT INTO usuarios (email, password_hash, rol, activo, cambiar_password)
           VALUES (?, ?, 'admin', 1, 0)`,
          [bootstrapEmail, hash],
        )
        console.log(`[schemaRuntime] Admin bootstrap creado: ${bootstrapEmail}`)
      } else {
        await repairBootstrapAdminPassword(existing[0], bootstrapEmail, bootstrapPassword)
      }
    }
  } catch (e) {
    console.warn('[schemaRuntime] bootstrap admin:', e?.code || e?.message || e)
  }

  try {
    const colRows = await query(
      `SELECT 1 AS ok FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'ultimo_acceso'
       LIMIT 1`,
    )
    if (!Array.isArray(colRows) || colRows.length === 0) {
      await query('ALTER TABLE usuarios ADD COLUMN ultimo_acceso DATETIME NULL')
    }
  } catch (e) {
    console.warn('[schemaRuntime] usuarios.ultimo_acceso:', e?.code || e?.message || e)
  }

  schemaRuntimeReady = true
}

async function repairBootstrapAdminPassword(row, email, plainPassword) {
  const hash = row?.password_hash == null ? '' : String(row.password_hash)
  let passwordOk = false
  if (hash.startsWith('$2')) {
    try {
      passwordOk = await bcrypt.compare(plainPassword, hash)
    } catch {
      passwordOk = false
    }
  }
  if (passwordOk) return
  const newHash = bcrypt.hashSync(plainPassword, 10)
  await query(
    `UPDATE usuarios SET password_hash = ?, rol = 'admin', activo = 1, cambiar_password = 0 WHERE id = ?`,
    [newHash, row.id],
  )
  console.log(`[schemaRuntime] Contraseña admin reparada: ${email}`)
}
