-- ============================================================================
-- Base de datos COLGO - Sistema de Gestión Académica SaaS
-- ============================================================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS colgo_db;
USE colgo_db;

-- ============================================================================
-- TABLA: sedes (Ubicaciones/Sedes)
-- ============================================================================
CREATE TABLE sedes (
  id VARCHAR(50) PRIMARY KEY,
  city VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: courses (Cursos)
-- ============================================================================
CREATE TABLE courses (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL UNIQUE,
  modality ENUM('Presencial', 'Virtual') NOT NULL,
  level ENUM('Básico', 'Intermedio', 'Avanzado') NOT NULL,
  duration_weeks INT NOT NULL,
  weekly_hours INT NOT NULL,
  description TEXT,
  color VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_title (title),
  INDEX idx_modality (modality),
  INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: course_locations (Relación Cursos - Sedes)
-- ============================================================================
CREATE TABLE course_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id VARCHAR(50) NOT NULL,
  sede_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE CASCADE,
  UNIQUE KEY unique_course_sede (course_id, sede_id),
  INDEX idx_course_id (course_id),
  INDEX idx_sede_id (sede_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: students (Estudiantes)
-- ============================================================================
CREATE TABLE students (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  document VARCHAR(50) NOT NULL UNIQUE,
  status ENUM('Activo', 'Pendiente', 'Inactivo') DEFAULT 'Pendiente',
  sede_id VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE SET NULL,
  INDEX idx_document (document),
  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_sede_id (sede_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: enrollments (Matrículas)
-- ============================================================================
CREATE TABLE enrollments (
  id VARCHAR(50) PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  course_id VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status ENUM('Activa', 'Pendiente', 'Cancelada') DEFAULT 'Pendiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_student_id (student_id),
  INDEX idx_course_id (course_id),
  INDEX idx_status (status),
  INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: payments (Pagos)
-- ============================================================================
CREATE TABLE payments (
  id VARCHAR(50) PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  course_id VARCHAR(50) NOT NULL,
  enrollment_id VARCHAR(50),
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  status ENUM('Pendiente', 'Aprobado', 'Rechazado') DEFAULT 'Pendiente',
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
  INDEX idx_student_id (student_id),
  INDEX idx_course_id (course_id),
  INDEX idx_status (status),
  INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: recent_activity (Actividad Reciente)
-- ============================================================================
CREATE TABLE recent_activity (
  id VARCHAR(50) PRIMARY KEY,
  kind ENUM('Matrícula', 'Pago', 'Curso', 'Sede', 'Estudiante') NOT NULL,
  title VARCHAR(255) NOT NULL,
  detail TEXT,
  student_id VARCHAR(50),
  course_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_kind (kind),
  INDEX idx_created_at (created_at),
  INDEX idx_student_id (student_id),
  INDEX idx_course_id (course_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERTAR DATOS INICIALES: SEDES
-- ============================================================================
INSERT INTO sedes (id, city, address, phone, color) VALUES
('sed_001', 'Medellín', 'Cll 10 #5-50, Medellín', '(4) 2123456', '#fbbf24'),
('sed_002', 'Bogotá', 'Cra 7 #24-89, Bogotá', '(1) 7654321', '#f59e0b'),
('sed_003', 'Virtual', 'Plataforma Virtual', '(1) 8000000', '#3b82f6');

-- ============================================================================
-- INSERTAR DATOS INICIALES: CURSOS
-- ============================================================================
INSERT INTO courses (id, title, modality, level, duration_weeks, weekly_hours, description, color) VALUES
('crs_001', 'Corte y Confección Básico', 'Presencial', 'Básico', 8, 6, 'Domina el proceso completo: patrones, costura y acabado con acompañamiento experto.', '#fbbf24'),
('crs_002', 'Patronaje para Iniciantes', 'Virtual', 'Básico', 6, 4, 'Aprende a construir patrones base y ajustarlos con técnicas claras y ejercicios guiados.', '#f59e0b'),
('crs_003', 'Confección de Blusas', 'Presencial', 'Intermedio', 7, 5, 'De la medida al resultado: frunces, cierres, cuellos y acabados profesionales.', '#fbbf24'),
('crs_004', 'Moda Sostenible', 'Virtual', 'Intermedio', 5, 3, 'Transforma prendas con enfoque en materiales y técnicas de bajo impacto.', '#f59e0b'),
('crs_005', 'Patronaje Avanzado', 'Presencial', 'Avanzado', 9, 6, 'Modelaje avanzado, tallaje y ajustes para lograr fit perfecto en cada proyecto.', '#fbbf24'),
('crs_006', 'Confección de Pantalones', 'Virtual', 'Avanzado', 8, 4, 'Construcción de patrones, vistas, pretinas y terminaciones con alta precisión.', '#f59e0b');

-- ============================================================================
-- INSERTAR DATOS INICIALES: RELACIÓN CURSOS - SEDES
-- ============================================================================
INSERT INTO course_locations (course_id, sede_id) VALUES
('crs_001', 'sed_001'),
('crs_003', 'sed_001'),
('crs_005', 'sed_001'),
('crs_002', 'sed_002'),
('crs_004', 'sed_002'),
('crs_006', 'sed_002'),
('crs_002', 'sed_003'),
('crs_004', 'sed_003'),
('crs_006', 'sed_003');

-- ============================================================================
-- INSERTAR DATOS INICIALES: ESTUDIANTES
-- ============================================================================
INSERT INTO students (id, name, document, status, sede_id, created_at) VALUES
('stu_001', 'Mariana Gómez', '1.045.238.771', 'Activo', 'sed_001', NOW()),
('stu_002', 'Sofía Ríos', '1.109.882.314', 'Pendiente', 'sed_002', NOW()),
('stu_003', 'Daniela Herrera', '1.021.773.509', 'Activo', 'sed_003', NOW()),
('stu_004', 'Valentina Vargas', '1.096.341.018', 'Inactivo', 'sed_001', NOW()),
('stu_005', 'Paola Martínez', '1.145.992.660', 'Activo', 'sed_002', NOW()),
('stu_006', 'Camila Álvarez', '1.018.244.991', 'Pendiente', 'sed_003', NOW()),
('stu_007', 'Andrea Molina', '1.082.990.122', 'Activo', 'sed_001', NOW()),
('stu_008', 'Laura Duarte', '1.061.332.778', 'Inactivo', 'sed_002', NOW());

-- ============================================================================
-- INSERTAR DATOS INICIALES: MATRÍCULAS
-- ============================================================================
INSERT INTO enrollments (id, student_id, course_id, start_date, status, created_at) VALUES
('enr_001', 'stu_001', 'crs_001', DATE_SUB(CURDATE(), INTERVAL 15 DAY), 'Activa', NOW()),
('enr_002', 'stu_002', 'crs_002', DATE_SUB(CURDATE(), INTERVAL 30 DAY), 'Pendiente', NOW()),
('enr_003', 'stu_003', 'crs_004', DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'Activa', NOW()),
('enr_004', 'stu_004', 'crs_001', DATE_SUB(CURDATE(), INTERVAL 60 DAY), 'Cancelada', NOW()),
('enr_005', 'stu_005', 'crs_003', DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'Activa', NOW()),
('enr_006', 'stu_006', 'crs_006', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'Pendiente', NOW()),
('enr_007', 'stu_007', 'crs_005', DATE_SUB(CURDATE(), INTERVAL 25 DAY), 'Activa', NOW()),
('enr_008', 'stu_008', 'crs_002', DATE_SUB(CURDATE(), INTERVAL 90 DAY), 'Cancelada', NOW());

-- ============================================================================
-- INSERTAR DATOS INICIALES: PAGOS
-- ============================================================================
INSERT INTO payments (id, student_id, course_id, enrollment_id, amount, payment_date, status, created_at) VALUES
('pay_001', 'stu_001', 'crs_001', 'enr_001', 450.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'Aprobado', NOW()),
('pay_002', 'stu_002', 'crs_002', 'enr_002', 350.00, DATE_SUB(CURDATE(), INTERVAL 25 DAY), 'Pendiente', NOW()),
('pay_003', 'stu_003', 'crs_004', 'enr_003', 300.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'Aprobado', NOW()),
('pay_004', 'stu_005', 'crs_003', 'enr_005', 425.00, DATE_SUB(CURDATE(), INTERVAL 15 DAY), 'Aprobado', NOW()),
('pay_005', 'stu_006', 'crs_006', 'enr_006', 380.00, CURDATE(), 'Pendiente', NOW()),
('pay_006', 'stu_007', 'crs_005', 'enr_007', 500.00, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'Aprobado', NOW());

-- ============================================================================
-- INSERTAR DATOS INICIALES: ACTIVIDAD RECIENTE
-- ============================================================================
INSERT INTO recent_activity (id, kind, title, detail, student_id, course_id, created_at) VALUES
('act_001', 'Matrícula', 'Nueva matrícula registrada', 'Mariana Gómez - Corte y Confección Básico', 'stu_001', 'crs_001', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
('act_002', 'Pago', 'Pago aprobado', 'Mariana Gómez · Corte y Confección Básico', 'stu_001', 'crs_001', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('act_003', 'Matrícula', 'Actualización de estado', 'Sofía Ríos cambió a Pendiente', 'stu_002', NULL, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
('act_004', 'Pago', 'Pago pendiente', 'Camila Álvarez · Confección de Pantalones', 'stu_006', 'crs_006', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
('act_005', 'Matrícula', 'Matrícula activa', 'Daniela Herrera · Moda Sostenible => Activa', 'stu_003', 'crs_004', DATE_SUB(NOW(), INTERVAL 5 HOUR));

-- ============================================================================
-- CREAR VISTAS ÚTILES
-- ============================================================================

-- Vista: Estudiantes con información de su sede y curso actual
CREATE VIEW v_student_details AS
SELECT 
  s.id,
  s.name,
  s.document,
  s.status,
  se.city as sede,
  se.address as sede_address,
  c.title as course_title,
  c.modality,
  c.level,
  e.status as enrollment_status,
  e.start_date
FROM students s
LEFT JOIN sedes se ON s.sede_id = se.id
LEFT JOIN enrollments e ON s.id = e.student_id
LEFT JOIN courses c ON e.course_id = c.id
ORDER BY s.created_at DESC;

-- Vista: Resumen de ingresos por curso
CREATE VIEW v_revenue_by_course AS
SELECT 
  c.title,
  c.modality,
  COUNT(DISTINCT p.id) as total_payments,
  COUNT(DISTINCT CASE WHEN p.status = 'Aprobado' THEN p.id END) as approved_payments,
  SUM(CASE WHEN p.status = 'Aprobado' THEN p.amount ELSE 0 END) as revenue,
  SUM(CASE WHEN p.status = 'Pendiente' THEN p.amount ELSE 0 END) as pending_amount
FROM courses c
LEFT JOIN payments p ON c.id = p.course_id
GROUP BY c.id, c.title, c.modality;

-- Vista: Estudiantes activos por sede
CREATE VIEW v_active_students_by_location AS
SELECT 
  se.city,
  COUNT(DISTINCT s.id) as total_students,
  COUNT(DISTINCT CASE WHEN s.status = 'Activo' THEN s.id END) as active_students,
  COUNT(DISTINCT e.id) as total_enrollments,
  COUNT(DISTINCT CASE WHEN e.status = 'Activa' THEN e.id END) as active_enrollments
FROM sedes se
LEFT JOIN students s ON se.id = s.sede_id
LEFT JOIN enrollments e ON s.id = e.student_id
GROUP BY se.id, se.city;

-- ============================================================================
-- CREAR ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX idx_enrollments_student_course ON enrollments(student_id, course_id);
CREATE INDEX idx_payments_student_course ON payments(student_id, course_id);
CREATE INDEX idx_recent_activity_created_at ON recent_activity(created_at DESC);

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
