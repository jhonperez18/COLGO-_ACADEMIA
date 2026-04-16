// ============================================================================
// Configuración de Conexión a Base de Datos MySQL
// Archivo: src/server/db.ts
// ============================================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Crear pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'colgo_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Probar conexión
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [version] = await connection.query('SELECT VERSION() as version') as [any[], any[]];
    connection.release();
    console.log('✅ Conexión MySQL exitosa. Versión:', (version as any[])[0].version);
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', (error as Error).message);
    return false;
  }
}

// Funciones de utilidad para queries
async function query(sql: string, params: any[] = []) {
  try {
    const [rows] = await pool.query(sql, params) as [any[], any[]];
    return rows;
  } catch (error) {
    console.error('Error en query:', sql, error);
    throw error;
  }
}

// Funciones de utilidad para queries
async function execute(sql: string, params: any[] = []) {
  try {
    const [result] = await pool.execute(sql, params) as [any, any[]];
    return result;
  } catch (error) {
    console.error('Error en execute:', sql, error);
    throw error;
  }
}

// ============================================================================
// API para Estudiantes
// ============================================================================
export const StudentAPI = {
  async getAll() {
    return query('SELECT * FROM students ORDER BY created_at DESC');
  },

  async getById(id: string) {
    const rows = await query('SELECT * FROM students WHERE id = ?', [id]);
    return (rows as any[])[0] || null;
  },

  async getByDocument(document: string) {
    const rows = await query('SELECT * FROM students WHERE document = ?', [document]);
    return (rows as any[])[0] || null;
  },

  async create(data: {
    id: string;
    name: string;
    document: string;
    status: 'Activo' | 'Pendiente' | 'Inactivo';
    sede_id?: string;
    email?: string;
    phone?: string;
  }) {
    const result = await execute(
      'INSERT INTO students (id, name, document, status, sede_id, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.id, data.name, data.document, data.status, data.sede_id || null, data.email || null, data.phone || null]
    );
    return result;
  },

  async updateStatus(id: string, status: 'Activo' | 'Pendiente' | 'Inactivo') {
    return execute('UPDATE students SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
  },

  async delete(id: string) {
    return execute('DELETE FROM students WHERE id = ?', [id]);
  },

  async getByLocation(sedeId: string) {
    return query(
      `SELECT s.* FROM students s 
       WHERE s.sede_id = ? 
       ORDER BY s.created_at DESC`,
      [sedeId]
    );
  },

  async getWithDetails(id: string) {
    return query(
      `SELECT 
        s.*, 
        se.city as sede,
        se.address as sede_address,
        GROUP_CONCAT(c.title SEPARATOR ', ') as courses
       FROM students s
       LEFT JOIN sedes se ON s.sede_id = se.id
       LEFT JOIN enrollments e ON s.id = e.student_id
       LEFT JOIN courses c ON e.course_id = c.id
       WHERE s.id = ?
       GROUP BY s.id`,
      [id]
    );
  },
};

// ============================================================================
// API para Cursos
// ============================================================================
export const CourseAPI = {
  async getAll() {
    return query('SELECT * FROM courses ORDER BY created_at DESC');
  },

  async getById(id: string) {
    const rows = await query('SELECT * FROM courses WHERE id = ?', [id]);
    return (rows as any[])[0] || null;
  },

  async getByLocation(sedeId: string) {
    return query(
      `SELECT DISTINCT c.* FROM courses c
       JOIN course_locations cl ON c.id = cl.course_id
       WHERE cl.sede_id = ?
       ORDER BY c.title`,
      [sedeId]
    );
  },

  async create(data: {
    id: string;
    title: string;
    modality: 'Presencial' | 'Virtual';
    level: 'Básico' | 'Intermedio' | 'Avanzado';
    duration_weeks: number;
    weekly_hours: number;
    description?: string;
    color?: string;
  }) {
    return execute(
      'INSERT INTO courses (id, title, modality, level, duration_weeks, weekly_hours, description, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.id,
        data.title,
        data.modality,
        data.level,
        data.duration_weeks,
        data.weekly_hours,
        data.description || null,
        data.color || null,
      ]
    );
  },

  async getWithStats(id?: string) {
    const sql = `SELECT 
      c.*,
      COUNT(DISTINCT e.id) as total_enrollments,
      COUNT(DISTINCT CASE WHEN e.status = 'Activa' THEN e.id END) as active_enrollments,
      SUM(CASE WHEN p.status = 'Aprobado' THEN p.amount ELSE 0 END) as total_revenue
     FROM courses c
     LEFT JOIN enrollments e ON c.id = e.course_id
     LEFT JOIN payments p ON c.id = p.course_id
     ${id ? 'WHERE c.id = ?' : ''}
     GROUP BY c.id`;

    const params = id ? [id] : [];
    const results = await query(sql, params);
    return id ? (results as any[])[0] || null : results;
  },
};

// ============================================================================
// API para Matrículas
// ============================================================================
export const EnrollmentAPI = {
  async getAll() {
    return query(
      `SELECT e.*, s.name as student_name, c.title as course_title
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       JOIN courses c ON e.course_id = c.id
       ORDER BY e.created_at DESC`
    );
  },

  async getById(id: string) {
    const rows = await query(
      `SELECT e.*, s.name as student_name, c.title as course_title
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       JOIN courses c ON e.course_id = c.id
       WHERE e.id = ?`,
      [id]
    );
    return (rows as any[])[0] || null;
  },

  async getByStudent(studentId: string) {
    return query(
      `SELECT e.*, c.title as course_title, c.modality, c.level
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = ?
       ORDER BY e.created_at DESC`,
      [studentId]
    );
  },

  async create(data: {
    id: string;
    student_id: string;
    course_id: string;
    start_date: string;
    status: 'Activa' | 'Pendiente' | 'Cancelada';
  }) {
    return execute(
      'INSERT INTO enrollments (id, student_id, course_id, start_date, status) VALUES (?, ?, ?, ?, ?)',
      [data.id, data.student_id, data.course_id, data.start_date, data.status]
    );
  },

  async updateStatus(id: string, status: 'Activa' | 'Pendiente' | 'Cancelada') {
    return execute('UPDATE enrollments SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
  },
};

// ============================================================================
// API para Pagos
// ============================================================================
export const PaymentAPI = {
  async getAll() {
    return query(
      `SELECT p.*, s.name as student_name, c.title as course_title
       FROM payments p
       JOIN students s ON p.student_id = s.id
       JOIN courses c ON p.course_id = c.id
       ORDER BY p.payment_date DESC`
    );
  },

  async getById(id: string) {
    const rows = await query(
      `SELECT p.*, s.name as student_name, c.title as course_title
       FROM payments p
       JOIN students s ON p.student_id = s.id
       JOIN courses c ON p.course_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    return (rows as any[])[0] || null;
  },

  async getByStudent(studentId: string) {
    return query(
      `SELECT p.*, c.title as course_title
       FROM payments p
       JOIN courses c ON p.course_id = c.id
       WHERE p.student_id = ?
       ORDER BY p.payment_date DESC`,
      [studentId]
    );
  },

  async create(data: {
    id: string;
    student_id: string;
    course_id: string;
    enrollment_id?: string;
    amount: number;
    payment_date: string;
    status: 'Pendiente' | 'Aprobado' | 'Rechazado';
    payment_method?: string;
    notes?: string;
  }) {
    return execute(
      'INSERT INTO payments (id, student_id, course_id, enrollment_id, amount, payment_date, status, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.id,
        data.student_id,
        data.course_id,
        data.enrollment_id || null,
        data.amount,
        data.payment_date,
        data.status,
        data.payment_method || null,
        data.notes || null,
      ]
    );
  },

  async updateStatus(id: string, status: 'Pendiente' | 'Aprobado' | 'Rechazado') {
    return execute('UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
  },

  async getTotalRevenue() {
    const rows = await query(
      `SELECT 
        SUM(amount) as total,
        SUM(CASE WHEN status = 'Aprobado' THEN amount ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'Pendiente' THEN amount ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Rechazado' THEN amount ELSE 0 END) as rejected
       FROM payments`
    );
    return (rows as any[])[0] || { total: 0, approved: 0, pending: 0, rejected: 0 };
  },
};

// ============================================================================
// API para Sedes
// ============================================================================
export const LocationAPI = {
  async getAll() {
    return query('SELECT * FROM sedes ORDER BY created_at DESC');
  },

  async getById(id: string) {
    const rows = await query('SELECT * FROM sedes WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async getStats(id?: string) {
    const sql = `SELECT 
      se.*,
      COUNT(DISTINCT s.id) as total_students,
      COUNT(DISTINCT CASE WHEN s.status = 'Activo' THEN s.id END) as active_students,
      COUNT(DISTINCT e.id) as total_enrollments,
      COUNT(DISTINCT c.id) as available_courses
     FROM sedes se
     LEFT JOIN students s ON se.id = s.sede_id
     LEFT JOIN enrollments e ON s.id = e.student_id
     LEFT JOIN courses c ON e.course_id = c.id
     ${id ? 'WHERE se.id = ?' : ''}
     GROUP BY se.id`;

    const params = id ? [id] : [];
    const results = await query(sql, params);
    return id ? (results as any[])[0] || null : results;
  },
};

// ============================================================================
// API para Actividad Reciente
// ============================================================================
export const ActivityAPI = {
  async getRecent(limit: number = 50) {
    return query(
      `SELECT ra.*, s.name as student_name, c.title as course_title
       FROM recent_activity ra
       LEFT JOIN students s ON ra.student_id = s.id
       LEFT JOIN courses c ON ra.course_id = c.id
       ORDER BY ra.created_at DESC
       LIMIT ?`,
      [limit]
    );
  },

  async create(data: {
    id: string;
    kind: 'Matrícula' | 'Pago' | 'Curso' | 'Sede' | 'Estudiante';
    title: string;
    detail?: string;
    student_id?: string;
    course_id?: string;
  }) {
    return execute(
      'INSERT INTO recent_activity (id, kind, title, detail, student_id, course_id) VALUES (?, ?, ?, ?, ?, ?)',
      [data.id, data.kind, data.title, data.detail || null, data.student_id || null, data.course_id || null]
    );
  },
};

export { pool, testConnection };
