-- ===== TABLA DE USUARIOS =====
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'estudiante', 'docente', 'staff') NOT NULL DEFAULT 'estudiante',
  activo BOOLEAN DEFAULT TRUE,
  cambiar_password BOOLEAN DEFAULT FALSE,
  ultimo_acceso DATETIME NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_rol (rol)
);

-- ===== ACTIVIDAD Y TRAZABILIDAD =====
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
  INDEX idx_actividad_objetivo (objetivo_usuario_id, fecha),
  INDEX idx_actividad_accion (accion, fecha)
);

-- ===== TABLA DE ESTUDIANTES =====
CREATE TABLE IF NOT EXISTS estudiantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  documento VARCHAR(20) UNIQUE,
  tipo_documento VARCHAR(32),
  fecha_nacimiento DATE,
  telefono VARCHAR(20),
  direccion VARCHAR(255),
  ciudad VARCHAR(255),
  pais VARCHAR(120),
  departamento VARCHAR(120),
  municipio VARCHAR(180),
  estado_civil VARCHAR(50),
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id)
);

-- ===== TABLA DE DOCENTES =====
CREATE TABLE IF NOT EXISTS docentes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  documento VARCHAR(20) UNIQUE,
  especialidad VARCHAR(100),
  telefono VARCHAR(20),
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id)
);

-- ===== TABLA DE CURSOS =====
CREATE TABLE IF NOT EXISTS cursos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  docente_id INT,
  creditos INT DEFAULT 3,
  capacidad INT DEFAULT 30,
  semestre INT,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE SET NULL,
  INDEX idx_codigo (codigo),
  INDEX idx_docente (docente_id)
);

-- ===== TABLA DE HORARIOS =====
CREATE TABLE IF NOT EXISTS horarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NOT NULL,
  dia_semana ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'),
  hora_inicio TIME,
  hora_fin TIME,
  sala VARCHAR(50),
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
  INDEX idx_curso (curso_id)
);

-- ===== TABLA DE MATRÍCULAS =====
CREATE TABLE IF NOT EXISTS matriculas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id INT NOT NULL,
  curso_id INT NOT NULL,
  fecha_matricula TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('activa', 'completada', 'cancelada') DEFAULT 'activa',
  calificacion_final DECIMAL(5, 2),
  fecha_finalizacion DATE,
  observaciones TEXT,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
  UNIQUE KEY unique_matricula (estudiante_id, curso_id),
  INDEX idx_estudiante (estudiante_id),
  INDEX idx_curso (curso_id),
  INDEX idx_estado (estado)
);

-- ===== TABLA DE NOTAS =====
CREATE TABLE IF NOT EXISTS notas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matricula_id INT NOT NULL,
  evaluacion_numero INT NOT NULL,
  nota DECIMAL(5, 2) NOT NULL,
  descripcion VARCHAR(255),
  fecha_evaluacion DATE,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE CASCADE,
  INDEX idx_matricula (matricula_id),
  INDEX idx_fecha (fecha_evaluacion)
);

-- ===== TABLA DE CERTIFICADOS =====
CREATE TABLE IF NOT EXISTS certificados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matricula_id INT NOT NULL UNIQUE,
  numero_certificado VARCHAR(50) UNIQUE NOT NULL,
  fecha_emision DATE,
  fecha_descarga DATE,
  descargado BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE CASCADE,
  INDEX idx_matricula (matricula_id)
);

-- ===== TABLA DE AUDITORÍA =====
CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  accion VARCHAR(255) NOT NULL,
  tabla_afectada VARCHAR(50),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_usuario (usuario_id),
  INDEX idx_fecha (fecha)
);

-- ===== PERMISOS OPERATIVOS (POR CONFIANZA) =====
CREATE TABLE IF NOT EXISTS usuario_permisos (
  usuario_id INT PRIMARY KEY,
  nivel_confianza ENUM('baja', 'media', 'alta') NOT NULL DEFAULT 'baja',
  gestionar_usuarios BOOLEAN DEFAULT FALSE,
  asignar_cursos BOOLEAN DEFAULT FALSE,
  bloquear_usuarios BOOLEAN DEFAULT FALSE,
  ver_logs BOOLEAN DEFAULT FALSE,
  eliminar_usuarios BOOLEAN DEFAULT FALSE,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ===== TABLAS ACADÉMICAS (EXPANSIÓN SAAS) =====
CREATE TABLE IF NOT EXISTS programas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_programa_codigo (codigo),
  INDEX idx_programa_activo (activo)
);

ALTER TABLE cursos
  ADD COLUMN IF NOT EXISTS programa_id INT NULL,
  ADD COLUMN IF NOT EXISTS modalidad ENUM('virtual', 'presencial', 'mixta') DEFAULT 'mixta';

ALTER TABLE cursos
  ADD CONSTRAINT fk_cursos_programa
  FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS modulos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  descripcion TEXT,
  orden INT NOT NULL DEFAULT 1,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
  UNIQUE KEY unique_modulo_orden (curso_id, orden),
  INDEX idx_modulo_curso (curso_id)
);

CREATE TABLE IF NOT EXISTS clases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NOT NULL,
  modulo_id INT NULL,
  docente_id INT NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  tipo ENUM('virtual', 'presencial') NOT NULL,
  enlace_virtual VARCHAR(500) NULL,
  ubicacion VARCHAR(255) NULL,
  estado ENUM('programada', 'en_curso', 'finalizada', 'cancelada') DEFAULT 'programada',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
  FOREIGN KEY (modulo_id) REFERENCES modulos(id) ON DELETE SET NULL,
  FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE RESTRICT,
  INDEX idx_clases_curso_fecha (curso_id, fecha),
  INDEX idx_clases_docente_fecha (docente_id, fecha)
);

CREATE TABLE IF NOT EXISTS materiales_modulo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  modulo_id INT NOT NULL,
  docente_id INT NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  descripcion TEXT,
  url VARCHAR(500) NOT NULL,
  tipo ENUM('video', 'documento', 'enlace', 'otro') DEFAULT 'enlace',
  fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (modulo_id) REFERENCES modulos(id) ON DELETE CASCADE,
  FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE RESTRICT,
  INDEX idx_material_modulo (modulo_id)
);

CREATE TABLE IF NOT EXISTS asistencias_clase (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clase_id INT NOT NULL,
  estudiante_id INT NOT NULL,
  estado ENUM('presente', 'ausente', 'tarde', 'justificado') NOT NULL DEFAULT 'presente',
  observacion VARCHAR(255),
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clase_id) REFERENCES clases(id) ON DELETE CASCADE,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
  UNIQUE KEY unique_asistencia (clase_id, estudiante_id),
  INDEX idx_asistencia_clase (clase_id),
  INDEX idx_asistencia_estudiante (estudiante_id)
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo VARCHAR(80) NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  mensaje TEXT NOT NULL,
  entidad_tipo VARCHAR(80),
  entidad_id INT,
  leida BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_notif_usuario_fecha (usuario_id, fecha_creacion),
  INDEX idx_notif_usuario_leida (usuario_id, leida)
);

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS foto_url MEDIUMTEXT NULL;
