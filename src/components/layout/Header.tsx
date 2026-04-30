import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  Brush,
  Camera,
  ChevronDown,
  Menu,
  Monitor,
  Settings,
  ShieldCheck,
  Type,
  UserCircle2,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { formatDate } from '../../services/mockData'
import { getSessionToken, loadSessionUser, persistSession } from '../../state/authSession'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { changePassword, getUsuariosMePerfil, updateUsuariosMePerfil } from '../../services/apiClient'
import {
  backofficeBottomAccentClass,
  backofficeDarkCardChrome,
  backofficeDarkOrbBottomLeft,
  backofficeDarkOrbTopRight,
  backofficeDarkSurfaceGradient,
  backofficeDarkSurfaceInset,
  backofficeTopHeaderPadClass,
  backofficeTopHeaderFrameClass,
} from './backofficeVisual'

type Notification = { id: string; title: string; detail: string; dateISO: string }
type FontScale = 'sm' | 'md' | 'lg'
type AccentTone = 'amber' | 'blue' | 'emerald'
type UiSurface = 'soft' | 'clean'

type UserProfileSettings = {
  displayName: string
  phone: string
  city: string
  bio: string
  avatarDataUrl: string
}

type UserInterfaceSettings = {
  compact: boolean
  fontScale: FontScale
  accentTone: AccentTone
  uiSurface: UiSurface
}

const mockNotifications: Notification[] = [
  { id: 'n1', title: 'Pago aprobado', detail: 'Mariana Gómez · Corte y Confección', dateISO: '2026-03-14T00:00:00.000Z' },
  { id: 'n2', title: 'Nueva matrícula', detail: 'Andrea Molina · Pantalones', dateISO: '2026-03-13T00:00:00.000Z' },
  { id: 'n3', title: 'Cupos actualizados', detail: 'Moda Sostenible · próximos inicios', dateISO: '2026-03-11T00:00:00.000Z' },
]

export function Header({
  onOpenSidebar,
  activePageLabel,
}: {
  onOpenSidebar: () => void
  activePageLabel: string
}) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfileSettings>({
    displayName: '',
    phone: '',
    city: '',
    bio: '',
    avatarDataUrl: '',
  })
  const [uiSettings, setUiSettings] = useState<UserInterfaceSettings>({
    compact: false,
    fontScale: 'md',
    accentTone: 'amber',
    uiSurface: 'soft',
  })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null)
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null)
  const [adminDatosOpen, setAdminDatosOpen] = useState(false)
  const [adminForm, setAdminForm] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    telefono: '',
    cargo: '',
  })
  const [adminPerfilLoading, setAdminPerfilLoading] = useState(false)
  const [adminPerfilSaving, setAdminPerfilSaving] = useState(false)
  const [adminPerfilErr, setAdminPerfilErr] = useState<string | null>(null)
  const [adminPerfilOk, setAdminPerfilOk] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const sessionUser = loadSessionUser()

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(e.target as Node)) return
      setNotifOpen(false)
      setUserOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [])

  /** Nombre visible en cabecera: preferencia local, luego sesión, luego parte del correo. */
  const nombreCabecera = useMemo(() => {
    const local = profile.displayName.trim()
    if (local) return local

    const usuario = sessionUser
    const desdeSesion = String(usuario?.nombre_panel ?? '').trim()
    if (desdeSesion && desdeSesion.toLowerCase() !== 'usuario') return desdeSesion

    const email = String(usuario?.email ?? '').trim()
    if (email.includes('@')) {
      const parte = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
      if (parte) {
        return parte
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
      }
    }

    return desdeSesion || 'Usuario'
  }, [profile.displayName, sessionUser])

  useEffect(() => {
    const userId = String(sessionUser?.id ?? 'anon')
    const profileRaw = localStorage.getItem(`profile_settings_${userId}`)
    const uiRaw = localStorage.getItem(`ui_settings_${userId}`)

    if (profileRaw) {
      try {
        const parsed = JSON.parse(profileRaw) as UserProfileSettings
        setProfile({
          displayName: parsed.displayName ?? '',
          phone: parsed.phone ?? '',
          city: parsed.city ?? '',
          bio: parsed.bio ?? '',
          avatarDataUrl: parsed.avatarDataUrl ?? '',
        })
      } catch {
        // Ignorar preferencias corruptas
      }
    } else {
      setProfile((prev) => ({ ...prev, displayName: String(sessionUser?.nombre_panel ?? '') }))
    }

    if (uiRaw) {
      try {
        const parsed = JSON.parse(uiRaw) as UserInterfaceSettings
        setUiSettings({
          compact: Boolean(parsed.compact),
          fontScale: parsed.fontScale ?? 'md',
          accentTone: parsed.accentTone ?? 'amber',
          uiSurface: parsed.uiSurface ?? 'soft',
        })
      } catch {
        // Ignorar preferencias corruptas
      }
    }
  }, [sessionUser?.id, sessionUser?.nombre_panel])

  useEffect(() => {
    if (!profileOpen || sessionUser?.rol !== 'admin') return
    let cancelled = false
    setAdminPerfilErr(null)
    setAdminPerfilOk(null)
    setAdminPerfilLoading(true)
    void (async () => {
      try {
        const data = (await getUsuariosMePerfil()) as Record<string, unknown>
        if (cancelled) return
        setAdminForm({
          nombre: String(data.nombre || ''),
          apellido: String(data.apellido || ''),
          documento: String(data.documento || ''),
          telefono: String(data.telefono || ''),
          cargo: String(data.cargo || ''),
        })
      } catch (e) {
        if (!cancelled) setAdminPerfilErr(e instanceof Error ? e.message : 'No se pudo cargar el perfil')
      } finally {
        if (!cancelled) setAdminPerfilLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profileOpen, sessionUser?.rol, sessionUser?.id])

  useEffect(() => {
    document.body.classList.toggle('compact-ui', uiSettings.compact)
    document.documentElement.style.fontSize =
      uiSettings.fontScale === 'sm' ? '14px' : uiSettings.fontScale === 'lg' ? '17px' : '16px'

    if (uiSettings.accentTone === 'blue') {
      document.documentElement.style.setProperty('--accent', '#60a5fa')
      document.documentElement.style.setProperty('--accent-2', '#3b82f6')
    } else if (uiSettings.accentTone === 'emerald') {
      document.documentElement.style.setProperty('--accent', '#34d399')
      document.documentElement.style.setProperty('--accent-2', '#10b981')
    } else {
      document.documentElement.style.setProperty('--accent', '#fde047')
      document.documentElement.style.setProperty('--accent-2', '#facc15')
    }

    if (uiSettings.uiSurface === 'clean') {
      document.documentElement.style.setProperty('--bg', '#ffffff')
      document.documentElement.style.setProperty('--panel-2', '#f8fafc')
    } else {
      document.documentElement.style.setProperty('--bg', '#f3f4f6')
      document.documentElement.style.setProperty('--panel-2', '#f8fafc')
    }
  }, [uiSettings])

  const saveProfileAndPreferences = () => {
    const userId = String(sessionUser?.id ?? 'anon')
    localStorage.setItem(`profile_settings_${userId}`, JSON.stringify(profile))
    localStorage.setItem(`ui_settings_${userId}`, JSON.stringify(uiSettings))
    if (sessionUser) {
      persistSession(getSessionToken() || '', {
        ...sessionUser,
        nombre_panel: profile.displayName || sessionUser.nombre_panel,
      })
    }
    setProfileFeedback('Perfil y personalización guardados.')
    setProfileOpen(false)
    setUserOpen(false)
    setNotifOpen(false)
  }

  const onPhotoSelected = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, avatarDataUrl: String(reader.result ?? '') }))
    }
    reader.readAsDataURL(file)
  }

  const guardarDatosAdmin = async () => {
    setAdminPerfilErr(null)
    setAdminPerfilOk(null)
    if (!adminForm.nombre.trim() || !adminForm.apellido.trim()) {
      setAdminPerfilErr('Completa al menos nombre y apellido.')
      return
    }
    setAdminPerfilSaving(true)
    try {
      await updateUsuariosMePerfil({
        nombre: adminForm.nombre.trim(),
        apellido: adminForm.apellido.trim(),
        documento: adminForm.documento.trim(),
        telefono: adminForm.telefono.trim(),
        cargo: adminForm.cargo.trim(),
      })
      const display = [adminForm.nombre.trim(), adminForm.apellido.trim()].filter(Boolean).join(' ')
      setProfile((prev) => ({ ...prev, displayName: display }))
      if (sessionUser) {
        persistSession(getSessionToken() || '', { ...sessionUser, nombre_panel: display })
      }
      setAdminPerfilOk('Datos guardados en el sistema.')
    } catch (e) {
      setAdminPerfilErr(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setAdminPerfilSaving(false)
    }
  }

  const onChangePassword = async () => {
    setPasswordFeedback(null)
    if (!newPassword || !confirmPassword) {
      setPasswordFeedback('Completa la nueva contraseña y su confirmación.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordFeedback('La nueva contraseña debe tener mínimo 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback('La confirmación no coincide.')
      return
    }

    setSavingProfile(true)
    try {
      await changePassword(currentPassword.trim() || null, newPassword)
      setPasswordFeedback('Contraseña actualizada correctamente.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordFeedback(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña')
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <header
      className={cn(
        'mx-3',
        backofficeTopHeaderFrameClass,
        backofficeDarkCardChrome,
        backofficeDarkSurfaceInset,
        backofficeDarkSurfaceGradient,
      )}
    >
      <div className={backofficeBottomAccentClass} aria-hidden />
      <div className={backofficeDarkOrbTopRight} aria-hidden />
      <div className={backofficeDarkOrbBottomLeft} aria-hidden />
      <div className={cn(backofficeTopHeaderPadClass, 'flex flex-wrap items-center gap-4 md:gap-6 lg:gap-8')}>
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0 ml-2 sm:ml-3 lg:ml-4">
              <h1
                className="inline-block max-w-[min(100%,18rem)] truncate rounded-lg border border-amber-300/55 bg-gradient-to-r from-slate-900/65 via-slate-800/60 to-amber-900/35 px-2.5 py-1 text-sm font-semibold tracking-tight text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:max-w-xs sm:px-3 sm:text-base"
                title={activePageLabel}
              >
                {activePageLabel}
              </h1>
            </div>
          </div>

          <div
            ref={rootRef}
            className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 pl-1 pr-1 sm:gap-2 sm:pr-2 md:gap-2.5 md:pl-4 lg:gap-3 lg:pl-6 lg:pr-3"
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v)
                  setUserOpen(false)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white"
                aria-label="Notificaciones"
              >
                <Bell size={18} />
              </button>

              {notifOpen ? (
                <div className="absolute right-0 mt-2 w-[360px] overflow-hidden rounded-xl border border-white/20 bg-slate-900/95 shadow-soft backdrop-blur-sm">
                  <div className="px-4 py-3 text-xs font-semibold text-slate-300">Notificaciones</div>
                  <div className="max-h-80 overflow-auto">
                    {mockNotifications.map((n) => (
                      <div key={n.id} className="border-t border-white/15 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{n.title}</p>
                            <p className="mt-1 max-h-8 overflow-hidden text-xs text-slate-300">{n.detail}</p>
                          </div>
                          <span className="shrink-0 text-xs text-slate-400">{formatDate(n.dateISO)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3">
                    <button
                      type="button"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
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
                aria-expanded={userOpen}
                aria-haspopup="menu"
                title="Cuenta y configuración"
                onClick={() => {
                  setUserOpen((v) => !v)
                  setNotifOpen(false)
                }}
                className="hidden max-w-[220px] items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-right transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:max-w-[260px] md:flex md:max-w-[300px] lg:max-w-[400px]"
              >
                <p className="min-w-0 flex-1 truncate text-base font-bold tracking-tight text-white lg:text-lg">
                  {nombreCabecera}
                </p>
                <ChevronDown
                  size={20}
                  strokeWidth={2.25}
                  className={cn(
                    'shrink-0 text-white/70 transition lg:h-[22px] lg:w-[22px]',
                    userOpen && 'rotate-180',
                  )}
                />
              </button>

              <button
                type="button"
                aria-expanded={userOpen}
                aria-haspopup="menu"
                title="Cuenta y configuración"
                onClick={() => {
                  setUserOpen((v) => !v)
                  setNotifOpen(false)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] md:hidden"
              >
                <Settings size={18} />
                <span className="sr-only">Cuenta y configuración</span>
              </button>

              {userOpen ? (
                <div
                  className="absolute right-0 z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-white/20 bg-slate-900/95 shadow-soft backdrop-blur-sm"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/10"
                    onClick={() => {
                      setUserOpen(false)
                      setProfileOpen(true)
                      setAdminDatosOpen(false)
                      setProfileFeedback(null)
                      setPasswordFeedback(null)
                    }}
                  >
                    <Settings size={16} />
                    Configurar perfil
                  </button>
                </div>
              ) : null}
            </div>

            <div
              className="pointer-events-none flex shrink-0 select-none items-center justify-center"
              aria-hidden="true"
            >
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-white/10 shadow-[0_8px_28px_rgba(15,23,42,0.45)] ring-2 ring-white/25 md:h-[5.5rem] md:w-[5.5rem] lg:h-24 lg:w-24">
                {profile.avatarDataUrl ? (
                  <img
                    src={profile.avatarDataUrl}
                    alt=""
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <UserCircle2
                    className="h-11 w-11 text-[var(--muted)] md:h-[3.25rem] md:w-[3.25rem] lg:h-14 lg:w-14"
                    strokeWidth={1.35}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

      <Modal
        open={profileOpen}
        onClose={() => {
          setProfileOpen(false)
          setAdminDatosOpen(false)
        }}
        title="Perfil y personalización"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
            <p className="text-sm font-semibold text-[var(--text)]">Perfil de usuario</p>
            <div className="flex items-center gap-3">
              {profile.avatarDataUrl ? (
                <img src={profile.avatarDataUrl} alt="avatar perfil" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full border border-[var(--border)] bg-white">
                  <UserCircle2 size={28} />
                </div>
              )}
              <Button size="sm" variant="secondary" leftIcon={<Camera size={14} />} onClick={() => fileInputRef.current?.click()}>
                Cambiar foto
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhotoSelected(e.target.files?.[0] ?? null)}
              />
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Nombre visible</span>
              <input
                value={profile.displayName}
                onChange={(e) => setProfile((prev) => ({ ...prev, displayName: e.target.value }))}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
              />
            </label>

            {sessionUser?.rol === 'admin' ? (
              <div className="rounded-lg border border-[var(--border)] bg-white/90 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[var(--muted)]">Datos administrativos</p>
                  <Button size="sm" variant="secondary" type="button" onClick={() => setAdminDatosOpen((o) => !o)}>
                    {adminDatosOpen ? 'Ocultar' : 'Editar datos'}
                  </Button>
                </div>
                {adminDatosOpen ? (
                  <div className="mt-3 space-y-2">
                    {adminPerfilLoading ? <p className="text-xs text-[var(--muted)]">Cargando datos…</p> : null}
                    {adminPerfilErr ? <p className="text-xs text-red-600">{adminPerfilErr}</p> : null}
                    {adminPerfilOk ? <p className="text-xs text-green-700">{adminPerfilOk}</p> : null}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={adminForm.nombre}
                        onChange={(e) => setAdminForm((f) => ({ ...f, nombre: e.target.value }))}
                        placeholder="Nombre"
                        className="h-9 rounded-lg border border-[var(--border)] px-2 text-sm"
                      />
                      <input
                        value={adminForm.apellido}
                        onChange={(e) => setAdminForm((f) => ({ ...f, apellido: e.target.value }))}
                        placeholder="Apellido"
                        className="h-9 rounded-lg border border-[var(--border)] px-2 text-sm"
                      />
                      <input
                        value={adminForm.documento}
                        onChange={(e) => setAdminForm((f) => ({ ...f, documento: e.target.value }))}
                        placeholder="Documento"
                        className="h-9 rounded-lg border border-[var(--border)] px-2 text-sm"
                      />
                      <input
                        value={adminForm.telefono}
                        onChange={(e) => setAdminForm((f) => ({ ...f, telefono: e.target.value }))}
                        placeholder="Teléfono"
                        className="h-9 rounded-lg border border-[var(--border)] px-2 text-sm"
                      />
                      <input
                        value={adminForm.cargo}
                        onChange={(e) => setAdminForm((f) => ({ ...f, cargo: e.target.value }))}
                        placeholder="Cargo / área"
                        className="h-9 rounded-lg border border-[var(--border)] px-2 text-sm sm:col-span-2"
                      />
                    </div>
                    <Button size="sm" variant="primary" type="button" onClick={() => void guardarDatosAdmin()} disabled={adminPerfilSaving}>
                      {adminPerfilSaving ? 'Guardando…' : 'Guardar'}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Estos datos se muestran en el listado de usuarios del panel. Pulsa «Editar datos» para cambiarlos.
                  </p>
                )}
              </div>
            ) : null}
          </section>

          <section className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
            <p className="text-sm font-semibold text-[var(--text)]">Personalizar interfaz</p>
            <label className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-white px-3 py-2">
              <span className="inline-flex items-center gap-2 text-sm"><Monitor size={14} /> Modo compacto</span>
              <input
                type="checkbox"
                checked={uiSettings.compact}
                onChange={(e) => setUiSettings((prev) => ({ ...prev, compact: e.target.checked }))}
              />
            </label>
            <label className="block">
              <span className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><Type size={13} /> Tamaño de texto</span>
              <select
                value={uiSettings.fontScale}
                onChange={(e) => setUiSettings((prev) => ({ ...prev, fontScale: e.target.value as FontScale }))}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
              >
                <option value="sm">Compacto</option>
                <option value="md">Normal</option>
                <option value="lg">Grande</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><Brush size={13} /> Color de acento</span>
              <select
                value={uiSettings.accentTone}
                onChange={(e) => setUiSettings((prev) => ({ ...prev, accentTone: e.target.value as AccentTone }))}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
              >
                <option value="amber">Amarillo institucional</option>
                <option value="blue">Azul profesional</option>
                <option value="emerald">Verde moderno</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><Settings size={13} /> Estilo visual</span>
              <select
                value={uiSettings.uiSurface}
                onChange={(e) => setUiSettings((prev) => ({ ...prev, uiSurface: e.target.value as UiSurface }))}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
              >
                <option value="soft">SaaS suave</option>
                <option value="clean">Limpio minimalista</option>
              </select>
            </label>

            <div className="rounded-lg border border-[var(--border)] bg-white p-3">
              <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={14} /> Cambiar contraseña</p>
              <div className="space-y-2">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Contraseña actual"
                  className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                  className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar nueva contraseña"
                  className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm"
                />
                <Button size="sm" variant="secondary" onClick={() => void onChangePassword()} disabled={savingProfile}>
                  Actualizar contraseña
                </Button>
              </div>
            </div>
          </section>
        </div>

        {passwordFeedback ? (
          <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)]">
            {passwordFeedback}
          </p>
        ) : null}
        {profileFeedback ? (
          <p className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {profileFeedback}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Button onClick={saveProfileAndPreferences}>Guardar cambios</Button>
        </div>
      </Modal>
    </header>
  )
}

