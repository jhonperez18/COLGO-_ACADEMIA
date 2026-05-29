import jwt from 'jsonwebtoken';

/**
 * Middleware de autenticación JWT
 * Verifica que el usuario tenga un token válido
 */
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const secret = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_aqui';

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      console.error('Error al verificar token:', err.message);
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    req.user = user;
    next();
  });
}

/**
 * Middleware para verificar rol
 */
export function authorizeRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este recurso' });
    }

    next();
  };
}

/**
 * Middleware para log de auditoría
 */
export function logAuditoria(accion, tabla) {
  return async (req, res, next) => {
    // Grabar en auditoría después de procesar la request
    res.on('finish', async () => {
      try {
        if (req.user && res.statusCode < 400) {
          const { query } = await import('../db.js');
          await query(
            'INSERT INTO auditoria (usuario_id, accion, tabla_afectada) VALUES (?, ?, ?)',
            [req.user.id, accion, tabla]
          );
        }
      } catch (error) {
        console.error('Error en auditoría:', error);
      }
    });
    next();
  };
}
