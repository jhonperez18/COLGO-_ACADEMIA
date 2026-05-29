import type { RegistroSistemaItem } from '../services/apiClient'

const ACCION_LABELS: Record<string, string> = {
  login_success: 'Inicio de sesión',
  login_failed: 'Intento fallido',
  login_blocked_user: 'Usuario bloqueado',
  usuario_creado: 'Usuario creado',
  usuario_actualizado: 'Usuario actualizado',
  usuario_eliminado: 'Usuario eliminado',
  password_reset: 'Contraseña restablecida',
}

export function registroAccionLabel(accion: string): string {
  const key = String(accion || '').trim()
  return ACCION_LABELS[key] || key.replace(/_/g, ' ')
}

export function registroActorLabel(row: RegistroSistemaItem): string {
  const email = String(row.actor_email || '').trim()
  if (email) return email.split('@')[0] || email
  if (row.actor_rol === 'admin') return 'Administrador'
  return row.actor_usuario_id ? `Usuario #${row.actor_usuario_id}` : 'Sistema'
}

export function splitRegistroFecha(fecha: string): { fecha: string; hora: string } {
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return { fecha: '—', hora: '—' }
  return {
    fecha: d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
    hora: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
}
