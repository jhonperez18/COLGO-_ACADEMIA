import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'
import type { ReactNode } from 'react'

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  className,
  compact,
  draggable = true,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
  className?: string
  /** Modal más estrecho y con menos padding (formularios cortos) */
  compact?: boolean
  /** Arrastrar desde la barra del título para ver el contenido detrás */
  draggable?: boolean
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ pointerId: number; sx: number; sy: number; ox: number; oy: number } | null>(null)
  const offsetRef = useRef(offset)
  offsetRef.current = offset

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (open) setOffset({ x: 0, y: 0 })
  }, [open])

  useEffect(() => {
    return () => {
      drag.current = null
    }
  }, [])

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    const o = offsetRef.current
    drag.current = {
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: o.x,
      oy: o.y,
    }

    const handleMove = (ev: PointerEvent) => {
      const d = drag.current
      if (!d || ev.pointerId !== d.pointerId) return
      setOffset({
        x: d.ox + (ev.clientX - d.sx),
        y: d.oy + (ev.clientY - d.sy),
      })
    }

    const handleUp = (ev: PointerEvent) => {
      const d = drag.current
      if (!d || ev.pointerId !== d.pointerId) return
      drag.current = null
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
      document.removeEventListener('pointercancel', handleUp)
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    document.addEventListener('pointercancel', handleUp)
  }

  if (!open) return null

  return createPortal(
    <Fragment>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'fixed z-50 w-full max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-soft',
          compact ? 'max-w-md' : 'max-w-2xl',
          className,
        )}
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          onPointerDown={onHeaderPointerDown}
          className={cn(
            'flex items-center justify-between gap-3 border-b border-[var(--border)]',
            compact ? 'px-4 py-2.5' : 'px-5 py-4',
            draggable && 'cursor-grab touch-none select-none active:cursor-grabbing',
          )}
          title={draggable ? 'Arrastrar para mover la ventana' : undefined}
        >
          <h3 id="modal-title" className="text-sm font-semibold text-[var(--text)]">
            {title}
          </h3>
          <button
            type="button"
            className={cn(
              'cursor-pointer rounded-lg border border-[rgba(234,179,8,0.45)] bg-[rgba(254,252,232,0.98)] font-medium text-[var(--text)] hover:bg-[rgba(254,249,195,0.95)] hover:border-[rgba(234,179,8,0.55)]',
              compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
            )}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className={cn(compact ? 'px-4 py-3' : 'px-5 py-4')}>{children}</div>
        {footer ? (
          <div className={cn('border-t border-[var(--border)]', compact ? 'px-4 py-3' : 'px-5 py-4')}>{footer}</div>
        ) : null}
      </div>
    </Fragment>,
    document.body,
  )
}
