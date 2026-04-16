import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  UserCircle2,
} from 'lucide-react'
import type { SearchSuggestion } from '../../services/mockData'
import { Badge } from '../common/Badge'
import { cn } from '../../utils/cn'
import { formatDate } from '../../services/mockData'

type Notification = { id: string; title: string; detail: string; dateISO: string }

const mockNotifications: Notification[] = [
  { id: 'n1', title: 'Pago aprobado', detail: 'Mariana Gómez · Corte y Confección', dateISO: '2026-03-14T00:00:00.000Z' },
  { id: 'n2', title: 'Nueva matrícula', detail: 'Andrea Molina · Pantalones', dateISO: '2026-03-13T00:00:00.000Z' },
  { id: 'n3', title: 'Cupos actualizados', detail: 'Moda Sostenible · próximos inicios', dateISO: '2026-03-11T00:00:00.000Z' },
]

export function Header({
  onOpenSidebar,
  suggestions,
  activePageLabel,
}: {
  onOpenSidebar: () => void
  suggestions: SearchSuggestion[]
  activePageLabel: string
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return suggestions
      .filter((s) => (s.label + ' ' + s.description).toLowerCase().includes(q))
      .slice(0, 6)
  }, [query, suggestions])

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(e.target as Node)) return
      setSearchOpen(false)
      setNotifOpen(false)
      setUserOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [])

  const pageBreadcrumb = useMemo(() => {
    return `COLGO-ACADEMIA / ${activePageLabel}`
  }, [activePageLabel])

  return (
    <header className="relative z-30 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel-2)] text-[var(--text)] lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>
          <div>
            <p className="text-xs font-semibold tracking-wide text-[var(--muted)]">{pageBreadcrumb}</p>
            <h1 className="mt-0.5 text-base font-semibold text-[var(--text)]">{activePageLabel}</h1>
          </div>
        </div>

        <div ref={rootRef} className="ml-auto flex w-full items-center gap-3 md:w-auto md:flex-1">
          <div className="relative w-full md:max-w-xl md:flex-1">
            <label className="sr-only" htmlFor="global-search">Buscar</label>
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--subtle)]">
              <Search size={16} />
            </div>
            <input
              id="global-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Buscar estudiantes, cursos, sedes..."
              className={cn(
                'h-10 w-full rounded-xl border bg-[var(--panel-2)] px-9 text-sm text-[var(--text)]',
                'border-[var(--border)] placeholder:text-[var(--subtle)]',
              )}
            />

            {searchOpen && filtered.length > 0 ? (
              <div className="absolute left-0 right-0 mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-soft">
                <div className="px-3 py-2 text-xs font-semibold text-[var(--muted)]">Sugerencias</div>
                <div className="max-h-72 overflow-auto">
                  {filtered.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        navigate(s.to)
                        setQuery('')
                        setSearchOpen(false)
                      }}
                      className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-[rgba(15,23,42,0.04)]"
                    >
                      <div className="pt-0.5">
                        <Badge tone={s.tag === 'Curso' ? 'accent' : 'neutral'}>{s.tag}</Badge>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[var(--text)]">{s.label}</div>
                        <div className="truncate text-xs text-[var(--muted)]">{s.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v)
                  setUserOpen(false)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel-2)] text-[var(--text)]"
                aria-label="Notificaciones"
              >
                <Bell size={18} />
              </button>

              {notifOpen ? (
                <div className="absolute right-0 mt-2 w-[360px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-soft">
                  <div className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Notificaciones</div>
                  <div className="max-h-80 overflow-auto">
                    {mockNotifications.map((n) => (
                      <div key={n.id} className="border-t border-[var(--border)] px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--text)]">{n.title}</p>
                            <p className="mt-1 max-h-8 overflow-hidden text-xs text-[var(--muted)]">{n.detail}</p>
                          </div>
                          <span className="shrink-0 text-xs text-[var(--subtle)]">{formatDate(n.dateISO)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3">
                    <button
                      type="button"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[#f1f5f9]"
                    >
                      Ver todo
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserOpen((v) => !v)
                  setNotifOpen(false)
                }}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2"
              >
                <UserCircle2 size={18} className="text-[var(--text)]" />
                <div className="hidden text-left md:block">
                  <p className="text-xs font-semibold text-[var(--text)]">Administración COLGO</p>
                  <p className="text-[10px] text-[var(--muted)]">Superusuario</p>
                </div>
                <ChevronDown size={16} className="hidden text-[var(--muted)] md:block" />
              </button>

              {userOpen ? (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-soft">
                  {['Perfil', 'Ajustes', 'Soporte', 'Cerrar sesión'].map((label) => (
                    <button
                      key={label}
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm font-semibold text-[var(--text)] hover:bg-[rgba(15,23,42,0.04)]"
                      onClick={() => {
                        setUserOpen(false)
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

