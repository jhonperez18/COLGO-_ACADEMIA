# 🎓 COLGO - Sistema Académico Integral
## Guía de Implementación Completa

---

## ✅ Estado Actual del Proyecto

### Completado
- ✅ Base de Datos (schema.sql) - Todas las tablas necesarias
- ✅ Autenticación Backend - JWT, roles, endpoints seguros
- ✅ APIs Backend completas:
  - Admin: CRUD estudiantes, docentes, cursos
  - Estudiantes: Perfil, cursos, notas, horarios, certificados
  - Docentes: Cursos, estudiantes, calificaciones
  - Matrículas: Crear, listar, cancelar, certificados
- ✅ Frontend de Autenticación - Login con JWT real
- ✅ Sistema de rutas protegidas por rol
- ✅ Servicio API TypeScript para todas las llamadas

### En Construcción
- 🔄 Panel de Administrador (UI)
- ⏳ Panel de Estudiante (UI)
- ⏳ Panel de Docente (UI)
- ⏳ Sistema de Email (Nodemailer)

---

## 🚀 Instrucciones de Inicio

### 1️⃣ Instalar Dependencias

```bash
cd D:\IUE\COLGO\colgo-academi-saas
npm install
```

**Nota**: Las siguientes dependencias se agregaron:
- `bcryptjs` - Hashing de contraseñas
- `jsonwebtoken` - JWT
- `express-validator` - Validaciones
- `nodemailer` - Envío de emails

### 2️⃣ Crear Base de Datos

#### Opción A: MySQL Workbench
1. Abre MySQL Workbench
2. Crea una nueva consulta
3. Copia el contenido de `backend/schema.sql`
4. Ejecuta

#### Opción B: Línea de Comandos
```bash
mysql -u root -p colgo_db < backend/schema.sql
```

**Credenciales en `.env`:**
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Cebollito22.
DB_NAME=colgo_db
```

### 3️⃣ Crear Admin Inicial

Ejecuta en MySQL:

```sql
USE colgo_db;

-- Insertar admin inicial (contraseña: admin123)
INSERT INTO usuarios (email, password_hash, rol, activo, cambiar_password) VALUES
('admin@colgo.edu', '$2a$10$slYQmyNdGzin0rdAHF.remedK8KwZaIv2l4R5.pK1BpP.t/LK2TO', 'admin', TRUE, FALSE);
```

**Credenciales para login:**
- Email: `admin@colgo.edu`
- Contraseña: `admin123`

### 4️⃣ Ejecutar Backend y Frontend

**Terminal 1 - Backend:**
```bash
cd D:\IUE\COLGO\colgo-academi-saas
npm run server
```

Deberías ver:
```
✓ Backend COLGO corriendo en puerto 3001
✓ Entorno: development
✓ BD: colgo_db en localhost
```

**Terminal 2 - Frontend:**
```bash
cd D:\IUE\COLGO\colgo-academi-saas
npm run dev
```

Acceder a: `http://localhost:5173`

---

## 🔐 Prueba de Autenticación

### Login como Admin

1. Ve a http://localhost:5173/login
2. Email: `admin@colgo.edu`
3. Contraseña: `admin123`
4. Deberías ver el dashboard admin

### Endpoints de Prueba (con Postman/cURL)

```bash
# 1. Login
curl -X POST /api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@colgo.edu",
    "password": "admin123"
  }'

# Respuesta:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": 1,
    "email": "admin@colgo.edu",
    "rol": "admin",
    "cambiar_password": false
  }
}

# 2. Usar token en otra llamada
curl -X GET /api/admin/estadisticas \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## 📊 Flujo Completo: Admin → Matricular → Estudiante

### Paso 1: Admin crea Estudiante

```bash
curl -X POST /api/admin/estudiantes \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan.perez@ejemplo.com",
    "documento": "1234567890"
  }'

# Respuesta:
{
  "success": true,
  "message": "Estudiante creado exitosamente",
  "email": "juan.perez@ejemplo.com",
  "contraseña_temporal": "kX9pL2m5",
  "nota": "El estudiante debe cambiar esta contraseña al primer login"
}
```

### Paso 2: Admin crea Curso

```bash
curl -X POST /api/admin/cursos \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Programación en Python",
    "codigo": "PY101",
    "descripcion": "Curso introductorio",
    "creditos": 3,
    "capacidad": 30,
    "semestre": 1
  }'
```

### Paso 3: Admin crea Matrícula

```bash
curl -X POST /api/matriculas/crear \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "estudiante_id": 2,
    "curso_id": 1
  }'
```

### Paso 4: Estudiante se logea

- Email: `juan.perez@ejemplo.com`
- Contraseña: `kX9pL2m5` (temporal)
- El sistema debe redirigir a `/student-dashboard`

---

## 🔑 Variables de Entorno (.env)

Copia y actualiza las siguientes variables:

```env
# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Cebollito22.
DB_NAME=colgo_db

# Servidor
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173

# JWT
JWT_SECRET=tu_clave_secreta_muy_segura_aqui_colgo_2026
JWT_EXPIRES_IN=7d

# Frontend
VITE_API_URL=/api

# Email (para envío de credenciales)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password_generada
SMTP_FROM=noreply@colgo.edu

# Seguridad
PASSWORD_MIN_LENGTH=8
```

### ⚙️ Configurar Email (Opcional)

Para envío de credenciales automático:

1. **Gmail:**
   - Activar autenticación de 2 pasos
   - Generar "contraseña de aplicación"
   - Usar esa contraseña en `SMTP_PASSWORD`

2. **Outlook/Office365:**
   ```
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_USER=tu@outlook.com
   SMTP_PASSWORD=tucontraseña
   ```

---

## 📁 Estructura de Archivos Creados

```
backend/
├── index.js                 ✨ Servidor Express nuevo
├── db.js                    ✨ Conexión MySQL mejorada
├── schema.sql               ✨ Base de datos completa
├── middleware/
│   └── auth.js             ✨ Autenticación JWT
├── routes/
│   ├── auth.js             ✨ Login, registro
│   ├── admin.js            ✨ CRUD admin
│   ├── student.js          ✨ Panel estudiante
│   ├── teacher.js          ✨ Panel docente
│   └── matriculas.js       ✨ Matrículas

src/
├── App.tsx                  ✨ Rutas protegidas
├── components/
│   └── ProtectedRoute.tsx   ✨ Componente nuevo
├── pages/
│   └── LoginPage.tsx        ✨ Login mejorado
├── state/
│   └── authContext.tsx      ✨ Contexto auth actualizado
└── services/
    └── api.ts              ✨ Cliente API completo
```

---

## 🧪 Pruebas Rápidas

### 1. Health Check
```bash
curl /api/health
# {"status":"ok","message":"Backend COLGO funcionando"}
```

### 2. Estadísticas (requiere token)
```bash
curl -H "Authorization: Bearer TOKEN" \
  /api/admin/estadisticas
```

### 3. Listar Estudiantes
```bash
curl -H "Authorization: Bearer TOKEN" \
  /api/admin/estudiantes
```

---

## 🐛 Solución de Problemas

### Error: "ECONNREFUSED"
**Problema**: Backend no está corriendo
**Solución**: Ejecuta `npm run server` en otra terminal

### Error: "PROTOCOL_CONNECTION_LOST"
**Problema**: Base de datos no disponible
**Solución**: 
- Verifica credenciales en `.env`
- Asegúrate que MySQL está corriendo
- Verifica que la BD `colgo_db` existe

### Error: "Token inválido o expirado"
**Problema**: Token JWT no válido
**Solución**: 
- Haz login nuevamente
- Verifica que `JWT_SECRET` es igual en backend y frontend

### Error: "No tienes permiso"
**Problema**: Rol de usuario insuficiente
**Solución**: Usa admin para crear recursos

---

## 📋 Próximas Tareas

### Urgentes (esta semana)
1. [ ] Implementar UI del Panel Admin
2. [ ] Conectar formularios a APIs
3. [ ] Implementar UI del Panel Estudiante
4. [ ] Implementar UI del Panel Docente

### Importantes (próxima semana)
1. [ ] Sistema de Email automático
2. [ ] Validaciones frontend completas
3. [ ] Error handling robusto
4. [ ] Pruebas de flujo E2E

### Mejoras (después)
1. [ ] Cambiar contraseña en primer login
2. [ ] Recuperar contraseña
3. [ ] Auditoría de acciones
4. [ ] Reportes PDF
5. [ ] Notificaciones en tiempo real

---

## 📚 Documentación Adicional

Archivos de referencia:
- `QUICK_START.md` - Guía rápida
- `SETUP_BD.md` - Configuración de BD
- `plan.md` - Plan detallado del proyecto

---

## 🆘 Soporte

**Si algo no funciona:**

1. Revisa los logs en la terminal
2. Verifica que backend y frontend están ejecutándose
3. Comprueba que la BD tiene datos (usa MySQL Workbench)
4. Intenta limpiar cache del navegador (Ctrl+Shift+Del)
5. Reinicia ambos servidores

**Contacto**: soporte@colgo.edu

---

## ✨ Resumen de Implementación

| Feature | Backend | Frontend | Base de Datos |
|---------|---------|----------|---------------|
| Autenticación | ✅ JWT completo | ✅ Login + Context | ✅ Tabla usuarios |
| Estudiantes | ✅ CRUD API | 🔄 UI pendiente | ✅ Tablas listas |
| Docentes | ✅ CRUD API | 🔄 UI pendiente | ✅ Tablas listas |
| Cursos | ✅ CRUD API | 🔄 UI pendiente | ✅ Tablas listas |
| Matrículas | ✅ Full API | 🔄 UI pendiente | ✅ Tablas listas |
| Notas | ✅ API completa | 🔄 UI pendiente | ✅ Tablas listas |
| Email | ✅ Nodemailer setup | 🔄 Integración | ✅ Listo |

---

**Última actualización**: 2026-04-20
**Estado**: En desarrollo activo ✨
