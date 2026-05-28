# Un solo dominio: `colgo-academia.vercel.app`

Todo el código usa **`https://colgo-academia.vercel.app`** (login, API, correos, scripts).

Hoy en Vercel puede haber **dos proyectos**: uno viejo con nombre `colgo-academia` (sin API) y el activo con GitHub (`project-bm9ko`). Hay que dejar **un solo proyecto** con el nombre `colgo-academia`.

## Pasos en Vercel (una vez, ~5 min)

### 1. Identificar el proyecto conectado a GitHub

1. Entra en [vercel.com/dashboard](https://vercel.com/dashboard).
2. Abre el proyecto que hace deploy al hacer push a `COLGO-_ACADEMIA` (suele llamarse **project-bm9ko**).
3. En **Deployments**, confirma que el último deploy viene de GitHub (`main`).

### 2. Liberar el nombre `colgo-academia`

Si existe **otro** proyecto llamado `colgo-academia` (el viejo, sin API):

1. Ábrelo → **Settings** → al final **Delete Project**.
2. Confirma (solo si ese proyecto **no** es el que tiene GitHub conectado).

### 3. Renombrar el proyecto activo

En el proyecto **conectado a GitHub** (el que antes era `project-bm9ko`):

1. **Settings** → **General** → **Project Name**.
2. Cámbialo a: **`colgo-academia`** (minúsculas, con guión).
3. Guarda. Vercel asignará **`https://colgo-academia.vercel.app`**.

### 4. Variables de entorno (Production)

En **Settings → Environment Variables**, actualiza o crea:

| Variable | Valor |
|----------|--------|
| `FRONTEND_URL` | `https://colgo-academia.vercel.app` |
| `CORS_ORIGIN` | `https://colgo-academia.vercel.app` (y `http://localhost:5173` si desarrollas en local) |
| `VITE_API_URL` | `/_backend/api` o vacío (el front usa el mismo host) |

Mantén `DB_*`, `JWT_SECRET`, etc. como ya las tengas.

### 5. Redeploy

**Deployments** → último deploy → **Redeploy** (o haz un push a `main`).

### 6. Comprobar

- `https://colgo-academia.vercel.app/api/health` → JSON `status: ok`
- `https://colgo-academia.vercel.app/login` → pantalla actual
- `https://project-bm9ko.vercel.app/login` → debe redirigir a `colgo-academia` (config en `vercel.json`)

## En local

Sigue igual: `START_ALL.bat` → `http://localhost:5173`

## Producción en el navegador

`OPEN_PRODUCTION.bat` → `https://colgo-academia.vercel.app/login`
