/**
 * URL pública única de producción (Vercel).
 * Tras renombrar el proyecto en Vercel a "colgo-academia", el host será colgo-academia.vercel.app
 */
/** Producción = proyecto Vercel conectado a GitHub (`colgo-academi-saas`). */
export const PRODUCTION_ORIGIN = 'https://colgo-academi-saas.vercel.app'

/** API con base de datos en Render (hasta migrar DB_* a Vercel/Aiven). */
export const PRODUCTION_API_URL = 'https://colgo-academi-saas.onrender.com/api'

export const PRODUCTION_LOGIN_URL = `${PRODUCTION_ORIGIN}/login`

/** Fallback build-time si no hay `window` ni VITE_API_URL. */
export const PRODUCTION_API_BASE_URL = PRODUCTION_API_URL
