import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { authorizeRole } from '../middleware/auth.js';
import { generateSecurePassword } from '../utils/passwordGenerator.js';
import { sendCredentialsEmail, verifyEmailConnection, isSmtpConfigured } from '../utils/emailService.js';
import { validateCreateStudent, validateUpdateStudent, validateCreateTeacher, validateCreateCourse, handleValidationErrors } from '../utils/validators.js';

const router = express.Router();
const tableColumnsCache = new Map();

async function getTableColumns(tableName) {
  if (tableColumnsCache.has(tableName)) return tableColumnsCache.get(tableName);
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName],
  );
  const cols = new Set((rows || []).map((r) => String(r.COLUMN_NAME || '')));
  tableColumnsCache.set(tableName, cols);
  return cols;
}

function hasCol(cols, col) {
  return cols instanceof Set && cols.has(col);
}

function firstExisting(cols, candidates = []) {
  for (const c of candidates) {
    if (hasCol(cols, c)) return c;
  }
  return null;
}

function colExpr(alias, cols, candidates, fallbackSql) {
  const c = firstExisting(cols, candidates);
  return c ? `${alias}.${c}` : fallbackSql;
}

function resolveFrontendBase(req) {
  const envBase = String(process.env.FRONTEND_URL || '').trim().replace(/\/$/, '')
  const origin = String(req?.get?.('origin') || req?.headers?.origin || '').trim().replace(/\/$/, '')
  if (/^https?:\/\//i.test(origin)) return origin

  const host = String(req?.get?.('x-forwarded-host') || req?.get?.('host') || '').trim()
  if (host) {
    const proto = String(req?.get?.('x-forwarded-proto') || req?.protocol || 'https')
      .trim()
      .toLowerCase()
    const safeProto = proto === 'http' ? 'http' : 'https'
    return `${safeProto}://${host}`.replace(/\/$/, '')
  }
  if (envBase) return envBase
  return 'http://localhost:5173'
}

// Middleware para verificar que sea admin
router.use(authorizeRole('admin'));

async function queryCountSafe(sql) {
  try {
    const rows = await query(sql);
    return Number(rows?.[0]?.total ?? 0);
  } catch {
    return 0;
  }
}

async function querySumSafe(sql) {
  try {
    const rows = await query(sql);
    return Number(rows?.[0]?.total ?? 0);
  } catch {
    return 0;
  }
}

/**
 * GET /api/admin/estadisticas
 * Obtener estadísticas del sistema
 */
router.get('/estadisticas', async (req, res) => {
  try {
    const [estudiantes, docentes, cursos, matriculas, usuarios, ventas] = await Promise.all([
      queryCountSafe('SELECT COUNT(*) as total FROM estudiantes'),
      queryCountSafe('SELECT COUNT(*) as total FROM docentes'),
      queryCountSafe('SELECT COUNT(*) as total FROM cursos'),
      queryCountSafe('SELECT COUNT(*) as total FROM matriculas WHERE estado = "activa"'),
      queryCountSafe('SELECT COUNT(*) as total FROM usuarios'),
      querySumSafe('SELECT COALESCE(SUM(monto), 0) as total FROM pagos WHERE estado IN ("pagado","aprobado","Aprobado")'),
    ]);

    res.json({
      estudiantes,
      docentes,
      cursos,
      matriculasActivas: matriculas,
      usuarios,
      ventas,
    });
  } catch (error) {
    console.error('Error en estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

/**
 * GET /api/admin/smtp-verify — comprobar credenciales SMTP (sin enviar correo al cliente).
 */
router.get('/smtp-verify', async (_req, res) => {
  if (!isSmtpConfigured()) {
    return res.json({
      ok: false,
      configured: false,
      hint: 'Define SMTP_USER y SMTP_PASSWORD en backend/.env (Gmail: contraseña de aplicación).',
    })
  }
  const v = await verifyEmailConnection()
  return res.json({
    ok: v.success,
    configured: true,
    message: v.success ? 'SMTP accesible con las credenciales actuales.' : v.error,
  })
})

/**
 * ===== GESTIÓN DE ESTUDIANTES =====
 */

// GET - Listar todos los estudiantes
router.get('/estudiantes', async (req, res) => {
  try {
    const eCols = await getTableColumns('estudiantes');
    const uCols = await getTableColumns('usuarios');
    if (eCols.size === 0) return res.json([]);

    const studentUserFk = firstExisting(eCols, ['usuario_id', 'user_id']);
    const nombreExpr = colExpr('e', eCols, ['nombre', 'nombres', 'first_name'], "''");
    const apellidoExpr = colExpr('e', eCols, ['apellido', 'apellidos', 'last_name'], "''");
    const hasDocumento = hasCol(eCols, 'documento');
    const hasFechaCreacion = hasCol(eCols, 'fecha_creacion');
    const emailExpr = studentUserFk && uCols.size > 0 ? colExpr('u', uCols, ['email', 'correo'], 'NULL') : 'NULL';
    const activoExpr = studentUserFk && uCols.size > 0 ? colExpr('u', uCols, ['activo', 'active'], '1') : '1';
    const userJoin =
      studentUserFk && uCols.size > 0
        ? `LEFT JOIN usuarios u ON ${emailExpr === 'NULL' && activoExpr === '1' ? '1=0' : `u.id = e.${studentUserFk}`}`
        : '';

    const estudiantes = await query(`
      SELECT e.id,
             ${nombreExpr} AS nombre,
             ${apellidoExpr} AS apellido,
             ${hasDocumento ? 'e.documento' : 'NULL AS documento'},
             ${emailExpr} AS email,
             ${activoExpr} AS activo,
             ${hasFechaCreacion ? 'e.fecha_creacion' : 'NULL AS fecha_creacion'}
      FROM estudiantes e
      ${userJoin}
      ORDER BY ${nombreExpr}
    `);
    res.json(estudiantes);
  } catch (error) {
    console.error('Error al obtener estudiantes:', error);
    res.status(500).json({ error: 'Error al obtener estudiantes' });
  }
});

// GET - Obtener un estudiante específico
router.get('/estudiantes/:id', async (req, res) => {
  try {
    const estudiantes = await query(`
      SELECT e.*, u.email, u.activo
      FROM estudiantes e
      JOIN usuarios u ON e.usuario_id = u.id
      WHERE e.id = ?
    `, [req.params.id]);

    if (estudiantes.length === 0) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    res.json(estudiantes[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener estudiante' });
  }
});

/**
 * POST - Crear nuevo estudiante
 */
router.post('/estudiantes', validateCreateStudent, handleValidationErrors, async (req, res) => {
  try {
    const { nombre, apellido, email, documento, fecha_nacimiento, telefono, direccion, ciudad } = req.body;

    // Verificar que el email no exista
    const usuariosExistentes = await query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (usuariosExistentes.length > 0) {
      return res.status(400).json({ error: 'El email ya existe' });
    }

    // Generar contraseña segura temporal
    const passwordTemporal = generateSecurePassword(10);
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);

    // Crear usuario
    const usuarioResult = await query(
      'INSERT INTO usuarios (email, password_hash, rol, activo, cambiar_password) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, 'estudiante', true, true]
    );

    const usuarioId = usuarioResult.insertId;

    // Crear estudiante
    await query(
      `INSERT INTO estudiantes (usuario_id, nombre, apellido, documento, fecha_nacimiento, telefono, direccion, ciudad) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, nombre, apellido, documento || null, fecha_nacimiento || null, telefono || null, direccion || null, ciudad || null]
    );

    const baseFront = resolveFrontendBase(req)
    const mailResult = await sendCredentialsEmail(
      email,
      nombre,
      email,
      passwordTemporal,
      `${baseFront}/login`,
      `${baseFront}/estudiante/dashboard`,
    );

    res.status(201).json({
      success: true,
      message: mailResult.success
        ? 'Estudiante creado exitosamente y email de credenciales enviado'
        : 'Estudiante creado; el correo no se pudo enviar (revisa SMTP en .env)',
      email,
      emailSent: Boolean(mailResult.success),
      nota: mailResult.success
        ? 'El estudiante recibirá un email con sus credenciales de acceso'
        : mailResult.error || mailResult.skipped
          ? String(mailResult.error || 'SMTP no configurado')
          : 'Error SMTP',
    });
  } catch (error) {
    console.error('Error al crear estudiante:', error);
    res.status(500).json({ error: 'Error al crear estudiante' });
  }
});

// PUT - Actualizar estudiante
router.put('/estudiantes/:id', async (req, res) => {
  try {
    const { nombre, apellido, documento, fecha_nacimiento, telefono, direccion, ciudad } = req.body;

    await query(
      `UPDATE estudiantes SET nombre = ?, apellido = ?, documento = ?, fecha_nacimiento = ?, telefono = ?, direccion = ?, ciudad = ? 
       WHERE id = ?`,
      [nombre, apellido, documento, fecha_nacimiento, telefono, direccion, ciudad, req.params.id]
    );

    res.json({ success: true, message: 'Estudiante actualizado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar estudiante' });
  }
});

// DELETE - Desactivar estudiante
router.delete('/estudiantes/:id', async (req, res) => {
  try {
    // Obtener el usuario_id del estudiante
    const estudiantes = await query('SELECT usuario_id FROM estudiantes WHERE id = ?', [req.params.id]);
    if (estudiantes.length === 0) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    const usuarioId = estudiantes[0].usuario_id;

    // Desactivar usuario
    await query('UPDATE usuarios SET activo = ? WHERE id = ?', [false, usuarioId]);
    
    res.json({ success: true, message: 'Estudiante desactivado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al desactivar estudiante' });
  }
});

/**
 * ===== GESTIÓN DE DOCENTES =====
 */

// GET - Listar todos los docentes
router.get('/docentes', async (req, res) => {
  try {
    const dCols = await getTableColumns('docentes');
    const uCols = await getTableColumns('usuarios');
    if (dCols.size === 0) return res.json([]);

    const docenteUserFk = firstExisting(dCols, ['usuario_id', 'user_id']);
    const nombreExpr = colExpr('d', dCols, ['nombre', 'nombres', 'first_name'], "''");
    const apellidoExpr = colExpr('d', dCols, ['apellido', 'apellidos', 'last_name'], "''");
    const hasEspecialidad = hasCol(dCols, 'especialidad');
    const emailExpr = docenteUserFk && uCols.size > 0 ? colExpr('u', uCols, ['email', 'correo'], 'NULL') : 'NULL';
    const activoExpr = docenteUserFk && uCols.size > 0 ? colExpr('u', uCols, ['activo', 'active'], '1') : '1';
    const userJoin =
      docenteUserFk && uCols.size > 0
        ? `LEFT JOIN usuarios u ON ${emailExpr === 'NULL' && activoExpr === '1' ? '1=0' : `u.id = d.${docenteUserFk}`}`
        : '';
    const docentes = await query(`
      SELECT d.id,
             ${nombreExpr} AS nombre,
             ${apellidoExpr} AS apellido,
             ${hasEspecialidad ? 'd.especialidad' : 'NULL AS especialidad'},
             ${emailExpr} AS email,
             ${activoExpr} AS activo
      FROM docentes d
      ${userJoin}
      ORDER BY ${nombreExpr}
    `);
    res.json(docentes);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener docentes' });
  }
});

/**
 * POST - Crear nuevo docente
 */
router.post('/docentes', validateCreateTeacher, handleValidationErrors, async (req, res) => {
  try {
    const { nombre, apellido, email, especialidad, documento, telefono } = req.body;

    // Verificar email único
    const usuariosExistentes = await query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (usuariosExistentes.length > 0) {
      return res.status(400).json({ error: 'El email ya existe' });
    }

    // Generar contraseña temporal
    const passwordTemporal = generateSecurePassword(10);
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);

    // Crear usuario
    const usuarioResult = await query(
      'INSERT INTO usuarios (email, password_hash, rol, activo, cambiar_password) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, 'docente', true, true]
    );

    // Crear docente
    await query(
      'INSERT INTO docentes (usuario_id, nombre, apellido, especialidad, documento, telefono) VALUES (?, ?, ?, ?, ?, ?)',
      [usuarioResult.insertId, nombre, apellido, especialidad || null, documento || null, telefono || null]
    );

    const baseFront = resolveFrontendBase(req)
    const mailResult = await sendCredentialsEmail(
      email,
      nombre,
      email,
      passwordTemporal,
      `${baseFront}/login`,
      `${baseFront}/docente/dashboard`,
    );

    res.status(201).json({
      success: true,
      message: mailResult.success
        ? 'Docente creado exitosamente'
        : 'Docente creado; el correo no se pudo enviar (revisa SMTP en .env)',
      email,
      emailSent: Boolean(mailResult.success),
      nota: mailResult.success
        ? 'Se ha enviado un email con las credenciales de acceso'
        : mailResult.error || 'SMTP no configurado',
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al crear docente' });
  }
});

/**
 * PUT - Actualizar docente
 */
router.put('/docentes/:id', async (req, res) => {
  try {
    const { nombre, apellido, especialidad, documento, telefono } = req.body;

    await query(
      'UPDATE docentes SET nombre = ?, apellido = ?, especialidad = ?, documento = ?, telefono = ? WHERE id = ?',
      [nombre, apellido, especialidad, documento, telefono, req.params.id]
    );

    res.json({ success: true, message: 'Docente actualizado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar docente' });
  }
});

/**
 * DELETE - Desactivar docente
 */
router.delete('/docentes/:id', async (req, res) => {
  try {
    const docentes = await query('SELECT usuario_id FROM docentes WHERE id = ?', [req.params.id]);
    if (docentes.length === 0) {
      return res.status(404).json({ error: 'Docente no encontrado' });
    }

    await query('UPDATE usuarios SET activo = ? WHERE id = ?', [false, docentes[0].usuario_id]);

    res.json({ success: true, message: 'Docente desactivado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al desactivar docente' });
  }
});

/**
 * ===== GESTIÓN DE CURSOS =====
 */

// GET - Listar todos los cursos
router.get('/cursos', async (req, res) => {
  try {
    const cCols = await getTableColumns('cursos');
    const pCols = await getTableColumns('programas');
    const dCols = await getTableColumns('docentes');
    const mCols = await getTableColumns('matriculas');
    if (cCols.size === 0) return res.json([]);

    const cursoNombreExpr = colExpr('c', cCols, ['nombre', 'title', 'titulo'], "''");
    const cursoCodigoExpr = colExpr('c', cCols, ['codigo', 'code'], 'NULL');
    const cursoDescExpr = colExpr('c', cCols, ['descripcion', 'description'], 'NULL');
    const cursoCreditosExpr = colExpr('c', cCols, ['creditos', 'credits'], 'NULL');
    const cursoCapacidadExpr = colExpr('c', cCols, ['capacidad', 'capacity'], 'NULL');
    const cursoSemestreExpr = colExpr('c', cCols, ['semestre', 'semester'], 'NULL');
    const cursoActivoExpr = colExpr('c', cCols, ['activo', 'active'], '1');

    const hasProgramaId = hasCol(cCols, 'programa_id');
    const hasDocenteId = hasCol(cCols, 'docente_id') || hasCol(cCols, 'teacher_id');
    const cursoDocenteFk = hasCol(cCols, 'docente_id') ? 'docente_id' : hasCol(cCols, 'teacher_id') ? 'teacher_id' : null;
    const matriculaCursoFk = firstExisting(mCols, ['curso_id', 'course_id']);
    const matriculaIdCol = firstExisting(mCols, ['id']);
    const hasEstadoMatricula = hasCol(mCols, 'estado') || hasCol(mCols, 'status');
    const estadoCol = hasCol(mCols, 'estado') ? 'estado' : hasCol(mCols, 'status') ? 'status' : null;
    const programaJoin =
      hasProgramaId && pCols.size > 0
        ? 'LEFT JOIN programas p ON p.id = c.programa_id'
        : '';
    const docenteJoin =
      hasDocenteId && dCols.size > 0 && cursoDocenteFk
        ? `LEFT JOIN docentes d ON c.${cursoDocenteFk} = d.id`
        : '';
    const docenteNombreExpr =
      dCols.size > 0
        ? `TRIM(CONCAT(${colExpr('d', dCols, ['nombre', 'nombres', 'first_name'], "''")}, ' ', ${colExpr('d', dCols, ['apellido', 'apellidos', 'last_name'], "''")}))`
        : "''";
    const matriculaJoin =
      mCols.size > 0 && matriculaCursoFk
        ? `LEFT JOIN matriculas m ON m.${matriculaCursoFk} = c.id ${hasEstadoMatricula && estadoCol ? `AND LOWER(m.${estadoCol}) IN ('activa','active')` : ''}`
        : '';
    const programaNombreExpr = pCols.size > 0 ? colExpr('p', pCols, ['nombre', 'name'], 'NULL') : 'NULL';
    const countExpr = mCols.size > 0 && matriculaIdCol ? `COUNT(m.${matriculaIdCol})` : '0';

    const cursos = await query(`
      SELECT c.id,
             ${cursoNombreExpr} AS nombre,
             ${cursoCodigoExpr} AS codigo,
             ${cursoDescExpr} AS descripcion,
             ${cursoCreditosExpr} AS creditos,
             ${cursoCapacidadExpr} AS capacidad,
             ${cursoSemestreExpr} AS semestre,
             ${cursoActivoExpr} AS activo,
             ${hasProgramaId ? 'c.programa_id' : 'NULL AS programa_id'},
             ${programaNombreExpr} AS programa,
             ${docenteNombreExpr} AS docente,
             ${countExpr} AS estudiantes_inscritos
      FROM cursos c
      ${programaJoin}
      ${docenteJoin}
      ${matriculaJoin}
      GROUP BY c.id
      ORDER BY ${cursoCodigoExpr !== 'NULL' ? cursoCodigoExpr : cursoNombreExpr}
    `);
    res.json(cursos);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

/**
 * POST - Crear nuevo curso
 */
router.post('/cursos', validateCreateCourse, handleValidationErrors, async (req, res) => {
  try {
    const { nombre, codigo, descripcion, docente_id, creditos, capacidad, semestre } = req.body;

    // Verificar código único
    const cursosExistentes = await query('SELECT id FROM cursos WHERE codigo = ?', [codigo]);
    if (cursosExistentes.length > 0) {
      return res.status(400).json({ error: 'El código de curso ya existe' });
    }

    const resultado = await query(
      `INSERT INTO cursos (nombre, codigo, descripcion, docente_id, creditos, capacidad, semestre, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, codigo, descripcion || null, docente_id || null, creditos || 3, capacidad || 30, semestre || 1, true]
    );

    res.status(201).json({
      success: true,
      message: 'Curso creado exitosamente',
      id: resultado.insertId
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al crear curso' });
  }
});

/**
 * PUT - Actualizar curso
 */
router.put('/cursos/:id', async (req, res) => {
  try {
    const { nombre, codigo, descripcion, docente_id, creditos, capacidad, semestre } = req.body;

    await query(
      `UPDATE cursos SET nombre = ?, codigo = ?, descripcion = ?, docente_id = ?, creditos = ?, capacidad = ?, semestre = ?
       WHERE id = ?`,
      [nombre, codigo, descripcion, docente_id, creditos, capacidad, semestre, req.params.id]
    );

    res.json({ success: true, message: 'Curso actualizado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar curso' });
  }
});

/**
 * DELETE - Desactivar curso
 */
router.delete('/cursos/:id', async (req, res) => {
  try {
    await query('UPDATE cursos SET activo = ? WHERE id = ?', [false, req.params.id]);
    res.json({ success: true, message: 'Curso desactivado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al desactivar curso' });
  }
});

export default router;

