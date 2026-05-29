import { getAuthMe } from './apiClient'
import {
  clearSession,
  hasValidLocalSession,
  isSessionVerified,
  markSessionVerified,
} from '../state/authSession'

let verifyPromise: Promise<boolean> | null = null

/** Valida el JWT con el servidor antes de mostrar rutas protegidas. */
export async function ensureServerSession(): Promise<boolean> {
  if (!hasValidLocalSession()) {
    clearSession()
    return false
  }
  if (isSessionVerified()) return true
  if (!verifyPromise) {
    verifyPromise = getAuthMe()
      .then(() => {
        markSessionVerified()
        return true
      })
      .catch(() => {
        clearSession()
        return false
      })
      .finally(() => {
        verifyPromise = null
      })
  }
  return verifyPromise
}
