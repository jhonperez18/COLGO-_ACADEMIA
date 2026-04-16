# 📊 Configuración de Base de Datos MySQL - COLGO

Este documento explica cómo configurar la base de datos MySQL para tu aplicación COLGO.

## Estructura de la Base de Datos

Tu base de datos contiene las siguientes tablas principales:

### Tablas Principales
- **sedes**: Ubicaciones (Medellín, Bogotá, Virtual)
- **courses**: Cursos disponibles
- **students**: Estudiantes matriculados
- **enrollments**: Matrículas (relación estudiante-curso)
- **payments**: Pagos de estudiantes
- **recent_activity**: Registro de actividades
- **course_locations**: Relación cursos-sedes

### Datos Incluidos
- 3 sedes
- 6 cursos
- 8 estudiantes
- 8 matrículas
- 6 pagos registrados

---

## 🚀 Opción 1: Instalación Local con MySQL

### Requisitos
- MySQL 5.7+ o MariaDB 10.3+
- Cliente MySQL (`mysql` CLI) o MySQL Workbench

### Pasos

#### 1. Instalar MySQL
**Windows:**
```bash
# Descargar desde https://dev.mysql.com/downloads/mysql/
# O usar Chocolatey/Scoop
choco install mysql
```

**Mac:**
```bash
brew install mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install mysql-server
```

#### 2. Iniciar el servicio MySQL
**Windows:**
```bash
net start MySQL80  # Ajusta la versión según tu instalación
```

**Mac/Linux:**
```bash
sudo systemctl start mysql
```

#### 3. Ejecutar el Script
Navega a la carpeta `/database` y ejecuta:

```bash
# Con cliente MySQL (CLI)
mysql -u root -p < schema.sql

# Si MySQL está configurado sin contraseña
mysql -u root < schema.sql
```

**O importa desde MySQL Workbench:**
1. Abre MySQL Workbench
2. File → Open SQL Script
3. Selecciona `schema.sql`
4. Ejecuta (Ctrl + Shift + Enter)

#### 4. Verificar la creación
```bash
mysql -u root -p
```

```sql
USE colgo_db;
SHOW TABLES;
SELECT COUNT(*) FROM students;
```

---

## 🌐 Opción 2: Azure Database for MySQL

Si prefieres una solución en la nube:

### Crear un servidor en Azure

```bash
# Requiere Azure CLI instalado
az mysql flexible-server create \
  --resource-group miGrupo \
  --name colgo-db-server \
  --admin-user dbadmin \
  --admin-password "TuContraseña123!" \
  --location "Central US" \
  --sku-name Standard_B1s \
  --tier Burstable

# Obtener la dirección del servidor
az mysql flexible-server show \
  --resource-group miGrupo \
  --name colgo-db-server
```

### Conectar y ejecutar el script

```bash
mysql -h colgo-db-server.mysql.database.azure.com \
      -u dbadmin@colgo-db-server \
      -p < schema.sql
```

### Configurar Firewall (Azure)

```bash
az mysql flexible-server firewall-rule create \
  --name "allow-local" \
  --resource-group miGrupo \
  --server-name colgo-db-server \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255
```

---

## 🔌 Conectar desde tu Aplicación React

### Opción A: Backend Node.js/Express

#### 1. Instalar dependencias
```bash
npm install mysql2 dotenv
```

#### 2. Crear archivo `.env`
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=colgo_db
DB_PORT=3306
```

#### 3. Crear módulo de conexión (`src/server/db.js`)
```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
```

#### 4. Ejemplo: Obtener estudiantes
```javascript
const pool = require('./db');

app.get('/api/students', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM students');
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Opción B: API REST con Prisma ORM

#### 1. Instalar Prisma
```bash
npm install @prisma/client prisma
```

#### 2. Inicializar Prisma
```bash
npx prisma init
```

#### 3. Actualizar `.env`
```env
DATABASE_URL="mysql://root:password@localhost:3306/colgo_db"
```

#### 4. Ejecutar migration (para sincronizar con la BD)
```bash
npx prisma migrate dev --name init
```

---

## 🔍 Consultas Útiles

### Obtener estudiantes activos
```sql
SELECT * FROM v_student_details WHERE status = 'Activo';
```

### Ingresos por curso
```sql
SELECT * FROM v_revenue_by_course;
```

### Estudiantes por sede
```sql
SELECT * FROM v_active_students_by_location;
```

### Registrar una nueva matrícula
```sql
INSERT INTO enrollments (id, student_id, course_id, start_date, status)
VALUES ('enr_009', 'stu_001', 'crs_002', NOW(), 'Pendiente');
```

### Actualizar estado de pago
```sql
UPDATE payments SET status = 'Aprobado' WHERE id = 'pay_002';
```

---

## 📋 Respaldos

### Hacer backup
```bash
mysqldump -u root -p colgo_db > backup_colgo_$(date +%Y%m%d).sql
```

### Restaurar backup
```bash
mysql -u root -p colgo_db < backup_colgo_20240101.sql
```

---

## ⚠️ Seguridad

Recomendaciones de seguridad:

1. **No uses "root"** en producción:
   ```sql
   CREATE USER 'colgo_user'@'localhost' IDENTIFIED BY 'contraseña_segura';
   GRANT ALL PRIVILEGES ON colgo_db.* TO 'colgo_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Usa contraseñas fuertes** (mínimo 16 caracteres)

3. **Habilita SSL** en Azure MySQL

4. **Actualiza MySQL regularmente** a parches de seguridad

---

## 🐛 Troubleshooting

### Error: "Access denied"
```bash
# Reinicia MySQL y conecta sin contraseña (si es necesario)
mysql -u root --skip-password
```

### Error: "Database already exists"
Elimina la BD existente primero:
```sql
DROP DATABASE IF EXISTS colgo_db;
```

### Error: "Unknown encryption algorithm"
Asegúrate de que tu versión de MySQL sea compatible:
```bash
mysql --version
```

---

## 📞 Soporte

Para más información:
- [Documentación MySQL](https://dev.mysql.com/doc/)
- [Azure Database for MySQL](https://learn.microsoft.com/en-us/azure/mysql/)
- [Prisma ORM](https://www.prisma.io/docs/)
