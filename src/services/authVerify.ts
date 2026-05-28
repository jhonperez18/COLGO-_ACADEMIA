import { getAuthMe } from './apiClient'
import {
  clearSession,
  hasValidLocalSession,
  isSessionVerified,
  markSessionVerified,
} from '../state/authSession'

let verifyPromise: Promise<boolean> | null = null

/** Una sola validación remota por pestaña; el resto usa JWT local. */
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
