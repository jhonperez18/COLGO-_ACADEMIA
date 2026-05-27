import express from 'express';
import { query } from '../db.js';
import { authorizeRole } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import { broadcastSse } from '../realtime/sseHub.js';
import { ensureSchemaRuntime } from '../schemaRuntime.js';

const router = express.Router();

const MAX_FOTO_CHARS = 800000;

// Middleware: solo docentes
router.use(authorizeRole('docente'));

/**
 * GET /api/teacher/perfil
 * Obtener datos del perfil del docente
 */
router.get('/perfil', async (req, res) => {
  try {
    await ensureSchemaRuntime();
    const docentes = await query(
      'SELECT * FROM docentes WHERE usuario_id = ?',
      [req.user.id]
    );

    if (docentes.length === 0) {
      return res.status(404).json({ error: 'Perfil de docente no encontrado' });
    }

    const uRows = await query('SELECT foto_url FROM usuarios WHERE id = ? LIMIT 1', [req.user.id]);
    let foto_url = null;
    if (Array.isArray(uRows) && uRows[0] && uRows[0].foto_url != null && uRows[0].foto_url !== '') {
      const fv = uRows[0].foto_url;
      foto_url = Buffer.isBuffer(fv) ? fv.toString('utf8') : String(fv);
    }

    res.json({ ...docentes[0], foto_url });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

/**
 * PUT /api/teacher/perfil
 * Actualizar datos del perfil del docente autenticado
 */
router.put(
  '/perfil',
  [
    body('nombre').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 100 }),
    body('apellido').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 100 }),
    body('documento').optional({ nullable: true }).isString().trim().isLength({ max: 20 }),
    body('telefono').optional({ nullable: true }).isString().trim().isLength({ max: 20 }),
    body('especialidad').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  ],
  async (req, res) => {
    try {
      await ensureSchemaRuntime();
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const docentes = await query('SELECT id FROM docentes WHERE usuario_id = ? LIMIT 1', [req.user.id]);
      if (!Array.isArray(docentes) || docentes.length === 0) {
        return res.status(404).json({ error: 'Perfil de docente no encontrado' });
      }

      const docenteId = Number(docentes[0].id);
      const data = req.body || {};

      if (Object.prototype.hasOwnProperty.call(data, 'foto_url')) {
        const raw = data.foto_url == null || data.foto_url === '' ? null : String(data.foto_url);
        if (raw && raw.length > MAX_FOTO_CHARS) {
          return res.status(400).json({
            error: 'La foto es demasiado grande. Usa una imagen más pequeña (por ejemplo menos de 1,5 MB).',
          });
        }
        await query('UPDATE usuarios SET foto_url = ? WHERE id = ?', [raw, req.user.id]);
      }

      await query(
        `UPDATE docentes
         SET nombre = COALESCE(?, nombre),
             apellido = COALESCE(?, apellido),
             documento = COALESCE(?, documento),
             telefono = COALESCE(?, telefono),
             especialidad = COALESCE(?, especialidad)
         WHERE id = ?`,
        [
          data.nombre ?? null,
          data.apellido ?? null,
          data.documento ?? null,
          data.telefono ?? null,
          data.especialidad ?? null,
          docenteId,
        ],
      );

      const actualizado = await query('SELECT * FROM docentes WHERE id = ? LIMIT 1', [docenteId]);
      const uRows = await query('SELECT foto_url FROM usuarios WHERE id = ? LIMIT 1', [req.user.id]);
      let foto_url = null;
      if (Array.isArray(uRows) && uRows[0] && uRows[0].foto_url != null && uRows[0].foto_url !== '') {
        const fv = uRows[0].foto_url;
        foto_url = Buffer.isBuffer(fv) ? fv.toString('utf8') : String(fv);
      }
      const row = Array.isArray(actualizado) && actualizado[0] ? actualizado[0] : null;
      return res.json({
        success: true,
        message: 'Perfil actualizado correctamente',
        perfil: row ? { ...row, foto_url } : null,
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Error al actualizar perfil de docente' });
    }
  },
);

/**
 * GET /api/teacher/cursos
 * Obtener cursos asignados al docente
 */
router.get('/cursos', async (req, res) => {
  try {
    const cursos = await query(`
      SELECT c.id, c.nombre, c.codigo, c.descripcion, c.creditos, c.capacidad,
             COUNT(m.id) as estudiantes_inscritos
      FROM cursos c
      JOIN docentes d ON c.docente_id = d.id
      LEFT JOIN matriculas m ON c.id = m.curso_id AND m.estado = 'activa'
      WHERE d.usuario_id = ?
      GROUP BY c.id
      ORDER BY c.nombre
    `, [req.user.id]);

    res.json(cursos);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

/**
 * GET /api/teacher/cursos/:cursoId/estudiantes
 * Obtener lista de estudiantes de un curso
 */
router.get('/cursos/:cursoId/estudiantes', async (req, res) => {
  try {
    // Verificar que el docente sea propietario del curso
    const cursos = await query(
      'SELECT id FROM cursos WHERE id = ? AND docente_id = (SELECT id FROM docentes WHERE usuario_id = ?)',
      [req.params.cursoId, req.user.id]
    );

    if (cursos.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este curso' });
    }

    const estudiantes = await query(`
      SELECT e.id, e.nombre, e.apellido, e.documento, u.email,
             m.id as matricula_id, m.estado, m.calificacion_final
      FROM matriculas m
      JOIN estudiantes e ON m.estudiante_id = e.id
      JOIN usuarios u ON e.usuario_id = u.id
      WHERE m.curso_id = ?
      ORDER BY e.nombre
    `, [req.params.cursoId]);

    res.json(estudiantes);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener estudiantes' });
  }
});

/**
 * GET /api/teacher/cursos/:cursoId/estudiantes/:estudianteId/notas
 * Obtener notas de un estudiante en un curso
 */
router.get('/cursos/:cursoId/estudiantes/:estudianteId/notas', async (req, res) => {
  try {
    const notas = await query(`
      SELECT n.id, n.evaluacion_numero, n.nota, n.descripcion, n.fecha_evaluacion, n.fecha_registro
      FROM notas n
      JOIN matriculas m ON n.matricula_id = m.id
      WHERE m.curso_id = ? AND m.estudiante_id = ?
      ORDER BY n.evaluacion_numero
    `, [req.params.cursoId, req.params.estudianteId]);

    res.json(notas);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener notas' });
  }
});

/**
 * POST /api/teacher/cursos/:cursoId/estudiantes/:estudianteId/notas
 * Registrar o actualizar nota de un estudiante
 */
router.post('/cursos/:cursoId/estudiantes/:estudianteId/notas', [
  body('evaluacion_numero').isInt({ min: 1 }).withMessage('Número de evaluación inválido'),
  body('nota').isFloat({ min: 0, max: 5 }).withMessage('Nota debe estar entre 0 y 5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { evaluacion_numero, nota, descripcion, fecha_evaluacion } = req.body;
    const cursoId = Number(req.params.cursoId);
    const estudianteId = Number(req.params.estudianteId);

    // Verificar que el curso pertenece al docente autenticado.
    const ownerRows = await query(
      'SELECT c.id FROM cursos c INNER JOIN docentes d ON c.docente_id = d.id WHERE c.id = ? AND d.usuario_id = ? LIMIT 1',
      [cursoId, req.user.id],
    );
    if (!Array.isArray(ownerRows) || ownerRows.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este curso' });
    }

    // Obtener matricula_id
    const matriculas = await query(
      'SELECT id FROM matriculas WHERE curso_id = ? AND estudiante_id = ?',
      [cursoId, estudianteId]
    );

    if (matriculas.length === 0) {
      return res.status(404).json({ error: 'Matrícula no encontrada' });
    }

    const matriculaId = matriculas[0].id;

    // Verificar si ya existe una nota para esta evaluación
    const notasExistentes = await query(
      'SELECT id FROM notas WHERE matricula_id = ? AND evaluacion_numero = ?',
      [matriculaId, evaluacion_numero]
    );

    if (notasExistentes.length > 0) {
      // Actualizar nota existente
      await query(
        'UPDATE notas SET nota = ?, descripcion = ?, fecha_evaluacion = ? WHERE id = ?',
        [nota, descripcion || null, fecha_evaluacion || new Date(), notasExistentes[0].id]
      );
    } else {
      // Crear nueva nota
      await query(
        'INSERT INTO notas (matricula_id, evaluacion_numero, nota, descripcion, fecha_evaluacion) VALUES (?, ?, ?, ?, ?)',
        [matriculaId, evaluacion_numero, nota, descripcion || null, fecha_evaluacion || new Date()]
      );
    }

    const estudianteRows = await query('SELECT usuario_id FROM estudiantes WHERE id = ? LIMIT 1', [estudianteId]);
    const estudianteUsuarioId = Array.isArray(estudianteRows) && estudianteRows[0] ? Number(estudianteRows[0].usuario_id) : null;

    broadcastSse(
      'grade_updated',
      {
        cursoId,
        estudianteId,
        evaluacion_numero,
        nota,
        updatedBy: Number(req.user.id),
        at: new Date().toISOString(),
      },
      (user) => {
        if (!user?.id) return false;
        if (user.rol === 'admin') return true;
        if (user.rol === 'docente' && Number(user.id) === Number(req.user.id)) return true;
        return estudianteUsuarioId !== null && Number(user.id) === estudianteUsuarioId;
      },
    );

    res.json({ success: true, message: 'Nota registrada exitosamente' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al registrar nota' });
  }
});

/**
 * PUT /api/teacher/cursos/:cursoId/estudiantes/:estudianteId/calificacion-final
 * Establecer calificación final de un estudiante
 */
router.put('/cursos/:cursoId/estudiantes/:estudianteId/calificacion-final', [
  body('calificacion_final').isFloat({ min: 0, max: 5 }).withMessage('Calificación debe estar entre 0 y 5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { calificacion_final, estado, observaciones } = req.body;
    const cursoId = Number(req.params.cursoId);
    const estudianteId = Number(req.params.estudianteId);

    const ownerRows = await query(
      'SELECT c.id FROM cursos c INNER JOIN docentes d ON c.docente_id = d.id WHERE c.id = ? AND d.usuario_id = ? LIMIT 1',
      [cursoId, req.user.id],
    );
    if (!Array.isArray(ownerRows) || ownerRows.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este curso' });
    }

    const resultado = await query(
      'UPDATE matriculas SET calificacion_final = ?, estado = ?, observaciones = ? WHERE curso_id = ? AND estudiante_id = ?',
      [calificacion_final, estado || 'completada', observaciones || null, cursoId, estudianteId]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Matrícula no encontrada' });
    }

    const estudianteRows = await query('SELECT usuario_id FROM estudiantes WHERE id = ? LIMIT 1', [estudianteId]);
    const estudianteUsuarioId = Array.isArray(estudianteRows) && estudianteRows[0] ? Number(estudianteRows[0].usuario_id) : null;

    broadcastSse(
      'final_grade_updated',
      {
        cursoId,
        estudianteId,
        calificacion_final,
        estado: estado || 'completada',
        updatedBy: Number(req.user.id),
        at: new Date().toISOString(),
      },
      (user) => {
        if (!user?.id) return false;
        if (user.rol === 'admin') return true;
        if (user.rol === 'docente' && Number(user.id) === Number(req.user.id)) return true;
        return estudianteUsuarioId !== null && Number(user.id) === estudianteUsuarioId;
      },
    );

    res.json({ success: true, message: 'Calificación final registrada' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al registrar calificación final' });
  }
});

/**
 * GET /api/teacher/cursos/:cursoId/horarios
 * Ver horarios de un curso
 */
router.get('/cursos/:cursoId/horarios', async (req, res) => {
  try {
    const horarios = await query(
      'SELECT * FROM horarios WHERE curso_id = ? ORDER BY FIELD(dia_semana, "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"), hora_inicio',
      [req.params.cursoId]
    );

    res.json(horarios);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

export default router;
