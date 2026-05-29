import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db.js';
import { broadcastSse } from '../realtime/sseHub.js';

const router = express.Router();

function hasRole(user, ...roles) {
  return roles.includes(String(user?.rol || ''));
}

function ensureValid(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
}

async function createNotification({ usuarioId, tipo, titulo, mensaje, entidadTipo = null, entidadId = null }) {
  await query(
    `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [usuarioId, tipo, titulo, mensaje, entidadTipo, entidadId],
  );
}

async function createAndPushNotification({ usuarioId, payload }) {
  await createNotification({
    usuarioId,
    tipo: payload.tipo,
    titulo: payload.titulo,
    mensaje: payload.mensaje,
    entidadTipo: payload.entidadTipo,
    entidadId: payload.entidadId,
  });

  broadcastSse(
    'notification_created',
    { ...payload, usuarioId, at: new Date().toISOString() },
    (user) => Number(user?.id) === Number(usuarioId),
  );
}

// ===== ADMIN =====
router.get('/admin/programas', async (req, res) => {
  if (!hasRole(req.user, 'admin')) return res.status(403).json({ error: 'No autorizado' });
  const rows = await query('SELECT * FROM programas ORDER BY fecha_creacion DESC');
  return res.json(rows);
});

router.post(
  '/admin/programas',
  [
    body('nombre').trim().notEmpty().withMessage('nombre es requerido'),
    body('codigo').trim().notEmpty().withMessage('codigo es requerido'),
  ],
  async (req, res) => {
    if (!hasRole(req.user, 'admin')) return res.status(403).json({ error: 'No autorizado' });
    if (!ensureValid(req, res)) return;

    const { nombre, codigo, descripcion } = req.body;
    const existing = await query('SELECT id FROM programas WHERE codigo = ? LIMIT 1', [codigo]);
    if (existing.length > 0) return res.status(400).json({ error: 'El codigo de programa ya existe' });

    const result = await query(
      'INSERT INTO programas (nombre, codigo, descripcion, activo) VALUES (?, ?, ?, TRUE)',
      [nombre, codigo, descripcion || null],
    );

    return res.status(201).json({ success: true, id: result.insertId });
  },
);

router.post(
  '/admin/cursos/:cursoId/modulos',
  [
    body('titulo').trim().notEmpty().withMessage('titulo es requerido'),
    body('orden').optional().isInt({ min: 1 }).withMessage('orden debe ser >= 1'),
  ],
  async (req, res) => {
    if (!hasRole(req.user, 'admin')) return res.status(403).json({ error: 'No autorizado' });
    if (!ensureValid(req, res)) return;

    const cursoId = Number(req.params.cursoId);
    const cursoRows = await query('SELECT id FROM cursos WHERE id = ? LIMIT 1', [cursoId]);
    if (cursoRows.length === 0) return res.status(404).json({ error: 'Curso no encontrado' });

    const { titulo, descripcion, orden } = req.body;
    const orderValue = Number(orden || 1);

    const result = await query(
      'INSERT INTO modulos (curso_id, titulo, descripcion, orden, activo) VALUES (?, ?, ?, ?, TRUE)',
      [cursoId, titulo, descripcion || null, orderValue],
    );

    return res.status(201).json({ success: true, id: result.insertId });
  },
);

router.put(
  '/admin/cursos/:cursoId/asignar-docente',
  [body('docente_id').isInt({ min: 1 }).withMessage('docente_id es requerido')],
  async (req, res) => {
    if (!hasRole(req.user, 'admin')) return res.status(403).json({ error: 'No autorizado' });
    if (!ensureValid(req, res)) return;

    const cursoId = Number(req.params.cursoId);
    const docenteId = Number(req.body.docente_id);

    const [cursoRows, docenteRows] = await Promise.all([
      query('SELECT id, nombre FROM cursos WHERE id = ? LIMIT 1', [cursoId]),
      query('SELECT d.id, d.nombre, d.apellido, d.usuario_id FROM docentes d WHERE d.id = ? LIMIT 1', [docenteId]),
    ]);
    if (cursoRows.length === 0) return res.status(404).json({ error: 'Curso no encontrado' });
    if (docenteRows.length === 0) return res.status(404).json({ error: 'Docente no encontrado' });

    await query('UPDATE cursos SET docente_id = ? WHERE id = ?', [docenteId, cursoId]);
    const cursoNombre = cursoRows[0].nombre;
    const docente = docenteRows[0];

    await createAndPushNotification({
      usuarioId: Number(docente.usuario_id),
      payload: {
        tipo: 'curso_asignado',
        titulo: 'Nuevo curso asignado',
        mensaje: `Has sido asignado al curso ${cursoNombre}.`,
        entidadTipo: 'curso',
        entidadId: cursoId,
      },
    });

    return res.json({ success: true, message: 'Docente asignado al curso' });
  },
);

router.post(
  '/admin/cursos/:cursoId/inscribir-estudiantes',
  [body('estudiante_ids').isArray({ min: 1 }).withMessage('estudiante_ids debe ser un arreglo con IDs')],
  async (req, res) => {
    if (!hasRole(req.user, 'admin')) return res.status(403).json({ error: 'No autorizado' });
    if (!ensureValid(req, res)) return;

    const cursoId = Number(req.params.cursoId);
    const cursoRows = await query('SELECT id, nombre FROM cursos WHERE id = ? LIMIT 1', [cursoId]);
    if (cursoRows.length === 0) return res.status(404).json({ error: 'Curso no encontrado' });

    const ids = [...new Set((req.body.estudiante_ids || []).map((x) => Number(x)).filter((x) => x > 0))];
    if (ids.length === 0) return res.status(400).json({ error: 'No hay estudiantes válidos para inscribir' });

    const placeholders = ids.map(() => '?').join(',');
    const students = await query(
      `SELECT e.id, e.usuario_id, e.nombre, e.apellido
       FROM estudiantes e
       WHERE e.id IN (${placeholders})`,
      ids,
    );

    let creadas = 0;
    for (const st of students) {
      const exists = await query(
        'SELECT id FROM matriculas WHERE estudiante_id = ? AND curso_id = ? LIMIT 1',
        [st.id, cursoId],
      );
      if (exists.length > 0) continue;

      await query(
        'INSERT INTO matriculas (estudiante_id, curso_id, estado) VALUES (?, ?, "activa")',
        [st.id, cursoId],
      );
      creadas += 1;

      await createAndPushNotification({
        usuarioId: Number(st.usuario_id),
        payload: {
          tipo: 'curso_asignado',
          titulo: 'Te inscribieron en un curso',
          mensaje: `Ahora estás inscrito en ${cursoRows[0].nombre}.`,
          entidadTipo: 'curso',
          entidadId: cursoId,
        },
      });
    }

    return res.json({ success: true, inscritas: creadas });
  },
);

// ===== DOCENTE =====
router.post(
  '/teacher/cursos/:cursoId/clases',
  [
    body('titulo').trim().notEmpty().withMessage('titulo es requerido'),
    body('fecha').isISO8601().withMessage('fecha inválida'),
    body('hora_inicio').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('hora_inicio inválida'),
    body('hora_fin').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('hora_fin inválida'),
    body('tipo').isIn(['virtual', 'presencial']).withMessage('tipo inválido'),
  ],
  async (req, res) => {
    if (!hasRole(req.user, 'docente')) return res.status(403).json({ error: 'No autorizado' });
    if (!ensureValid(req, res)) return;

    const cursoId = Number(req.params.cursoId);
    const { titulo, descripcion, fecha, hora_inicio, hora_fin, tipo, modulo_id, enlace_virtual, ubicacion } = req.body;
    if (tipo === 'virtual' && !String(enlace_virtual || '').trim()) {
      return res.status(400).json({ error: 'enlace_virtual es requerido para clases virtuales' });
    }
    if (tipo === 'presencial' && !String(ubicacion || '').trim()) {
      return res.status(400).json({ error: 'ubicacion es requerida para clases presenciales' });
    }

    const ownerRows = await query(
      `SELECT c.id, c.nombre, d.id as docente_id
       FROM cursos c
       INNER JOIN docentes d ON c.docente_id = d.id
       WHERE c.id = ? AND d.usuario_id = ?
       LIMIT 1`,
      [cursoId, req.user.id],
    );
    if (ownerRows.length === 0) return res.status(403).json({ error: 'No tienes acceso a este curso' });

    const docenteId = Number(ownerRows[0].docente_id);
    const result = await query(
      `INSERT INTO clases
      (curso_id, modulo_id, docente_id, titulo, descripcion, fecha, hora_inicio, hora_fin, tipo, enlace_virtual, ubicacion, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'programada')`,
      [
        cursoId,
        modulo_id || null,
        docenteId,
        titulo,
        descripcion || null,
        fecha,
        hora_inicio,
        hora_fin,
        tipo,
        tipo === 'virtual' ? enlace_virtual : null,
        tipo === 'presencial' ? ubicacion : null,
      ],
    );

    const students = await query(
      `SELECT u.id as usuario_id
       FROM matriculas m
       INNER JOIN estudiantes e ON m.estudiante_id = e.id
       INNER JOIN usuarios u ON u.id = e.usuario_id
       WHERE m.curso_id = ? AND m.estado = 'activa'`,
      [cursoId],
    );

    for (const st of students) {
      await createAndPushNotification({
        usuarioId: Number(st.usuario_id),
        payload: {
          tipo: 'clase_programada',
          titulo: 'Nueva clase programada',
          mensaje: `${titulo} - ${fecha} ${hora_inicio}`,
          entidadTipo: 'clase',
          entidadId: Number(result.insertId),
        },
      });
    }

    broadcastSse(
      'class_scheduled',
      {
        classId: Number(result.insertId),
        cursoId,
        tipo,
        titulo,
        fecha,
        hora_inicio,
      },
      (user) => user.rol === 'admin' || Number(user.id) === Number(req.user.id),
    );

    return res.status(201).json({ success: true, id: result.insertId });
  },
);

router.post(
  '/teacher/modulos/:moduloId/materiales',
  [body('titulo').trim().notEmpty(), body('url').trim().notEmpty()],
  async (req, res) => {
    if (!hasRole(req.user, 'docente')) return res.status(403).json({ error: 'No autorizado' });
    if (!ensureValid(req, res)) return;

    const moduloId = Number(req.params.moduloId);
    const ownerRows = await query(
      `SELECT m.id, c.id as curso_id, d.id as docente_id
       FROM modulos m
       INNER JOIN cursos c ON c.id = m.curso_id
       INNER JOIN docentes d ON d.id = c.docente_id
       WHERE m.id = ? AND d.usuario_id = ?
       LIMIT 1`,
      [moduloId, req.user.id],
    );
    if (ownerRows.length === 0) return res.status(403).json({ error: 'No tienes acceso a este módulo' });

    const { titulo, descripcion, url, tipo } = req.body;
    const result = await query(
      `INSERT INTO materiales_modulo (modulo_id, docente_id, titulo, descripcion, url, tipo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [moduloId, Number(ownerRows[0].docente_id), titulo, descripcion || null, url, tipo || 'enlace'],
    );

    const students = await query(
      `SELECT u.id as usuario_id
       FROM matriculas m
       INNER JOIN estudiantes e ON m.estudiante_id = e.id
       INNER JOIN usuarios u ON u.id = e.usuario_id
       WHERE m.curso_id = ? AND m.estado = 'activa'`,
      [Number(ownerRows[0].curso_id)],
    );
    for (const st of students) {
      await createAndPushNotification({
        usuarioId: Number(st.usuario_id),
        payload: {
          tipo: 'material_publicado',
          titulo: 'Nuevo material disponible',
          mensaje: titulo,
          entidadTipo: 'material',
          entidadId: Number(result.insertId),
        },
      });
    }

    return res.status(201).json({ success: true, id: result.insertId });
  },
);

router.put(
  '/teacher/clases/:claseId/asistencias',
  [body('asistencias').isArray({ min: 1 }).withMessage('asistencias es requerida')],
  async (req, res) => {
    if (!hasRole(req.user, 'docente')) return res.status(403).json({ error: 'No autorizado' });
    if (!ensureValid(req, res)) return;

    const claseId = Number(req.params.claseId);
    const ownerRows = await query(
      `SELECT cl.id, cl.curso_id
       FROM clases cl
       INNER JOIN docentes d ON d.id = cl.docente_id
       WHERE cl.id = ? AND d.usuario_id = ?
       LIMIT 1`,
      [claseId, req.user.id],
    );
    if (ownerRows.length === 0) return res.status(403).json({ error: 'No tienes acceso a esta clase' });

    for (const item of req.body.asistencias) {
      const estudianteId = Number(item.estudiante_id);
      const estado = String(item.estado || 'presente');
      const observacion = item.observacion || null;
      if (!estudianteId) continue;

      await query(
        `INSERT INTO asistencias_clase (clase_id, estudiante_id, estado, observacion)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE estado = VALUES(estado), observacion = VALUES(observacion)`,
        [claseId, estudianteId, estado, observacion],
      );
    }

    return res.json({ success: true, message: 'Asistencia actualizada' });
  },
);

// ===== ESTUDIANTE =====

async function fetchStudentCursosWithProgress(usuarioId) {
  const studentRows = await query('SELECT id FROM estudiantes WHERE usuario_id = ? LIMIT 1', [usuarioId]);
  if (studentRows.length === 0) return { estudianteId: null, cursos: [] };
  const estudianteId = Number(studentRows[0].id);

  const cursos = await query(
    `SELECT c.id, c.nombre, c.codigo, c.descripcion, m.estado, m.calificacion_final,
            (SELECT COUNT(*) FROM modulos mo WHERE mo.curso_id = c.id AND mo.activo = TRUE) AS total_modulos,
            LEAST(
              100,
              COALESCE(
                ROUND(
                  (
                    SELECT COUNT(*)
                    FROM asistencias_clase ac
                    INNER JOIN clases cl ON cl.id = ac.clase_id
                    WHERE cl.curso_id = c.id
                      AND ac.estudiante_id = m.estudiante_id
                      AND ac.estado IN ('presente', 'tarde', 'justificado')
                  )
                  / NULLIF((SELECT COUNT(*) FROM clases cl2 WHERE cl2.curso_id = c.id), 0)
                  * 100
                ),
                0
              )
            ) AS progreso
     FROM matriculas m
     INNER JOIN cursos c ON c.id = m.curso_id
     WHERE m.estudiante_id = ?
     ORDER BY c.nombre`,
    [estudianteId],
  );

  return { estudianteId, cursos: Array.isArray(cursos) ? cursos : [] };
}

async function fetchStudentPerfil(usuarioId, includeFoto = false) {
  const estudiantes = await query(
    `SELECT id, usuario_id, nombre, apellido, documento, tipo_documento, telefono,
            direccion, ciudad, pais, departamento, municipio, fecha_nacimiento, estado_civil
     FROM estudiantes WHERE usuario_id = ? LIMIT 1`,
    [usuarioId],
  );
  if (!Array.isArray(estudiantes) || estudiantes.length === 0) return null;
  const perfil = { ...estudiantes[0] };
  if (includeFoto) {
    const uRows = await query('SELECT foto_url FROM usuarios WHERE id = ? LIMIT 1', [usuarioId]);
    if (Array.isArray(uRows) && uRows[0] && uRows[0].foto_url != null && uRows[0].foto_url !== '') {
      const fv = uRows[0].foto_url;
      perfil.foto_url = Buffer.isBuffer(fv) ? fv.toString('utf8') : String(fv);
    } else {
      perfil.foto_url = null;
    }
  }
  return perfil;
}

router.get('/student/inicio', async (req, res) => {
  if (!hasRole(req.user, 'estudiante')) return res.status(403).json({ error: 'No autorizado' });

  const uid = req.user.id;
  const includeFoto = String(req.query.foto || '') === '1';

  try {
    const [perfil, cursosPack, certificados, calendario, notificaciones] = await Promise.all([
      fetchStudentPerfil(uid, includeFoto),
      fetchStudentCursosWithProgress(uid),
      query(
        `SELECT cert.id, cert.numero_certificado, cert.fecha_emision, cert.descargado,
                c.nombre AS curso_nombre, m.calificacion_final
         FROM certificados cert
         JOIN matriculas m ON cert.matricula_id = m.id
         JOIN cursos c ON m.curso_id = c.id
         JOIN estudiantes e ON m.estudiante_id = e.id
         WHERE e.usuario_id = ? AND m.estado = 'completada'
         ORDER BY cert.fecha_emision DESC`,
        [uid],
      ),
      query(
        `SELECT cl.id, cl.titulo, cl.fecha, cl.hora_inicio, cl.hora_fin, cl.tipo, cl.enlace_virtual, cl.ubicacion,
                c.id AS curso_id, c.nombre AS curso_nombre
         FROM clases cl
         INNER JOIN cursos c ON c.id = cl.curso_id
         INNER JOIN matriculas m ON m.curso_id = c.id
         INNER JOIN estudiantes e ON e.id = m.estudiante_id
         WHERE e.usuario_id = ? AND cl.fecha >= CURDATE() AND m.estado = 'activa'
         ORDER BY cl.fecha ASC, cl.hora_inicio ASC`,
        [uid],
      ),
      query(
        `SELECT id, tipo, titulo, mensaje, entidad_tipo, entidad_id, leida, fecha_creacion
         FROM notificaciones
         WHERE usuario_id = ?
         ORDER BY fecha_creacion DESC
         LIMIT 100`,
        [uid],
      ),
    ]);

    if (!perfil) return res.status(404).json({ error: 'Estudiante no encontrado' });

    return res.json({
      perfil,
      cursos: cursosPack.cursos,
      certificados: Array.isArray(certificados) ? certificados : [],
      calendario: Array.isArray(calendario) ? calendario : [],
      notificaciones: Array.isArray(notificaciones) ? notificaciones : [],
    });
  } catch (error) {
    console.error('Error student/inicio:', error);
    return res.status(500).json({ error: 'Error al cargar panel estudiante' });
  }
});

router.get('/student/mis-cursos', async (req, res) => {
  if (!hasRole(req.user, 'estudiante')) return res.status(403).json({ error: 'No autorizado' });

  const { cursos } = await fetchStudentCursosWithProgress(req.user.id);
  if (cursos.length === 0) {
    const studentRows = await query('SELECT id FROM estudiantes WHERE usuario_id = ? LIMIT 1', [req.user.id]);
    if (studentRows.length === 0) return res.status(404).json({ error: 'Estudiante no encontrado' });
  }

  return res.json(cursos);
});

router.get('/student/calendario', async (req, res) => {
  if (!hasRole(req.user, 'estudiante')) return res.status(403).json({ error: 'No autorizado' });

  const rows = await query(
    `SELECT cl.id, cl.titulo, cl.fecha, cl.hora_inicio, cl.hora_fin, cl.tipo, cl.enlace_virtual, cl.ubicacion,
            c.id as curso_id, c.nombre as curso_nombre
     FROM clases cl
     INNER JOIN cursos c ON c.id = cl.curso_id
     INNER JOIN matriculas m ON m.curso_id = c.id
     INNER JOIN estudiantes e ON e.id = m.estudiante_id
     WHERE e.usuario_id = ? AND cl.fecha >= CURDATE() AND m.estado = 'activa'
     ORDER BY cl.fecha ASC, cl.hora_inicio ASC`,
    [req.user.id],
  );

  return res.json(rows);
});

router.get('/student/notificaciones', async (req, res) => {
  if (!hasRole(req.user, 'estudiante')) return res.status(403).json({ error: 'No autorizado' });

  const rows = await query(
    `SELECT id, tipo, titulo, mensaje, entidad_tipo, entidad_id, leida, fecha_creacion
     FROM notificaciones
     WHERE usuario_id = ?
     ORDER BY fecha_creacion DESC
     LIMIT 100`,
    [req.user.id],
  );

  return res.json(rows);
});

router.put('/notificaciones/:id/leer', async (req, res) => {
  const notificationId = Number(req.params.id);
  if (!notificationId) return res.status(400).json({ error: 'ID de notificación inválido' });

  await query(
    'UPDATE notificaciones SET leida = TRUE WHERE id = ? AND usuario_id = ?',
    [notificationId, req.user.id],
  );

  return res.json({ success: true });
});

export default router;
