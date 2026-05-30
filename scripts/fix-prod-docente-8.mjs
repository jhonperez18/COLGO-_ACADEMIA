import dotenv from 'dotenv'
import { existsSync } from 'fs'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

if (existsSync('.env.production')) dotenv.config({ path: '.env.production' })

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  ssl: { rejectUnauthorized: false },
})

const email = 'jhonefe18@yahoo.es'
const cedula = '12345678'
const nombres = 'sara'
const apellidos = 'López'

const [users] = await pool.query('SELECT id FROM usuarios WHERE LOWER(email)=LOWER(?) LIMIT 1', [email])
const uid = users[0]?.id
if (!uid) {
  console.error('Usuario no encontrado')
  process.exit(1)
}

const hash = await bcrypt.hash(cedula, 10)
await pool.query('UPDATE usuarios SET password_hash=?, rol=?, activo=1, cambiar_password=1 WHERE id=?', [
  hash,
  'docente',
  uid,
])

const [drows] = await pool.query('SELECT id FROM docentes WHERE usuario_id=? LIMIT 1', [uid])
if (!drows.length) {
  try {
    await pool.query(
      'INSERT INTO docentes (usuario_id, nombre, apellido, documento, usuario) VALUES (?, ?, ?, ?, ?)',
      [uid, nombres, apellidos, cedula, cedula],
    )
  } catch (e) {
    await pool.query('INSERT INTO docentes (usuario_id, nombre, apellido, documento) VALUES (?, ?, ?, ?)', [
      uid,
      nombres,
      apellidos,
      cedula,
    ])
  }
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
    /* optional */
  }
}

console.log('OK usuario', uid, 'cedula', cedula)
await pool.end()
