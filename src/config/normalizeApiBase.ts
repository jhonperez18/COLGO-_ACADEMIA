import { resolveApiBaseUrl } from './apiBaseUrl'

/** Garantiza que la base termine en `/api` (Render, Vercel, local). */
export function normalizeApiBase(base?: string | null): string {
  const raw = String(base ?? '').trim()
  const source = raw !== '' ? raw : resolveApiBaseUrl()
  const trimmed = source.replace(/\/+$/, '')

  if (trimmed.endsWith('/api')) return trimmed

  if (trimmed.startsWith('/')) {
    return trimmed === '/' ? '/api' : `${trimmed}/api`
  }

  return `${trimmed}/api`
}
