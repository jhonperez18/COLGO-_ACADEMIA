export type EstadoAcceso = 'activo' | 'suspendido' | 'cancelado' | 'finalizado'

export const ESTADOS_ACCESO: EstadoAcceso[] = ['activo', 'suspendido', 'cancelado', 'finalizado']

export const ETIQUETA_ESTADO_ACCESO: Record<EstadoAcceso, string> = {
  activo: 'Activo',
  suspendido: 'Suspendido',
  cancelado: 'Cancelado',
  finalizado: 'Finalizado',
}

export function normalizeEstadoAcceso(value: unknown, fallback: EstadoAcceso = 'activo'): EstadoAcceso {
  const v = String(value ?? '')
    .trim()
    .toLowerCase()
  return (ESTADOS_ACCESO as string[]).includes(v) ? (v as EstadoAcceso) : fallback
}

export function resolveEstadoAcceso(usuario: {
  estado_acceso?: string | null
  activo?: boolean
}): EstadoAcceso {
  if (usuario.estado_acceso) return normalizeEstadoAcceso(usuario.estado_acceso)
  return usuario.activo === false ? 'suspendido' : 'activo'
}

export function claseSelectEstadoAcceso(estado: EstadoAcceso): string {
  if (estado === 'activo') return 'border-emerald-300 bg-emerald-50 text-emerald-800'
  if (estado === 'suspendido') return 'border-amber-300 bg-amber-50 text-amber-900'
  if (estado === 'cancelado') return 'border-red-300 bg-red-50 text-red-800'
  return 'border-slate-300 bg-slate-100 text-slate-700'
}

export function claseBadgeEstadoAcceso(estado: EstadoAcceso): string {
  if (estado === 'activo') return 'text-emerald-700'
  if (estado === 'suspendido') return 'text-amber-700'
  if (estado === 'cancelado') return 'text-red-700'
  return 'text-slate-600'
}