import express from 'express';
import { query } from '../db.js';
import { authorizeRole } from '../middleware/auth.js';
import { ensureSchemaRuntime } from '../schemaRuntime.js';

const router = express.Router();

const MAX_FOTO_CHARS = 800000;

// Middleware: solo estudiantes
router.use(authorizeRole('estudiante'));

/**
 * GET /api/student/perfil
 * Obtener datos del perfil del estudiante
 */
router.get('/perfil', async (req, res) => {
  try {
    await ensureSchemaRuntime();
    const estudiantes = await query(
      'SELECT * FROM estudiantes WHERE usuario_id = ?',
      [req.user.id]
    );

    if (estudiantes.length === 0) {
      return res.status(404).json({ error: 'Perfil de estudiante no encontrado' });
    }

    const uRows = await query('SELECT foto_url FROM usuarios WHERE id = ? LIMIT 1', [req.user.id]);
    let foto_url = null;
    if (Array.isArray(uRows) && uRows[0] && uRows[0].foto_url != null && uRows[0].foto_url !== '') {
      const fv = uRows[0].foto_url;
      foto_url = Buffer.isBuffer(fv) ? fv.toString('utf8') : String(fv);
    }

    res.json({ ...estudiantes[0], foto_url });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

/**
 * PUT /api/student/perfil
 * Actualizar perfil del estudiante
 */
router.put('/perfil', async (req, res) => {
  try {
    await ensureSchemaRuntime();
    const {
      nombre,
      apellido,
      documento,
      tipo_documento,
      telefono,
      direccion,
      ciudad,
      pais,
      departamento,
      municipio,
      fecha_nacimiento,
      estado_civil,
      foto_url,
    } = req.body;

    // Obtener ID de estudiante
    const estudiantes = await query(
      'SELECT id FROM estudiantes WHERE usuario_id = ?',
      [req.user.id]
    );

    if (estudiantes.length === 0) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    if (foto_url !== undefined) {
      const raw = foto_url == null || foto_url === '' ? null : String(foto_url);
      if (raw && raw.length > MAX_FOTO_CHARS) {
        return res.status(400).json({
          error: 'La foto es demasiado grande. Usa una imagen más pequeña (por ejemplo menos de 1,5 MB).',
        });
      }
      await query('UPDATE usuarios SET foto_url = ? WHERE id = ?', [raw, req.user.id]);
    }

    const hasProfileFields = [
      'nombre',
      'apellido',
      'documento',
      'tipo_documento',
      'telefono',
      'direccion',
      'ciudad',
      'pais',
      'departamento',
      'municipio',
      'fecha_nacimiento',
      'estado_civil',
    ].some((k) => Object.prototype.hasOwnProperty.call(req.body || {}, k));

    if (hasProfileFields) {
      await query(
        `UPDATE estudiantes
         SET nombre = COALESCE(?, nombre),
             apellido = COALESCE(?, apellido),
             documento = COALESCE(?, documento),
             tipo_documento = COALESCE(?, tipo_documento),
             telefono = COALESCE(?, telefono),
             direccion = COALESCE(?, direccion),
             ciudad = COALESCE(?, ciudad),
             pais = COALESCE(?, pais),
             departamento = COALESCE(?, departamento),
             municipio = COALESCE(?, municipio),
             fecha_nacimiento = COALESCE(?, fecha_nacimiento),
             estado_civil = COALESCE(?, estado_civil)
         WHERE usuario_id = ?`,
        [
          nombre ?? null,
          apellido ?? null,
          documento ?? null,
          tipo_documento ?? null,
          telefono ?? null,
          direccion ?? null,
          ciudad ?? null,
          pais ?? null,
          departamento ?? null,
          municipio ?? null,
          fecha_nacimiento ?? null,
          estado_civil ?? null,
          req.user.id,
        ],
      );
    }

    res.json({ success: true, message: 'Perfil actualizado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

/**
 * GET /api/student/cursos
 * Obtener cursos matriculados del estudiante
 */
router.get('/cursos', async (req, res) => {
  try {
    const cursos = await query(`
      SELECT c.id, c.nombre, c.codigo, c.descripcion, c.creditos,
             m.id as matricula_id, m.estado, m.calificacion_final, m.fecha_matricula,
             CONCAT(d.nombre, ' ', d.apellido) as docente
      FROM matriculas m
      JOIN cursos c ON m.curso_id = c.id
      JOIN estudiantes e ON m.estudiante_id = e.id
      LEFT JOIN docentes d ON c.docente_id = d.id
      WHERE e.usuario_id = ?
      ORDER BY m.fecha_matricula DESC
    `, [req.user.id]);

    res.json(cursos);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

/**
 * GET /api/student/cursos/:cursoid/notas
 * Obtener notas de un curso específico
 */
router.get('/cursos/:cursoId/notas', async (req, res) => {
  try {
    const notas = await query(`
      SELECT n.id, n.evaluacion_numero, n.nota, n.descripcion, n.fecha_evaluacion
      FROM notas n
      JOIN matriculas m ON n.matricula_id = m.id
      JOIN estudiantes e ON m.estudiante_id = e.id
      JOIN cursos c ON m.curso_id = c.id
      WHERE e.usuario_id = ? AND c.id = ?
      ORDER BY n.evaluacion_numero
    `, [req.user.id, req.params.cursoId]);

    res.json(notas);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener notas' });
  }
});

/**
 * GET /api/student/horarios
 * Obtener horarios de los cursos matriculados
 */
router.get('/horarios', async (req, res) => {
  try {
    const horarios = await query(`
      SELECT h.id, h.dia_semana, h.hora_inicio, h.hora_fin, h.sala, c.nombre, c.codigo
      FROM horarios h
      JOIN cursos c ON h.curso_id = c.id
      JOIN matriculas m ON c.id = m.curso_id
      JOIN estudiantes e ON m.estudiante_id = e.id
      WHERE e.usuario_id = ?
      ORDER BY FIELD(h.dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'), h.hora_inicio
    `, [req.user.id]);

    res.json(horarios);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

/**
 * GET /api/student/certificados
 * Obtener certificados disponibles para descargar
 */
router.get('/certificados', async (req, res) => {
  try {
    const certificados = await query(`
      SELECT cert.id, cert.numero_certificado, cert.fecha_emision, cert.descargado,
             c.nombre as curso_nombre, m.calificacion_final
      FROM certificados cert
      JOIN matriculas m ON cert.matricula_id = m.id
      JOIN cursos c ON m.curso_id = c.id
      JOIN estudiantes e ON m.estudiante_id = e.id
      WHERE e.usuario_id = ? AND m.estado = 'completada'
      ORDER BY cert.fecha_emision DESC
    `, [req.user.id]);

    res.json(certificados);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener certificados' });
  }
});

/**
 * POST /api/student/certificados/:id/descargar
 * Descargar certificado
 */
router.post('/certificados/:id/descargar', async (req, res) => {
  try {
    // Actualizar estado de descargado
    await query(
      'UPDATE certificados SET descargado = TRUE, fecha_descarga = NOW() WHERE id = ?',
      [req.params.id]
    );

    // Aquí en un caso real se generaría un PDF
    res.json({
      success: true,
      message: 'Certificado descargado',
      // En implementación real: enviar archivo PDF
      url: `/api/student/certificados/${req.params.id}/documento`
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al descargar certificado' });
  }
});

export default router;
