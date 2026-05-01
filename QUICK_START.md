# 🚀 Cómo Ejecutar el Servidor COLGO

## Opción 1: Rápida (Recomendada)

### En Windows:
Haz doble clic en:
- **`install-deps.bat`** - Instala todas las dependencias
- **`start-server.bat`** - Instala dependencias e inicia el servidor

### En Mac/Linux:
```bash
cd /path/to/colgo-academi-saas
npm install
npm run server
```

---

## Opción 2: Manual desde Terminal

### 1. Instalar dependencias
```cmd
cd d:\IUE\COLGO\colgo-academi-saas
npm install
```

### 2. Iniciar servidor
```cmd
npm run server
```

---

## Opción 3: Desarrollo Completo (Frontend + Backend)

En una terminal ejecuta el frontend:
```cmd
npm run dev
```

En otra terminal ejecuta el backend:
```cmd
npm run server
```

Ahora tienes:
- 🎨 Frontend en http://localhost:5173
- 🔌 Backend en /api

---

## Verificar que todo está funcionando

### Backend está listo si ves:
```
✅ Conexión MySQL exitosa. Versión: ...
✅ Servidor COLGO ejecutándose en /api
```

### Probar la API:
- Health check: /api/health
- DB test: /api/db-test
- Obtener estudiantes: /api/students

---

## Si hay problemas

### Error: "Cannot find module db"
1. Asegúrate de que ejecutaste `npm install`
2. Verifica que los archivos `src/server/db.ts`, `routes.ts`, `index.ts` existan

### Error: "Cannot connect to database"
1. Verifica que MySQL está corriendo
2. Revisa las credenciales en `.env`
3. Ejecuta `mysql < database/schema.sql` para crear la BD

### Error de permisos en PowerShell
- Abre cmd.exe como administrador
- O usa Git Bash en lugar de PowerShell

---

## Estructura del Proyecto

```
colgo-academi-saas/
├── src/
│   ├── server/           ← Backend (Node.js + Express)
│   │   ├── index.ts      ← Servidor principal
│   │   ├── db.ts         ← Conexión y APIs
│   │   └── routes.ts     ← Rutas API REST
│   ├── components/       ← Componentes React
│   ├── pages/            ← Páginas React
│   └── ...
├── database/
│   ├── schema.sql        ← Script BD MySQL
│   └── README.md         ← Guía BD
├── .env                  ← Configuración (local)
├── .env.example          ← Plantilla .env
├── package.json          ← Dependencias Node
├── tsconfig.server.json  ← Config TypeScript servidor
└── ...
```

---

¡Listo! 🎉
