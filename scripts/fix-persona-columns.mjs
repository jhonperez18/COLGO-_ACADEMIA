#!/usr/bin/env node
/** Aplica en Aiven las columnas nombre/apellido faltantes (una vez). */
import { query } from '../backend/db.js'

const addCol = async (table, name, def) => {
  const exists = await query(
    `SELECT 1 AS ok FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, name],
  )
  if (Array.isArray(exists) && exists.length > 0) {
    console.log(`skip ${table}.${name}`)
    return
  }
  await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${def}`)
  console.log(`added ${table}.${name}`)
}

await addCol('estudiantes', 'nombre', 'VARCHAR(100) NULL')
await addCol('estudiantes', 'apellido', 'VARCHAR(100) NULL')
await addCol('docentes', 'nombre', 'VARCHAR(100) NULL')
await addCol('docentes', 'apellido', 'VARCHAR(100) NULL')

await query(
  `UPDATE estudiantes e
   INNER JOIN usuarios u ON u.id = e.usuario_id
   SET e.nombre = COALESCE(NULLIF(TRIM(e.nombre), ''), SUBSTRING_INDEX(u.email, '@', 1)),
       e.apellido = COALESCE(NULLIF(TRIM(e.apellido), ''), '—')
   WHERE e.nombre IS NULL OR TRIM(e.nombre) = '' OR e.apellido IS NULL OR TRIM(e.apellido) = ''`,
)
await query(
  `UPDATE docentes d
   INNER JOIN usuarios u ON u.id = d.usuario_id
   SET d.nombre = COALESCE(NULLIF(TRIM(d.nombre), ''), SUBSTRING_INDEX(u.email, '@', 1)),
       d.apellido = COALESCE(NULLIF(TRIM(d.apellido), ''), '—')
   WHERE d.nombre IS NULL OR TRIM(d.nombre) = '' OR d.apellido IS NULL OR TRIM(d.apellido) = ''`,
)

const det = await query(
  `SELECT COALESCE(e.nombre, '') AS n FROM usuarios u
   LEFT JOIN estudiantes e ON e.usuario_id = u.id WHERE u.id = 4`,
)
console.log('test user 4 nombre:', det[0]?.n)
console.log('done')
