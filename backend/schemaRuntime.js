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
      const existing = await query('SELECT id FROM usuarios WHERE LOWER(email) = ? LIMIT 1', [
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
      }
    }
  } catch (e) {
    console.warn('[schemaRuntime] bootstrap admin:', e?.code || e?.message || e)
  }

  schemaRuntimeReady = true
}
