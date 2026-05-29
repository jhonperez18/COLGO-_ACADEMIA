/**
 * URL pública única de producción (Vercel).
 * Tras renombrar el proyecto en Vercel a "colgo-academia", el host será colgo-academia.vercel.app
 */
/** URL pública de producción (Vercel + GitHub). */
export const PRODUCTION_ORIGIN = 'https://project-bm9ko.vercel.app'

/** API en el mismo dominio Vercel (backend serverless + Aiven). */
export const PRODUCTION_API_URL = '/api'

export const PRODUCTION_LOGIN_URL = `${PRODUCTION_ORIGIN}/login`

/** Fallback build-time si no hay `window` ni VITE_API_URL. */
export const PRODUCTION_API_BASE_URL = PRODUCTION_API_URL
