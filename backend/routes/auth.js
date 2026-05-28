import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { validateLogin, handleValidationErrors } from '../utils/validators.js';
import { authenticateJWT, authorizeRole } from '../middleware/auth.js';
import { handleMePerfilGet, handleMePerfilPut } from './usuarios.js';

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
async function ensureAuthSecurityTables() {
  if (authTablesReady) return;
  await ensureUltimoAccesoColumn();
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
  authTablesReady = true;
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
    await ensureAuthSecurityTables();
    const { email, password } = req.body;

    // Buscar usuario por email O por username (parte antes del @)
    // Si el input no tiene @, busca usuarios cuyo email comience con ese username
    let usuarios;
    const ident = email.trim();
    if (ident.includes('@')) {
      usuarios = await query('SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?)', [ident]);
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
          usuarios = await query(sqlDoc, argsDoc);
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
          usuarios = [];
        }
      }
      if (!usuarios?.length) {
        usuarios = await query('SELECT * FROM usuarios WHERE LOWER(email) LIKE LOWER(?) OR LOWER(email) = LOWER(?)', [
          `${ident}@%`,
          ident,
        ]);
      }
    }
    
    if (usuarios.length === 0) {
      await logAuthActivity({
        accion: 'login_failed',
        detalle: `Intento fallido para identificador ${String(email || '').trim()}`,
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];
    const nombrePanel = await resolveNombrePanel(usuario);

    // Verificar que el usuario esté activo
    if (!usuario.activo) {
      await logAuthActivity({
        objetivoId: Number(usuario.id),
        accion: 'login_blocked_user',
        detalle: 'Intento de acceso de usuario inactivo',
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    // Comparar contraseña
    const passwordValid = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValid) {
      await logAuthActivity({
        objetivoId: Number(usuario.id),
        accion: 'login_failed',
        detalle: 'Contraseña inválida',
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    await query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [usuario.id]);
    await logAuthActivity({
      actorId: Number(usuario.id),
      actorRol: String(usuario.rol || ''),
      objetivoId: Number(usuario.id),
      accion: 'login_success',
      detalle: 'Inicio de sesión exitoso',
      ip: req.ip,
    });

    // Generar token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol
      },
      process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_aqui',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Retornar token y datos del usuario (sin foto: se carga bajo demanda)
    res.json({
      success: true,
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        cambiar_password: usuario.cambiar_password,
        nombre_panel: nombrePanel,
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
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
    const usuarios = await query('SELECT id, email, rol, activo, cambiar_password FROM usuarios WHERE id = ?', [decoded.id]);
    
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ success: true, usuario: usuarios[0] });
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
    const usuarios = await query('SELECT id, password_hash, cambiar_password FROM usuarios WHERE id = ?', [decoded.id]);
    if (!usuarios.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];
    // Flujo normal: exige contraseña actual.
    // Primer login: si cambiar_password=true, permite definir nueva contraseña sin pedir la actual.
    const requiereCambioInicial = Boolean(usuario.cambiar_password);
    if (!requiereCambioInicial) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'currentPassword es obligatorio' });
      }
      const ok = await bcrypt.compare(String(currentPassword), usuario.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'La contraseña actual no es correcta' });
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

