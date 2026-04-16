# 🔧 Verificación: Backend No Responde

Si ves el error: **"No se pudo conectar al servidor"**

## ✅ Checklist de Verificación

### 1. ¿El Backend está corriendo?

Abre una terminal **nueva** y ejecuta:

```bash
cd d:\IUE\COLGO\colgo-academi-saas
npm run server
```

Deberías ver esto:

```
✅ Conexión MySQL exitosa. Versión: 8.0.xx
✅ Servidor COLGO ejecutándose en http://localhost:3001
🏥 Health check en http://localhost:3001/api/health
🔗 DB test en http://localhost:3001/api/db-test
```

**Si NO ves esto**, el servidor no está corriendo correctamente.

---

### 2. Verificar que el Backend responde

En tu navegador, ve a: **http://localhost:3001/api/health**

Deberías ver:

```json
{
  "status": "OK",
  "timestamp": "2024-04-10T..."
}
```

Si ves un error estilo **"Cannot GET /api/health"** o **"Conexión rechazada"**, el servidor no está corriendo.

---

### 3. Verificar la Conexión a MySQL

En tu navegador, ve a: **http://localhost:3001/api/db-test**

Deberías ver:

```json
{
  "status": "connected",
  "database": "colgo_db"
}
```

Si ves error, verifica:
- ✅ MySQL está corriendo
- ✅ Las credenciales en `.env` son correctas
- ✅ La base de datos `colgo_db` existe

---

### 4. Verificar las Variables de Entorno

Abre [.env](.env) y asegúrate de que tenga:

```env
# Backend
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Cebollito22.
DB_NAME=colgo_db
PORT=3001
CORS_ORIGIN=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:3001/api
```

---

## 🚀 Solución: Iniciar Correctamente

Si todo falla, sigue este orden exacto:

### Terminal 1 - Backend
```bash
cd d:\IUE\COLGO\colgo-academi-saas
npm run server
```

**Espera** a que veas:
```
✅ Servidor COLGO ejecutándose en http://localhost:3001
```

### Terminal 2 - Frontend
Una vez que el backend esté listo, abre **OTRA terminal**:

```bash
cd d:\IUE\COLGO\colgo-academi-saas
npm run dev
```

**Espera** a que veas:
```
VITE v... ready in ... ms
➜  Local:   http://localhost:5173/
```

### Terminal 3 - MySQL (Opcional, solo si no corre)
Si MySQL no está corriendo:

```bash
# Windows
net start MySQL80

# O abre MySQL Workbench
```

---

## 💡 Debugging: Ver Errores en Consola

### Frontend (En el navegador F12)
Abre DevTools y ve a **Console** para ver errores detallados.

Verás logs como:
```
🔌 API Base URL: http://localhost:3001/api
📤 POST http://localhost:3001/api/students
❌ Error de conexión: Failed to fetch
```

### Backend (En Terminal)
Verás logs como:
```
[2024-04-10T10:30:00Z] POST /api/students
```

Si no ves logs, el servidor no está corriendo.

---

## 🐛 Problemas Comunes

### Error: "Error de conexión: Failed to fetch"
**Causa**: Backend no está en `http://localhost:3001`
**Solución**: 
1. Abre Terminal 1 con `npm run server`
2. Verifica http://localhost:3001/api/health en navegador
3. Recarga la página

### Error: "Cannot connect to database"  
**Causa**: MySQL no está corriendo o credenciales incorrectas
**Solución**:
1. Verifica que MySQL service está corriendo
2. Revisa credenciales en `.env`
3. Ejecuta: `mysql -u root -p Cebollito22. -e "USE colgo_db; SHOW TABLES;"`

### Error: "Port 3001 already in use"
**Causa**: Ya hay un servidor corriendo en ese puerto
**Solución**:
```bash
# Encuentra qué está usando el puerto
netstat -ano | findstr :3001

# Luego mata el proceso
taskkill /PID <pid> /F
```

---

## ✨ Si Todo Funciona

Verás en la consola del navegador:

```
🔌 API Base URL: http://localhost:3001/api
📤 POST http://localhost:3001/api/students
✅ Respuesta exitosa: { message: "Estudiante creado", id: "stu_xyz" }
```

Y en la tabla aparecerá el nuevo estudiante automáticamente. ✅

---

## 📞 Soporte Rápido

1. **¿No ves el servidor en 3001?** → `npm run server`
2. **¿No responde la URL?** → Verifica que está corriendo en Terminal 1
3. **¿Error de MySQL?** → Inicia MySQL y revisa credenciales
4. **¿Todavía falla?** → Revisa Console (F12) para ver el error exacto

