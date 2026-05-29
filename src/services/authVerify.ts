import { getAuthMe } from './apiClient'
import {
  clearSession,
  hasValidLocalSession,
  isSessionVerified,
  markSessionVerified,
} from '../state/authSession'

let verifyPromise: Promise<boolean> | null = null

export async function ensureServerSession(): Promise<boolean> {
  if (!hasValidLocalSession()) {
    return false
  }
  if (isSessionVerified()) {
    return true
  }
  if (!verifyPromise) {
    verifyPromise = getAuthMe()
      .then(() => {
        markSessionVerified()
        return true
      })
      .catch(() => false)
      .finally(() => {
        verifyPromise = null
      })
  }
  const ok = await verifyPromise
  if (!ok) {
    clearSession()
  }
  return ok
}
