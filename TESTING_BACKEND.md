# 🧪 GUÍA DE TESTING - BACKEND COLGO

## 📋 PREREQUISITOS

1. **MySQL corriendo** en `localhost:3306`
2. **Database `colgo_db` creada** (ejecutar schema.sql)
3. **Credenciales en .env** configuradas correctamente
4. **Node.js instalado** en el sistema

---

## 🚀 INICIAR BACKEND

```bash
# En la carpeta raíz del proyecto
node backend/index.js

# Debería ver:
# ✓ Backend COLGO corriendo en puerto 3001
# ✓ Entorno: development
# ✓ BD: colgo_db en localhost
```

---

## 🧪 TESTING CON POSTMAN O THUNDER CLIENT

### 1️⃣ HEALTH CHECK
```
GET /api/health

Response:
{
  "status": "ok",
  "message": "Backend COLGO funcionando"
}
```

---

## 🔐 TEST 1: LOGIN (Admin existente)

**Primero necesitas un usuario admin en BD. Ejecuta este SQL:**

```sql
-- Crear usuario admin
INSERT INTO usuarios (email, password_hash, rol, activo) VALUES (
  'admin@colgo.edu',
  '$2a$10$...hash_de_admin123_con_bcrypt...',
  'admin',
  true
);

-- O usa bcrypt online para generar hash de: admin123
-- Hash aproximado: $2a$10$9r8wvrvt1XkEeGk9m8kmu.ZfZkWZQ9XQQp4VjMZqpRLqJ8vQzVw2O
```

**Test Login:**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@colgo.edu",
  "password": "admin123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "email": "admin@colgo.edu",
    "rol": "admin",
    "cambiar_password": false
  }
}

⭐ GUARDAR EL TOKEN - LO USAREMOS EN LOS SIGUIENTES TESTS
```

---

## 👤 TEST 2: CREAR ESTUDIANTE (Admin)

```
POST /api/admin/estudiantes
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@colgo.edu",
  "documento": "1001234567",
  "fecha_nacimiento": "2000-05-15",
  "telefono": "3001234567",
  "direccion": "Calle 1 #1",
  "ciudad": "Bogotá"
}

✓ Expected Response (201):
{
  "success": true,
  "message": "Estudiante creado exitosamente y email de credenciales enviado",
  "email": "juan@colgo.edu",
  "nota": "El estudiante recibirá un email con sus credenciales de acceso"
}

⚠️ NOTA: El email se enviará solo si SMTP está configurado correctamente
```

---

## 👨‍🏫 TEST 3: CREAR DOCENTE (Admin)

```
POST /api/admin/docentes
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "nombre": "María",
  "apellido": "González",
  "email": "maria@colgo.edu",
  "especialidad": "Matemáticas",
  "documento": "1076543210",
  "telefono": "3147654321"
}

✓ Expected Response (201):
{
  "success": true,
  "message": "Docente creado exitosamente",
  "email": "maria@colgo.edu",
  "nota": "Se ha enviado un email con las credenciales de acceso"
}
```

---

## 📚 TEST 4: CREAR CURSO (Admin)

```
POST /api/admin/cursos
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "nombre": "Matemáticas I",
  "codigo": "MAT101",
  "descripcion": "Introducción a cálculo",
  "docente_id": 1,
  "creditos": 3,
  "capacidad": 30,
  "semestre": 1
}

✓ Expected Response (201):
{
  "success": true,
  "message": "Curso creado exitosamente",
  "id": 1
}

⭐ GUARDAR EL ID DEL CURSO
```

---

## 📋 TEST 5: LISTAR ESTUDIANTES (Admin)

```
GET /api/admin/estudiantes
Authorization: Bearer YOUR_ADMIN_TOKEN

✓ Expected Response (200):
[
  {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "documento": "1001234567",
    "email": "juan@colgo.edu",
    "activo": true,
    "fecha_creacion": "2024-04-20T10:00:00Z"
  }
]
```

---

## 📋 TEST 6: LISTAR DOCENTES (Admin)

```
GET /api/admin/docentes
Authorization: Bearer YOUR_ADMIN_TOKEN

✓ Expected Response (200):
[
  {
    "id": 1,
    "nombre": "María",
    "apellido": "González",
    "especialidad": "Matemáticas",
    "email": "maria@colgo.edu",
    "activo": true
  }
]
```

---

## 📚 TEST 7: LISTAR CURSOS (Admin)

```
GET /api/admin/cursos
Authorization: Bearer YOUR_ADMIN_TOKEN

✓ Expected Response (200):
[
  {
    "id": 1,
    "nombre": "Matemáticas I",
    "codigo": "MAT101",
    "descripcion": "Introducción a cálculo",
    "creditos": 3,
    "capacidad": 30,
    "semestre": 1,
    "activo": true,
    "docente": "María González"
  }
]
```

---

## ✅ TEST 8: CREAR MATRÍCULA (Admin)

```
POST /api/matriculas/crear
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "estudiante_id": 1,
  "curso_id": 1
}

✓ Expected Response (201):
{
  "success": true,
  "message": "Matrícula creada exitosamente y notificación enviada",
  "id": 1,
  "estudiante": "juan@colgo.edu"
}

📧 El estudiante recibe email automático de matrícula confirmada
```

---

## TEST 9: LISTAR MATRÍCULAS (Admin)

```
GET /api/matriculas/listar
Authorization: Bearer YOUR_ADMIN_TOKEN

✓ Expected Response (200):
[
  {
    "id": 1,
    "fecha_matricula": "2024-04-20T10:00:00Z",
    "estado": "activa",
    "calificacion_final": null,
    "estudiante": "Juan Pérez",
    "curso": "Matemáticas I",
    "codigo": "MAT101"
  }
]
```

---

## 👤 TEST 10: LOGIN ESTUDIANTE

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "juan@colgo.edu",
  "password": "PasswordGeneradoAlCrear"
}

⚠️ IMPORTANTE: 
- El estudiante recibe su contraseña temporal por email
- Si no configuraste SMTP, usa: $2a$10$... (hash de contraseña temporal que generó el sistema)
- En desarrollo, puedes revisar la contraseña en el response de crear estudiante

✓ Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "email": "juan@colgo.edu",
    "rol": "estudiante",
    "cambiar_password": true
  }
}

⭐ GUARDAR TOKEN DE ESTUDIANTE
```

---

## 👤 TEST 11: VER PERFIL ESTUDIANTE

```
GET /api/student/perfil
Authorization: Bearer YOUR_STUDENT_TOKEN

✓ Expected Response (200):
{
  "id": 1,
  "nombre": "Juan",
  "apellido": "Pérez",
  "documento": "1001234567",
  "fecha_nacimiento": "2000-05-15",
  "telefono": "3001234567",
  "direccion": "Calle 1 #1",
  "ciudad": "Bogotá",
  "email": "juan@colgo.edu",
  "activo": true
}
```

---

## 📚 TEST 12: VER CURSOS MATRICULADOS (Estudiante)

```
GET /api/student/cursos
Authorization: Bearer YOUR_STUDENT_TOKEN

✓ Expected Response (200):
[
  {
    "id": 1,
    "nombre": "Matemáticas I",
    "codigo": "MAT101",
    "descripcion": "Introducción a cálculo",
    "creditos": 3,
    "matricula_id": 1,
    "estado": "activa",
    "calificacion_final": null,
    "fecha_matricula": "2024-04-20T10:00:00Z",
    "docente": "María González"
  }
]
```

---

## 👨‍🏫 TEST 13: LOGIN DOCENTE

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "maria@colgo.edu",
  "password": "PasswordGeneradoAlCrear"
}

✓ Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 2,
    "email": "maria@colgo.edu",
    "rol": "docente",
    "cambiar_password": true
  }
}

⭐ GUARDAR TOKEN DE DOCENTE
```

---

## 📚 TEST 14: VER CURSOS ASIGNADOS (Docente)

```
GET /api/teacher/cursos
Authorization: Bearer YOUR_TEACHER_TOKEN

✓ Expected Response (200):
[
  {
    "id": 1,
    "nombre": "Matemáticas I",
    "codigo": "MAT101",
    "descripcion": "Introducción a cálculo",
    "creditos": 3,
    "capacidad": 30,
    "semestre": 1,
    "estudiantes_inscritos": 1,
    "activo": true
  }
]
```

---

## 👥 TEST 15: VER ESTUDIANTES DEL CURSO (Docente)

```
GET /api/teacher/cursos/1/estudiantes
Authorization: Bearer YOUR_TEACHER_TOKEN

✓ Expected Response (200):
[
  {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "documento": "1001234567",
    "email": "juan@colgo.edu",
    "matricula_id": 1,
    "estado": "activa",
    "calificacion_final": null,
    "promedio_evaluaciones": null
  }
]
```

---

## 📊 TEST 16: REGISTRAR CALIFICACIÓN (Docente)

```
POST /api/teacher/cursos/1/estudiantes/1/notas
Authorization: Bearer YOUR_TEACHER_TOKEN
Content-Type: application/json

{
  "evaluacion_numero": 1,
  "nota": 4.5,
  "descripcion": "Quiz 1",
  "fecha_evaluacion": "2024-04-15"
}

✓ Expected Response (201):
{
  "success": true,
  "message": "Nota registrada exitosamente"
}
```

---

## ✅ CHECKLIST DE TESTING COMPLETO

- [ ] Health check funcionando
- [ ] Login de admin exitoso
- [ ] Crear estudiante (con email)
- [ ] Crear docente (con email)
- [ ] Crear curso
- [ ] Listar estudiantes
- [ ] Listar docentes
- [ ] Listar cursos
- [ ] Crear matrícula (con notificación)
- [ ] Listar matrículas
- [ ] Login de estudiante
- [ ] Ver perfil estudiante
- [ ] Ver cursos matriculados
- [ ] Login de docente
- [ ] Ver cursos asignados
- [ ] Ver estudiantes del curso
- [ ] Registrar calificación

---

## 🐛 TROUBLESHOOTING

### Error: "No autorizado" o "Token inválido"
```
✓ Asegúrate de:
1. Incluir header: Authorization: Bearer TOKEN
2. Usar el token correcto
3. Token no está expirado (TTL: 7 días)
```

### Error: "El email ya existe"
```
✓ Asegúrate de:
1. No crear usuarios con mismo email
2. Usar emails diferentes para cada test
```

### Error: "Base de datos no conectada"
```
✓ Asegúrate de:
1. MySQL está corriendo
2. .env tiene credenciales correctas
3. Database colgo_db existe
4. Schema.sql fue ejecutado
```

### Error: "Email no se envía"
```
✓ Asegúrate de:
1. SMTP_HOST, SMTP_USER, SMTP_PASSWORD en .env
2. Verificar credenciales SMTP
3. En desarrollo, revisar logs de la aplicación
```

---

## 📞 SOPORTE

Revisa los logs en la consola donde ejecutaste `node backend/index.js`
para más detalles sobre errores.

