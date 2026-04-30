import type { UserRole } from '../../state/authSession'
import { cn } from '../../utils/cn'
import {
  backofficeBottomAccentClass,
  backofficeDarkOrbBottomLeft,
  backofficeDarkOrbTopRight,
  backofficeDarkSurfaceGradient,
  backofficeDarkSurfaceInset,
} from './backofficeVisual'

/** Etiqueta del modo de interfaz (misma lógica en sidebar, ficha y cabeceras). */
export function rolEtiqueta(rol?: UserRole): string {
  if (rol === 'admin') return 'Administración'
  if (rol === 'staff') return 'Staff'
  if (rol === 'docente') return 'Docencia'
  if (rol === 'estudiante') return 'Estudiante'
  return 'Usuario'
}

type ColgoBrandBlockProps = {
  /** Texto del chip inferior (p. ej. rol de la sesión). */
  badgeLabel: string
  className?: string
  /** Igual que la cabecera oscura del miembro en ficha (degradado slate → ámbar). */
  variant?: 'default' | 'fichaHeader'
  /**
   * Con un contenedor padre en fila flex/grid con `items-stretch`, el bloque crece a la misma altura
   * que la cabecera del miembro; el chip queda al pie del recuadro.
   */
  alignHeightWithSibling?: boolean
}

/**
 * Bloque superior COLGO / Academia / lema + chip de contexto.
 * Mismo aspecto en panel principal (sidebar) y ficha de miembro.
 */
export function ColgoBrandBlock({
  badgeLabel,
  className,
  variant = 'default',
  alignHeightWithSibling = false,
}: ColgoBrandBlockProps) {
  const ficha = variant === 'fichaHeader'

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden',
        !ficha && 'border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
        ficha && cn('border-b-0', backofficeDarkSurfaceInset, backofficeDarkSurfaceGradient),
        alignHeightWithSibling ? 'flex h-full min-h-0 flex-col px-5 pb-4 pt-4' : 'px-5 pb-4 pt-4',
        className,
      )}
    >
      <div className={backofficeBottomAccentClass} aria-hidden />
      {ficha ? (
        <>
          <div className={backofficeDarkOrbTopRight} aria-hidden />
          <div className={backofficeDarkOrbBottomLeft} aria-hidden />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-[var(--accent)]/16 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-8 -left-10 h-24 w-24 rounded-full bg-amber-300/10 blur-xl" aria-hidden />
        </>
      )}

      <div className={cn('relative z-10', alignHeightWithSibling && 'flex min-h-0 flex-1 flex-col')}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">COLGO</p>
        <p className="mt-1.5 text-base font-semibold tracking-tight text-white">Academia</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">Sistema académico integral</p>
        {alignHeightWithSibling ? <div className="min-h-3 flex-1" aria-hidden /> : null}
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 backdrop-blur-sm',
            alignHeightWithSibling ? 'mt-auto shrink-0' : 'mt-3',
          )}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(253,224,71,0.7)]" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-300">{badgeLabel}</span>
        </div>
      </div>
    </div>
  )
}
