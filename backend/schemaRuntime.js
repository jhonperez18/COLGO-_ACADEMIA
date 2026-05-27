import { query } from './db.js'

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
  schemaRuntimeReady = true
}
