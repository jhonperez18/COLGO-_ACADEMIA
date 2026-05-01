# 🎯 VERIFICACIÓN Y TROUBLESHOOTING - INTERFAZ DE USUARIO

## ✅ PASO 1: Verificar que ambos servidores estén ejecutándose

### Opción A: Ejecutar manualmente en 2 terminales

**Terminal 1 - Frontend (Vite):**
```bash
cd d:\IUE\COLGO\colgo-academi-saas
npm run dev
```
✅ Deberías ver:
```
VITE v8.0.2 ready in XXX ms
➜  Local:   http://localhost:5173/
```

**Terminal 2 - Backend (Express):**
```bash
cd d:\IUE\COLGO\colgo-academi-saas
npm run server
```
✅ Deberías ver:
```
✅ Servidor COLGO ejecutándose
🔌 URL: /api
📊 API: /api
```

### Opción B: Ejecutar ambos automáticamente (RECOMENDADO)
Haz doble clic en: `START_ALL.bat`

Se abrirán 2 ventanas de comando automáticamente.

---

## ✅ PASO 2: Verificar que el navegador carga la interfaz

1. Abre navegador en: **http://localhost:5173**
2. Deberías ver la **página de LOGIN**

### Si ves ERRORES:

**❌ Error 1: "Cannot GET /"**
- El frontend no está sirviendo el HTML
- **Solución**: Verifica que `npm run dev` está ejecutándose en Terminal 1

**❌ Error 2: "ERR_CONNECTION_REFUSED"**
- El servidor Express no está corriendo
- **Solución**: Ejecuta `npm run server` en Terminal 2

**❌ Error 3: Página en blanco**
- Abre la consola del navegador (F12)
- Busca errores de JavaScript
- Copia el error completo

---

## ✅ PASO 3: Probar LOGIN con credenciales de prueba

En la página de login, ingresa:
- **Usuario:** `MARIO`
- **Contraseña:** `123`

### Si login FUNCIONA ✅
- Se abrirá el **Dashboard del Administrador**
- Verás: Cards, tablas, métricas

### Si login NO FUNCIONA ❌

**Abre la consola del navegador (F12) y busca:**

**Error 1: Network error**
```
GET /api/... FAILED
```
- El backend no está accesible
- Solución: Verifica que Express esté corriendo en puerto 3001

**Error 2: Error en autenticación**
```
"Usuario o contraseña incorrectos"
```
- Verifica exactamente qué escribiste
- Intenta: `mario` (minúscula) o `mario@colgo.edu`

**Error 3: Página se cierra/redirecciona a login**
- Hay un error en el frontend
- Abre F12 → Console tab
- Copia y pega cualquier error rojo

---

## ✅ PASO 4: Verificar conexión Frontend ↔ Backend

Abre la pestaña **Network** en F12 (Developer Tools) y:

1. Recarga la página (F5)
2. Busca solicitudes que comiencen con `localhost:3001`
3. Haz clic en una y verifica:
   - **Status:** 200 (verde ✅) o 404 (rojo ❌)
   - **Response:** Debes ver JSON

Ejemplo de solicitud correcta:
```
GET /api/health → Status 200
Response: { "status": "OK", "timestamp": "2026-04-20T..." }
```

---

## 🔧 SOLUCIONES RÁPIDAS POR PROBLEMA

### Problema 1: "No se conecta al backend"
```bash
# Verifica que el puerto 3001 no está en uso
netstat -ano | findstr :3001

# Si algo está usando el puerto, detén el proceso
taskkill /PID <PID> /F

# Reinicia el servidor
npm run server
```

### Problema 2: "El frontend no carga"
```bash
# Limpia el cache de npm y vuelve a instalar
rm -r node_modules
npm install

# Reinicia Vite
npm run dev
```

### Problema 3: "Errores de TypeScript"
```bash
# Compila TypeScript
npm run build

# Busca errores específicos
npx tsc --noEmit
```

### Problema 4: "Variables de entorno no cargan"
- Asegúrate que `.env` existe en la raíz del proyecto
- Contiene estas líneas (MÍNIMO):
  ```
  PORT=3001
  DB_HOST=localhost
  DB_USER=root
  CORS_ORIGIN=http://localhost:5173
  VITE_API_URL=/api
  ```

---

## 📋 CHECKLIST - "TODO FUNCIONA" ✅

Cuando veas TODAS estas cosas, todo está bien:

- [ ] Terminal 1 muestra: `VITE v8.0.2 ready in XXX ms`
- [ ] Terminal 2 muestra: `✅ Servidor COLGO ejecutándose`
- [ ] Navegador en http://localhost:5173 muestra página de LOGIN
- [ ] Campo de usuario y contraseña son visibles
- [ ] Puedes escribir en los campos
- [ ] Login con `MARIO` / `123` funciona
- [ ] Se abre el Dashboard después de login
- [ ] Ves cards, tablas y métricas en el dashboard
- [ ] Console del navegador (F12) NO tiene errores rojos

---

## 🆘 PROBLEMAS COMUNES

| Problema | Síntoma | Solución |
|----------|---------|----------|
| BD no conecta | Error "Cannot connect to database" | Instala MySQL, crea BD `colgo_db` |
| Puerto ocupado | "Address already in use :3001" | `taskkill /PID <PID> /F` |
| Node no instalado | "npm: command not found" | Instala Node.js |
| Modulos faltantes | "Cannot find module X" | Ejecuta `npm install` |
| Firewall bloqueado | No se conecta al backend | Permite puertos 3001 y 5173 |

---

## 📞 AYUDA

Si ves un error específico, copia el mensaje completo y pégalo aquí.

Incluye también:
- ¿Qué terminal muestra el error? (Frontend o Backend)
- ¿Qué hiciste justo antes?
- Resultado de `npm --version` y `node --version`

---

## 🚀 SIGUIENTE PASO

Una vez que todo funcione:
→ Iremos a **FASE 2: Conectar Base de Datos Real**
