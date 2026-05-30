import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { validateLogin, handleValidationErrors } from '../utils/validators.js';
import { authenticateJWT, authorizeRole } from '../middleware/auth.js';
import { handleMePerfilGet, handleMePerfilPut } from './usuarios.js';
import {
  ensureEstadoAccesoColumn,
  mensajeAccesoDenegado,
  puedeAccederPanel,
  resolveEstadoAccesoFromRow,
} from '../utils/estadoAcceso.js';

const router = express.Router();

let authTablesReady = false;

async function ensureUltimoAccesoColumn() {
  const existsRows = await query(
    `SELECT 1 AS ok
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'usuarios'
       AND COLUMN_NAME = 'ultimo_acceso'
     LIMIT 1`,
  );
  if (!Array.isArray(existsRows) || existsRows.length === 0) {
    await query('ALTER TABLE usuarios ADD COLUMN ultimo_acceso DATETIME NULL');
  }
}

export async function initAuthInfrastructure() {
  if (authTablesReady) return;
  try {
    await ensureUltimoAccesoColumn();
  } catch (e) {
    console.warn('[auth] ultimo_acceso:', e?.code || e?.message || e);
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
        INDEX idx_actividad_objetivo (objetivo_usuario_id, fecha)
      )
    `);
  } catch (e) {
    console.warn('[auth] actividad_usuarios:', e?.code || e?.message || e);
  }
  authTablesReady = true;
}

async function ensureAuthSecurityTables() {
  if (authTablesReady) return;
  await initAuthInfrastructure();
}

async function logAuthActivity({ actorId = null, actorRol = null, objetivoId = null, accion, detalle = null, ip = null }) {
  try {
    await ensureAuthSecurityTables();
    await query(
      'INSERT INTO actividad_usuarios (actor_usuario_id, actor_rol, objetivo_usuario_id, accion, detalle, ip_origen) VALUES (?, ?, ?, ?, ?, ?)',
      [actorId, actorRol, objetivoId, accion, detalle, ip],
    );
  } catch (error) {
    console.error('Error registrando actividad auth:', error);
  }
}

function isMissingTableError(error) {
  return error?.code === 'ER_NO_SUCH_TABLE';
}

async function resolveNombrePanel(usuario) {
  try {
    if (usuario.rol === 'estudiante') {
      const rows = await query('SELECT nombre, apellido FROM estudiantes WHERE usuario_id = ? LIMIT 1', [usuario.id]);
      if (rows.length > 0) return `${rows[0].nombre} ${rows[0].apellido}`.trim();
    }
    if (usuario.rol === 'docente') {
      const rows = await query('SELECT nombre, apellido FROM docentes WHERE usuario_id = ? LIMIT 1', [usuario.id]);
      if (rows.length > 0) return `${rows[0].nombre} ${rows[0].apellido}`.trim();
    }
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error('Error resolviendo nombre de panel:', error);
    }
  }

  const base = String(usuario.email || '').split('@')[0];
  return base || 'Usuario';
}

/**
 * POST /api/auth/login
 * Autenticar usuario con email y contraseña
 */
router.post('/login', validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ident = String(email || '').trim();
    const passwordRaw = String(password ?? '');

    if (!ident || !passwordRaw) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    let usuarios;
    if (ident.includes('@')) {
      usuarios = await query('SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1', [ident]);
    } else {
      const soloDigitos = ident.replace(/\D/g, '');
      try {
        let sqlEst = `SELECT u.* FROM usuarios u
          INNER JOIN estudiantes e ON e.usuario_id = u.id
          WHERE e.documento = ?`;
        const argsEst = [ident];
        if (soloDigitos.length >= 4) {
          sqlEst += ` OR REPLACE(REPLACE(TRIM(e.documento), '.', ''), '-', '') = ?`;
          argsEst.push(soloDigitos);
        }
        sqlEst += ' LIMIT 1';
        usuarios = await query(sqlEst, argsEst);
      } catch (error) {
        if (!isMissingTableError(error)) throw error;
        usuarios = [];
      }

      if (!usuarios?.length) {
        try {
          let sqlDoc = `SELECT u.* FROM usuarios u
            INNER JOIN docentes d ON d.usuario_id = u.id
            WHERE d.documento = ?`;
          const argsDoc = [ident];
          if (soloDigitos.length >= 4) {
            sqlDoc += ` OR REPLACE(REPLACE(TRIM(d.documento), '.', ''), '-', '') = ?`;
            argsDoc.push(soloDigitos);
          }
          sqlDoc += ' LIMIT 1';
          usuarios = await query(sqlDoc, argsDoc);
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
          usuarios = [];
        }
      }
      if (!usuarios?.length) {
        try {
          let sqlEstU = `SELECT u.* FROM usuarios u
            INNER JOIN estudiantes e ON e.usuario_id = u.id
            WHERE e.usuario = ?`;
          const argsEstU = [ident];
          if (soloDigitos.length >= 4) {
            sqlEstU += ` OR REPLACE(REPLACE(TRIM(e.usuario), '.', ''), '-', '') = ?`;
            argsEstU.push(soloDigitos);
          }
          sqlEstU += ' LIMIT 1';
          usuarios = await query(sqlEstU, argsEstU);
        } catch (error) {
          if (!isMissingTableError(error) && error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
          usuarios = [];
        }
      }
      if (!usuarios?.length) {
        try {
          let sqlDocU = `SELECT u.* FROM usuarios u
            INNER JOIN docentes d ON d.usuario_id = u.id
            WHERE d.usuario = ?`;
          const argsDocU = [ident];
          if (soloDigitos.length >= 4) {
            sqlDocU += ` OR REPLACE(REPLACE(TRIM(d.usuario), '.', ''), '-', '') = ?`;
            argsDocU.push(soloDigitos);
          }
          sqlDocU += ' LIMIT 1';
          usuarios = await query(sqlDocU, argsDocU);
        } catch (error) {
          if (!isMissingTableError(error) && error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
          usuarios = [];
        }
      }
      if (!usuarios?.length) {
        try {
          let sqlStaff = `SELECT u.* FROM usuarios u
            INNER JOIN staff_perfiles sp ON sp.usuario_id = u.id
            WHERE sp.documento = ?`;
          const argsStaff = [ident];
          if (soloDigitos.length >= 4) {
            sqlStaff += ` OR REPLACE(REPLACE(TRIM(sp.documento), '.', ''), '-', '') = ?`;
            argsStaff.push(soloDigitos);
          }
          sqlStaff += ' LIMIT 1';
          usuarios = await query(sqlStaff, argsStaff);
        } catch (error) {
          if (!isMissingTableError(error) && error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
          usuarios = [];
        }
      }
      if (!usuarios?.length) {
        usuarios = await query(
          'SELECT * FROM usuarios WHERE LOWER(email) LIKE LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
          [`${ident}@%`, ident],
        );
      }
    }

    if (!usuarios?.length) {
      void logAuthActivity({
        accion: 'login_failed',
        detalle: `Intento fallido para identificador ${ident}`,
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];
    const nombrePanel = await resolveNombrePanel(usuario);

    await ensureEstadoAccesoColumn();
    const estadoAcceso = resolveEstadoAccesoFromRow(usuario);
    if (!puedeAccederPanel(estadoAcceso)) {
      void logAuthActivity({
        objetivoId: Number(usuario.id),
        accion: 'login_blocked_user',
        detalle: `Intento de acceso con estado ${estadoAcceso}`,
        ip: req.ip,
      });
      return res.status(403).json({
        error: mensajeAccesoDenegado(estadoAcceso),
        estado_acceso: estadoAcceso,
      });
    }

    if (!usuario.password_hash) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const hashStr = Buffer.isBuffer(usuario.password_hash)
      ? usuario.password_hash.toString('utf8')
      : String(usuario.password_hash);

    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(passwordRaw, hashStr);
    } catch (compareErr) {
      console.warn('[auth/login] bcrypt compare:', compareErr?.message || compareErr);
      passwordValid = false;
    }

    if (!passwordValid) {
      void logAuthActivity({
        objetivoId: Number(usuario.id),
        accion: 'login_failed',
        detalle: 'Contraseña inválida',
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    try {
      await query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [usuario.id]);
    } catch (updateErr) {
      console.warn('[auth/login] ultimo_acceso:', updateErr?.code || updateErr?.message || updateErr);
    }
    void logAuthActivity({
      actorId: Number(usuario.id),
      actorRol: String(usuario.rol || ''),
      objetivoId: Number(usuario.id),
      accion: 'login_success',
      detalle: 'Inicio de sesión exitoso',
      ip: req.ip,
    });

    const secret = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_aqui';
    const expiresIn = String(process.env.JWT_EXPIRES_IN || '7d').trim() || '7d';
    const payload = {
      id: Number(usuario.id),
      email: String(usuario.email || ''),
      rol: String(usuario.rol || ''),
    };
    let token;
    try {
      token = jwt.sign(payload, secret, { expiresIn });
    } catch (signErr) {
      console.warn('[auth/login] jwt.sign:', signErr?.message || signErr);
      token = jwt.sign(payload, secret, { expiresIn: '7d' });
    }

    // Retornar token y datos del usuario (sin foto: se carga bajo demanda)
    res.json({
      success: true,
      token,
      usuario: {
        id: payload.id,
        email: payload.email,
        rol: payload.rol,
        cambiar_password: Boolean(usuario.cambiar_password),
        nombre_panel: nombrePanel,
      }
    });
  } catch (error) {
    console.error('Error en login:', error?.code, error?.message || error);
    const dbCodes = new Set([
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'PROTOCOL_CONNECTION_LOST',
      'ER_ACCESS_DENIED_ERROR',
      'ER_BAD_DB_ERROR',
    ]);
    if (error?.code && dbCodes.has(String(error.code))) {
      return res.status(503).json({
        error: 'Base de datos no disponible. Espera unos segundos e intenta de nuevo.',
      });
    }
    return res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/**
 * POST /api/auth/register
 * Registrar usuario (solo para estudiantes autoadministrados)
 */
router.post('/register', [
  validateLogin[0], // email
  validateLogin[1], // password (lo usamos como base)
], handleValidationErrors, async (req, res) => {
  try {
    const { nombre, apellido, email, password } = req.body;

    // Validaciones adicionales
    if (!nombre || !apellido) {
      return res.status(400).json({ error: 'Nombre y apellido requeridos' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Contraseña debe tener mínimo 8 caracteres' });
    }

    // Verificar que el email no exista
    const usuariosExistentes = await query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (usuariosExistentes.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario
    const resultado = await query(
      'INSERT INTO usuarios (email, password_hash, rol, activo) VALUES (?, ?, ?, ?)',
      [email, passwordHash, 'estudiante', true]
    );

    const usuarioId = resultado.insertId;

    // Crear perfil de estudiante
    await query(
      'INSERT INTO estudiantes (usuario_id, nombre, apellido) VALUES (?, ?, ?)',
      [usuarioId, nombre, apellido]
    );

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Ahora puedes iniciar sesión'
    });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ error: 'Error al registrarse' });
  }
});

/**
 * POST /api/auth/refresh-token
 * Renovar token JWT
 */
router.post('/refresh-token', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_aqui';
    const decoded = jwt.decode(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const nuevoToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        rol: decoded.rol
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ success: true, token: nuevoToken });
  } catch (error) {
    res.status(500).json({ error: 'Error al renovar token' });
  }
});

/**
 * GET /api/auth/me/perfil — perfil extendido staff/admin (evita 404 en sub-router de usuarios).
 */
router.get('/me/perfil', authenticateJWT, authorizeRole('admin', 'staff'), handleMePerfilGet);

/**
 * PUT /api/auth/me/perfil
 */
router.put('/me/perfil', authenticateJWT, authorizeRole('admin', 'staff'), handleMePerfilPut);

/**
 * GET /api/auth/me
 * Obtener datos del usuario autenticado
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const secret = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_aqui';
    const decoded = jwt.verify(token, secret);

    // Buscar usuario completo
    const usuarios = await query(
      'SELECT id, email, rol, activo, estado_acceso, cambiar_password FROM usuarios WHERE id = ?',
      [decoded.id],
    );
    
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const row = usuarios[0];
    await ensureEstadoAccesoColumn();
    const estadoAcceso = resolveEstadoAccesoFromRow(row);
    if (!puedeAccederPanel(estadoAcceso)) {
      return res.status(403).json({
        error: mensajeAccesoDenegado(estadoAcceso),
        estado_acceso: estadoAcceso,
      });
    }

    res.json({
      success: true,
      usuario: { ...row, estado_acceso: estadoAcceso, activo: estadoAcceso === 'activo' },
    });
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(401).json({ error: 'No autorizado' });
  }
});

/**
 * POST /api/auth/change-password
 * Cambiar contraseña del usuario autenticado
 */
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword) {
      return res.status(400).json({ error: 'newPassword es obligatorio' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener mínimo 8 caracteres' });
    }

    const secret = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_aqui';
    const decoded = jwt.verify(token, secret);
    const usuarios = await query(
      'SELECT id, password_hash, cambiar_password, activo, estado_acceso FROM usuarios WHERE id = ?',
      [decoded.id],
    );
    if (!usuarios.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];
    await ensureEstadoAccesoColumn();
    const estadoAcceso = resolveEstadoAccesoFromRow(usuario);
    if (!puedeAccederPanel(estadoAcceso)) {
      return res.status(403).json({
        error: mensajeAccesoDenegado(estadoAcceso),
        estado_acceso: estadoAcceso,
      });
    }
    // Flujo normal: exige contraseña actual.
    // Primer login: si cambiar_password=true, permite definir nueva contraseña sin pedir la actual.
    const requiereCambioInicial = Boolean(usuario.cambiar_password);
    if (!requiereCambioInicial) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'currentPassword es obligatorio' });
      }
      const ok = await bcrypt.compare(String(currentPassword), usuario.password_hash);
      if (!ok) {
        return res.status(400).json({ error: 'La contraseña actual no es correcta' });
      }
    }

    const newHash = await bcrypt.hash(String(newPassword), 10);
    await query(
      'UPDATE usuarios SET password_hash = ?, cambiar_password = ? WHERE id = ?',
      [newHash, false, decoded.id],
    );

    return res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en change-password:', error);
    return res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
  }
});

export default router;

