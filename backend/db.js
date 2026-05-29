import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.production') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

function resolveMysqlSsl(host) {
  const flag = String(process.env.DB_SSL ?? '').trim().toLowerCase();
  const h = String(host || process.env.DB_HOST || '').toLowerCase();
  if (flag === 'false' || flag === '0') return undefined;
  if (['1', 'true', 'yes'].includes(flag) || h.includes('aivencloud.com')) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function poolConfigFromEnv() {
  const rawUrl = String(process.env.DATABASE_URL || process.env.MYSQL_URL || '').trim();
  if (rawUrl) {
    try {
      const u = new URL(rawUrl.replace(/^mysql:\/\//, 'http://'));
      const host = u.hostname;
      return {
        host,
        port: Number(u.port || 3306),
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: u.pathname.replace(/^\//, '') || 'defaultdb',
        ssl: resolveMysqlSsl(host),
      };
    } catch (e) {
      console.warn('[db] DATABASE_URL inválida:', e?.message || e);
    }
  }

  const host = process.env.DB_HOST || 'localhost';
  return {
    host,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'colgo_db',
    port: Number(process.env.DB_PORT || 3306),
    ssl: resolveMysqlSsl(host),
  };
}

const base = poolConfigFromEnv();

const pool = mysql.createPool({
  ...base,
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
});

export async function query(sql, args = []) {
  try {
    const [results] = await pool.query(sql, args);
    return results;
  } catch (error) {
    console.error('Error en query:', error?.code || error?.message || error);
    throw error;
  }
}

export async function getConnection() {
  return pool.getConnection();
}

export default pool;
