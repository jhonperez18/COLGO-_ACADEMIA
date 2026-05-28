/**
 * URL pública única de producción (Vercel).
 * Tras renombrar el proyecto en Vercel a "colgo-academia", el host será colgo-academia.vercel.app
 */
/** Producción real (proyecto Vercel `colgo-academia`). No usar colgo-academia.vercel.app: dominio viejo bloqueado. */
export const PRODUCTION_ORIGIN = 'https://colgo-academia-rho.vercel.app'

export const PRODUCTION_LOGIN_URL = `${PRODUCTION_ORIGIN}/login`

export const PRODUCTION_API_BASE_URL = `${PRODUCTION_ORIGIN}/_backend/api`
