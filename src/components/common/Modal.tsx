import { Fragment, useEffect } from 'react'
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
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <Fragment>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            'w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-soft',
            className,
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1 text-xs font-medium text-[var(--text)] hover:bg-[#f1f5f9]"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer ? <div className="border-t border-[var(--border)] px-5 py-4">{footer}</div> : null}
        </div>
      </div>
    </Fragment>,
    document.body,
  )
}

