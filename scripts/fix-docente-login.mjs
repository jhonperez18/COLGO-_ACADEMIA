import dotenv from 'dotenv'
import { existsSync } from 'fs'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

for (const f of ['.env', '.env.production']) {
  if (existsSync(f)) dotenv.config({ path: f })
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  ssl: { rejectUnauthorized: false },
})

const [users] = await pool.query('SELECT id, email, rol, activo FROM usuarios ORDER BY id')
console.log('usuarios:', users)

const [docs] = await pool.query(
  'SELECT id, usuario_id, nombre, apellido, documento FROM docentes ORDER BY id',
)
console.log('docentes:', docs)

async function fixUser(email, cedula, nombres, apellidos) {
  const [urows] = await pool.query('SELECT id FROM usuarios WHERE LOWER(email)=LOWER(?) LIMIT 1', [email])
  let uid = urows[0]?.id
  const hash = await bcrypt.hash(cedula, 10)
  if (!uid) {
    const [ins] = await pool.query(
      'INSERT INTO usuarios (email, password_hash, rol, activo, cambiar_password) VALUES (?, ?, ?, 1, 1)',
      [email, hash, 'docente'],
    )
    uid = ins.insertId
    console.log('created usuario', uid)
  } else {
    await pool.query('UPDATE usuarios SET password_hash=?, rol=?, activo=1, cambiar_password=1 WHERE id=?', [
      hash,
      'docente',
      uid,
    ])
    console.log('updated usuario', uid)
  }
  const [drows] = await pool.query('SELECT id FROM docentes WHERE usuario_id=? LIMIT 1', [uid])
  if (!drows.length) {
    try {
      await pool.query(
        'INSERT INTO docentes (usuario_id, nombre, apellido, documento, usuario) VALUES (?, ?, ?, ?, ?)',
        [uid, nombres, apellidos, cedula, cedula],
      )
    } catch (e) {
      if (e?.code === 'ER_BAD_FIELD_ERROR') {
        await pool.query('INSERT INTO docentes (usuario_id, nombre, apellido, documento) VALUES (?, ?, ?, ?)', [
          uid,
          nombres,
          apellidos,
          cedula,
        ])
      } else throw e
    }
    console.log('created docente for', uid)
  } else {
    await pool.query('UPDATE docentes SET nombre=?, apellido=?, documento=? WHERE usuario_id=?', [
      nombres,
      apellidos,
      cedula,
      uid,
    ])
    try {
      await pool.query('UPDATE docentes SET usuario=? WHERE usuario_id=?', [cedula, uid])
    } catch {
      /* columna usuario opcional */
    }
    console.log('updated docente for', uid)
  }
  return uid
}

await fixUser('jhonefe18@yahoo.es', '123', 'sara', 'López')

const ok = await bcrypt.compare(
  '123',
  (
    await pool.query('SELECT password_hash FROM usuarios WHERE LOWER(email)=LOWER(?)', ['jhonefe18@yahoo.es'])
  )[0][0].password_hash.toString(),
)
console.log('login test 123:', ok)

await pool.end()
