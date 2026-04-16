import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const sql = `
CREATE TABLE IF NOT EXISTS user_accounts (
  id VARCHAR(50) PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin') DEFAULT 'student',
  is_active TINYINT(1) DEFAULT 1,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_user_accounts_student_id (student_id),
  INDEX idx_user_accounts_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  student_id VARCHAR(50) NULL,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_phone VARCHAR(20),
  source ENUM('instagram', 'web') NOT NULL,
  status ENUM('pendiente', 'pagado', 'cancelado') DEFAULT 'pendiente',
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'COP',
  payment_provider VARCHAR(50),
  provider_reference VARCHAR(120) UNIQUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  INDEX idx_orders_student_id (student_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_source (source),
  INDEX idx_orders_buyer_email (buyer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  course_id VARCHAR(50) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_order_course (order_id, course_id),
  INDEX idx_order_items_order_id (order_id),
  INDEX idx_order_items_course_id (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id VARCHAR(50) PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  event_id VARCHAR(120) NOT NULL,
  order_id VARCHAR(50),
  status ENUM('received', 'processed', 'failed') DEFAULT 'received',
  payload JSON NOT NULL,
  error_message TEXT,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_provider_event (provider, event_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_payment_webhooks_order_id (order_id),
  INDEX idx_payment_webhooks_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_lessons (
  id VARCHAR(50) PRIMARY KEY,
  course_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT,
  duration_minutes INT DEFAULT 0,
  order_index INT NOT NULL,
  is_published TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_course_order_index (course_id, order_index),
  INDEX idx_course_lessons_course_id (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_materials (
  id VARCHAR(50) PRIMARY KEY,
  lesson_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(40),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE,
  INDEX idx_lesson_materials_lesson_id (lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_lesson_progress (
  id VARCHAR(50) PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  lesson_id VARCHAR(50) NOT NULL,
  progress_percent DECIMAL(5,2) DEFAULT 0.00,
  completed_at TIMESTAMP NULL,
  last_seen_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_lesson_progress (student_id, lesson_id),
  INDEX idx_student_lesson_progress_student_id (student_id),
  INDEX idx_student_lesson_progress_lesson_id (lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_evaluations (
  id VARCHAR(50) PRIMARY KEY,
  course_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  max_score DECIMAL(6,2) DEFAULT 100.00,
  passing_score DECIMAL(6,2) DEFAULT 70.00,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_course_evaluations_course_id (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluation_submissions (
  id VARCHAR(50) PRIMARY KEY,
  evaluation_id VARCHAR(50) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  score DECIMAL(6,2),
  grade_text VARCHAR(50),
  feedback TEXT,
  submitted_at TIMESTAMP NULL,
  evaluated_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluation_id) REFERENCES course_evaluations(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE KEY unique_evaluation_submission (evaluation_id, student_id),
  INDEX idx_evaluation_submissions_student_id (student_id),
  INDEX idx_evaluation_submissions_evaluation_id (evaluation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_certificates (
  id VARCHAR(50) PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  course_id VARCHAR(50) NOT NULL,
  enrollment_id VARCHAR(50),
  certificate_code VARCHAR(80) NOT NULL UNIQUE,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  pdf_url TEXT,
  status ENUM('issued', 'revoked') DEFAULT 'issued',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
  UNIQUE KEY unique_student_course_certificate (student_id, course_id),
  INDEX idx_student_certificates_student_id (student_id),
  INDEX idx_student_certificates_course_id (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW v_orders_access_summary AS
SELECT
  o.id AS order_id,
  o.source,
  o.status AS order_status,
  o.buyer_email,
  o.total_amount,
  o.created_at AS order_created_at,
  s.id AS student_id,
  s.name AS student_name,
  c.id AS course_id,
  c.title AS course_title,
  e.id AS enrollment_id,
  e.status AS enrollment_status
FROM orders o
LEFT JOIN students s ON o.student_id = s.id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN courses c ON oi.course_id = c.id
LEFT JOIN enrollments e ON e.student_id = s.id AND e.course_id = c.id;
`;

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'colgo_db',
  port: Number(process.env.DB_PORT || 3306),
  multipleStatements: true,
});

await connection.query(sql);
await connection.end();

console.log('Extension migration applied successfully.');
