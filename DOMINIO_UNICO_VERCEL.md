# URL de producción (versión actual)

## Usa esta URL (código de hoy)

**https://colgo-academia-rho.vercel.app/login**

- Abre con `OPEN_PRODUCTION.bat`
- API: `https://colgo-academia-rho.vercel.app/api/health` → debe responder `status: ok`

También válida (mismo código, otro proyecto Vercel): **https://colgo-academi-saas.vercel.app**

## No uses esta URL (versión vieja)

**https://colgo-academia.vercel.app** → frontend del **23 may**, API en **404**.

Ese subdominio está **bloqueado** en Vercel (“already in use”) y no apunta al proyecto donde desplegamos. Por eso el navegador sigue mostrando una versión antigua aunque el código en GitHub esté actualizado.

## Recuperar `colgo-academia.vercel.app` (opcional)

1. [vercel.com/dashboard](https://vercel.com/dashboard) → **Domains** (o cada proyecto → **Settings → Domains**).
2. Busca quién usa `colgo-academia.vercel.app` (proyecto borrado, otro repo, etc.).
3. **Remove** el dominio de ese proyecto.
4. En el proyecto **colgo-academia** (el que usa `colgo-academia-rho`): **Add** → `colgo-academia.vercel.app`.
5. Redeploy.

Si no aparece en tu cuenta, abre ticket en Vercel para liberar el subdominio.

## Variables en Vercel (login y datos)

En el proyecto **colgo-academia** o **colgo-academi-saas** → **Settings → Environment Variables** (Production), configura al menos:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (MySQL accesible desde internet, p. ej. Aiven)
- `JWT_SECRET`
- `FRONTEND_URL` = `https://colgo-academia-rho.vercel.app`
- `CORS_ORIGIN` = `https://colgo-academia-rho.vercel.app,http://localhost:5173`
- `VITE_API_URL` = `/_backend/api` (o dejar vacío)

Sin `DB_*` la app carga pero el login en producción falla con error 500.

## Local

`START_ALL.bat` → http://localhost:5173
