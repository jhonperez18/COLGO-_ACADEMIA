import { PRODUCTION_API_BASE_URL } from './production'

export { PRODUCTION_API_BASE_URL }

function envApiUrlTrimmed(): string {
  // Buscamos la variable que configuramos en el panel de Vercel
  const v = import.meta.env.VITE_API_URL
  return v != null && String(v).trim() !== '' ? String(v).trim().replace(/\/$/, '') : ''
}

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url)
}

/** 
 * En el navegador desplegado: prioriza la variable de entorno, 
 * luego el origen actual y finalmente la constante de producción.
 */
export function resolveApiBaseUrl(): string {
  const fromEnv = envApiUrlTrimmed()
  
  // 1. Si estamos en local (localhost), usamos la variable del .env local o el puerto 3001
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    
    if (isLocal) {
      // Ruta relativa (p. ej. `/api`): mismo origen que Vite → `server.proxy` reenvía a Express (3001).
      if (fromEnv !== '' && fromEnv.startsWith('/')) {
        return fromEnv.replace(/\/$/, '')
      }
      if (fromEnv !== '' && /^https?:\/\//i.test(fromEnv)) {
        return fromEnv.replace(/\/$/, '')
      }
      // Sin variable (o no reconocida): proxy de Vite en `vite.config.ts`
      return '/api'
    }
  }

  // 2. Producción en Vercel: API en el mismo dominio (/_backend vía vercel.json)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host.endsWith('.vercel.app')) {
      if (fromEnv !== '' && fromEnv.startsWith('/')) {
        return fromEnv.replace(/\/$/, '')
      }
      return '/api'
    }
  }

  // 3. Fallback: variable de entorno absoluta o /api
  if (fromEnv !== '' && !isLocalhostUrl(fromEnv)) {
    return fromEnv.replace(/\/$/, '')
  }
  return PRODUCTION_API_BASE_URL.replace(/\/$/, '')
}