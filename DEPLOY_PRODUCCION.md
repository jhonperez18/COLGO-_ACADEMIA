# Despliegue: Git + Vercel (una sola URL)

## URL correcta (siempre la actual)

| Uso | URL |
|-----|-----|
| **App pública** | https://colgo-academi-saas.vercel.app/login |
| **API con datos** | https://colgo-academi-saas.onrender.com/api |

El repo en GitHub está conectado al proyecto Vercel **`colgo-academi-saas`**.  
Cada `git push` a `main` debe actualizar **colgo-academi-saas.vercel.app**.

## Por qué Git “abre una página vieja”

En GitHub → repositorio → **About** (⚙️) → **Website** suele estar:

`https://colgo-academia.vercel.app` ← **incorrecto** (deploy antiguo, sin API)

Cámbialo a:

`https://colgo-academi-saas.vercel.app`

Guarda. Ese es el enlace que debe compartir el equipo.

## Login en producción

El frontend en Vercel llama a la API en **Render** (ahí está la base MySQL/Aiven).

- Usuario: `MARIO` o `mario@colgo.edu`
- Contraseña: `123`

Si cambias variables en Vercel, ejecuta:

```bash
npm run vercel:env:production
npm run vercel:prod
```

## Variables en Vercel (ya configuradas por script)

- `VITE_API_URL` = `https://colgo-academi-saas.onrender.com/api`
- `FRONTEND_URL`, `CORS_ORIGIN`, `JWT_*`, `BOOTSTRAP_*`

Opcional: copia `.env.production.example` → `.env.production` con credenciales **Aiven** si quieres que el backend de Vercel use MySQL directo (sin Render).

## Local

`START_ALL.bat` → http://localhost:5173
