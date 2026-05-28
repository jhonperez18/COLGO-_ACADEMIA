import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

function resolveMysqlSsl() {
  const flag = String(process.env.DB_SSL ?? '').trim().toLowerCase();
  const host = String(process.env.DB_HOST || '').toLowerCase();
  if (flag === 'false' || flag === '0') return undefined;
  if (['1', 'true', 'yes'].includes(flag) || host.includes('aivencloud.com')) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

const mysqlSsl = resolveMysqlSsl();

/**
 * Pool de conexiones MySQL
 * - bigNumberStrings: evita BigInt en filas (JSON.stringify fallaría en res.json).
 * - dateStrings: fechas como string ISO-friendly para el front.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'colgo_db',
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_CONNECTION_LIMIT || 25),
  maxIdle: Number(process.env.DB_POOL_MAX_IDLE || 15),
  idleTimeout: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS || 60000),
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  queueLimit: 0,
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true,
  ...(mysqlSsl ? { ssl: mysqlSsl } : {}),
});

// Exportar funciones de BD
export async function query(sql, args = []) {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.query(sql, args);
    return results;
  } catch (error) {
    console.error('Error en query:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getConnection() {
  return pool.getConnection();
}

export default pool;

