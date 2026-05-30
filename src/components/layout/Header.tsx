import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Brush,
  Camera,
  Contrast,
  LayoutGrid,
  Maximize2,
  Menu,
  Monitor,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Table2,
  Type,
  UserCircle2,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { formatDate } from '../../services/mockData'
import { getSessionToken, loadSessionUser, loadStoredProfilePhoto, persistSession, PROFILE_PHOTO_UPDATED_EVENT, syncProfilePhoto } from '../../state/authSession'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { changePassword, getStudentPerfil, getTeacherPerfil, getUsuariosMePerfil, updateStudentPerfil, updateTeacherPerfil, updateUsuariosMePerfil } from '../../services/apiClient'
import { buildProfilePhotoDataUrl } from '../../utils/profilePhotoDataUrl'
import {
  applyUiSettings,
  DEFAULT_UI_SETTINGS,
  loadUiSettings,
  type UserInterfaceSettings,
} from '../../utils/uiPreferences'
import {
  backofficeBottomAccentClass,
  backofficeDarkCardChrome,
  backofficeDarkOrbBottomLeft,
  backofficeDarkOrbTopRight,
  backofficeDarkSurfaceGradient,
  backofficeDarkSurfaceInset,
  backofficeTopHeaderCompactPadClass,
  backofficeTopHeaderFrameClass,
  backofficeTopBarHeightClass,
} from './backofficeVisual'

type Notification = { id: string; title: string; detail: string; dateISO: string }

const uiSelectClass =
  'h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2.5 text-sm outline-none focus:border-[var(--accent)]'

const uiToggleClass =
  'flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5'

const uiGroupLabelClass = 'text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]'

type UserProfileSettings = {
  displayName: string
  phone: string
  city: string
  bio: string
  avatarDataUrl: string
}

const profileFieldClass =
  'h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]'

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
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfileSettings>({
    displayName: '',
    phone: '',
    city: '',
    bio: '',
    avatarDataUrl: '',
  })
  const [uiSettings, setUiSettings] = useState<UserInterfaceSettings>(DEFAULT_UI_SETTINGS)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null)
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const sessionUser = loadSessionUser()

  const abrirPanelConfiguracion = () => {
    setProfileOpen(true)
    setProfileFeedback(null)
    setPasswordFeedback(null)
    setNotifOpen(false)
  }

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(e.target as Node)) return
      setNotifOpen(false)
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

  const fichaPerfilCompleta = useMemo(() => {
    switch (sessionUser?.rol) {
      case 'docente':
        return {
          titulo: 'Datos del docente',
          descripcion: 'Nombre, documento, especialidad y foto se gestionan en la ficha completa del docente.',
          ruta: '/docente/perfil',
        }
      case 'estudiante':
        return {
          titulo: 'Datos del estudiante',
          descripcion: 'Datos personales, ubicación y foto se gestionan en la ficha completa del estudiante.',
          ruta: '/estudiante/perfil',
        }
      case 'staff':
        return {
          titulo: 'Datos del personal',
          descripcion: 'Nombre, documento, área y contacto se gestionan en la ficha completa del personal.',
          ruta: '/staff/perfil',
        }
      case 'admin':
        return {
          titulo: 'Datos de administrador',
          descripcion: 'Nombre, documento, cargo y foto se gestionan en la ficha completa del administrador.',
          ruta: '/admin/perfil',
        }
      default:
        return null
    }
  }, [sessionUser?.rol])

  useEffect(() => {
    const userId = String(sessionUser?.id ?? 'anon')
    const profileRaw = localStorage.getItem(`profile_settings_${userId}`)
    const fotoLocal = loadStoredProfilePhoto(sessionUser?.id as number | string | undefined)

    let nextProfile: UserProfileSettings = {
      displayName: String(sessionUser?.nombre_panel ?? ''),
      phone: '',
      city: '',
      bio: '',
      avatarDataUrl: fotoLocal,
    }

    if (profileRaw) {
      try {
        const parsed = JSON.parse(profileRaw) as UserProfileSettings
        nextProfile = {
          displayName: parsed.displayName ?? nextProfile.displayName,
          phone: parsed.phone ?? '',
          city: parsed.city ?? '',
          bio: parsed.bio ?? '',
          avatarDataUrl: parsed.avatarDataUrl || fotoLocal,
        }
      } catch {
        // Ignorar preferencias corruptas
      }
    }

    setProfile(nextProfile)
    setUiSettings(loadUiSettings(sessionUser?.id as number | string | undefined))
  }, [sessionUser?.id, sessionUser?.nombre_panel, sessionUser?.rol])

  useEffect(() => {
    const onPhotoUpdated = (event: Event) => {
      const foto = (event as CustomEvent<{ foto?: string }>).detail?.foto ?? ''
      setProfile((prev) => ({ ...prev, avatarDataUrl: foto }))
    }
    window.addEventListener(PROFILE_PHOTO_UPDATED_EVENT, onPhotoUpdated)
    return () => window.removeEventListener(PROFILE_PHOTO_UPDATED_EVENT, onPhotoUpdated)
  }, [])

  useEffect(() => {
    if (!profileOpen) return
    let cancelled = false

    if (sessionUser?.rol === 'docente') {
      void (async () => {
        try {
          const data = (await getTeacherPerfil({ includeFoto: true })) as Record<string, unknown>
          if (cancelled) return
          const foto = typeof data.foto_url === 'string' ? data.foto_url : ''
          if (foto) syncProfilePhoto(sessionUser?.id as number | string | undefined, foto)
          else setProfile((prev) => ({ ...prev, avatarDataUrl: loadStoredProfilePhoto(sessionUser?.id as number | string | undefined) }))
        } catch {
          /* usar caché local */
        }
      })()
      return () => {
        cancelled = true
      }
    }

    if (sessionUser?.rol === 'estudiante') {
      void (async () => {
        try {
          const data = (await getStudentPerfil({ includeFoto: true })) as Record<string, unknown>
          if (cancelled) return
          const foto = typeof data.foto_url === 'string' ? data.foto_url : ''
          if (foto) syncProfilePhoto(sessionUser?.id as number | string | undefined, foto)
          else setProfile((prev) => ({ ...prev, avatarDataUrl: loadStoredProfilePhoto(sessionUser?.id as number | string | undefined) }))
        } catch {
          /* usar caché local */
        }
      })()
      return () => {
        cancelled = true
      }
    }

    if (sessionUser?.rol !== 'admin' && sessionUser?.rol !== 'staff') return
    void (async () => {
      try {
        const data = (await getUsuariosMePerfil({ includeFoto: true })) as Record<string, unknown>
        if (cancelled) return
        const foto = typeof data.foto_url === 'string' ? data.foto_url : ''
        if (foto) {
          syncProfilePhoto(sessionUser?.id as number | string | undefined, foto)
        }
        if (sessionUser?.rol === 'admin') {
          const nombre = String(data.nombre || '').trim()
          const apellido = String(data.apellido || '').trim()
          const display = [nombre, apellido].filter(Boolean).join(' ')
          if (display) {
            setProfile((prev) => ({ ...prev, displayName: display }))
          }
        }
      } catch {
        /* usar caché local */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profileOpen, sessionUser?.id, sessionUser?.rol])

  useEffect(() => {
    applyUiSettings(uiSettings)
  }, [uiSettings])

  const saveProfileAndPreferences = async () => {
    const userId = String(sessionUser?.id ?? 'anon')
    setSavingProfile(true)
    setProfileFeedback(null)
    try {
      if (sessionUser?.rol === 'admin' || sessionUser?.rol === 'staff') {
        await updateUsuariosMePerfil({
          foto_url: profile.avatarDataUrl || null,
        })
      }
      localStorage.setItem(`profile_settings_${userId}`, JSON.stringify(profile))
      localStorage.setItem(`ui_settings_${userId}`, JSON.stringify(uiSettings))
      applyUiSettings(uiSettings)
      if (sessionUser) {
        persistSession(getSessionToken() || '', {
          ...sessionUser,
          nombre_panel: profile.displayName || sessionUser.nombre_panel,
        })
        syncProfilePhoto(sessionUser.id as number | string | undefined, profile.avatarDataUrl || null)
      }
      setProfileFeedback('Perfil y personalización guardados.')
      setProfileOpen(false)
      setNotifOpen(false)
    } catch (e) {
      setProfileFeedback(e instanceof Error ? e.message : 'No se pudo guardar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const onPhotoSelected = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProfileFeedback('El archivo debe ser una imagen.')
      return
    }
    void (async () => {
      try {
        const dataUrl = await buildProfilePhotoDataUrl(file)
        setProfile((prev) => ({ ...prev, avatarDataUrl: dataUrl }))
        if (sessionUser?.rol === 'admin' || sessionUser?.rol === 'staff') {
          await updateUsuariosMePerfil({ foto_url: dataUrl })
          const userId = String(sessionUser.id ?? 'anon')
          const cached = {
            ...profile,
            avatarDataUrl: dataUrl,
          }
          localStorage.setItem(`profile_settings_${userId}`, JSON.stringify(cached))
          syncProfilePhoto(sessionUser.id as number | string | undefined, dataUrl)
          if (sessionUser) {
            persistSession(getSessionToken() || '', { ...sessionUser })
          }
          setProfileFeedback('Foto guardada en el sistema.')
        } else if (sessionUser?.rol === 'docente') {
          await updateTeacherPerfil({ foto_url: dataUrl })
          syncProfilePhoto(sessionUser.id as number | string | undefined, dataUrl)
          setProfileFeedback('Foto guardada en el sistema.')
        } else if (sessionUser?.rol === 'estudiante') {
          await updateStudentPerfil({ foto_url: dataUrl })
          syncProfilePhoto(sessionUser.id as number | string | undefined, dataUrl)
          setProfileFeedback('Foto guardada en el sistema.')
        }
      } catch (e) {
        setProfileFeedback(e instanceof Error ? e.message : 'No se pudo guardar la foto')
      }
    })()
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
        backofficeTopHeaderFrameClass,
        backofficeTopBarHeightClass,
        backofficeDarkCardChrome,
        backofficeDarkSurfaceInset,
        backofficeDarkSurfaceGradient,
        'rounded-xl',
      )}
    >
      <div className={backofficeBottomAccentClass} aria-hidden />
      <div className={backofficeDarkOrbTopRight} aria-hidden />
      <div className={backofficeDarkOrbBottomLeft} aria-hidden />
      <div className={cn(backofficeTopHeaderCompactPadClass, 'h-full gap-2 sm:gap-3 md:gap-4')}>
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu size={17} />
            </button>
            <div className="min-w-0 ml-1 sm:ml-2 lg:ml-3">
              <h1
                className="inline-block max-w-[min(100%,18rem)] truncate rounded-lg border border-amber-300/55 bg-gradient-to-r from-slate-900/65 via-slate-800/60 to-amber-900/35 px-2 py-0.5 text-xs font-semibold tracking-tight text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:max-w-xs sm:px-2.5 sm:text-sm"
                title={activePageLabel}
              >
                {activePageLabel}
              </h1>
            </div>
          </div>

          <div
            ref={rootRef}
            className="ml-auto flex min-w-0 shrink-0 items-center gap-2 pl-1 pr-1 sm:gap-3 sm:pr-2 md:pl-3 lg:pl-4 lg:pr-2"
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white"
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

            <div className="flex min-w-0 flex-col items-center justify-center gap-1 text-center">
              <p
                className="max-w-[10rem] truncate text-sm font-bold uppercase tracking-wide text-white sm:max-w-[14rem] sm:text-base md:max-w-[16rem] md:text-lg"
                title={nombreCabecera}
              >
                {nombreCabecera}
              </p>
              <button
                type="button"
                title="Configurar perfil"
                aria-label="Configurar perfil"
                onClick={abrirPanelConfiguracion}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:border-white/35 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <Settings size={16} strokeWidth={2} />
              </button>
            </div>

            <div
              className="pointer-events-none flex shrink-0 select-none items-center justify-center"
              aria-hidden="true"
            >
              <div className="grid h-[4.25rem] w-[4.25rem] shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 shadow-[0_4px_16px_rgba(15,23,42,0.35)] ring-2 ring-white/25 sm:h-[4.75rem] sm:w-[4.75rem]">
                {profile.avatarDataUrl ? (
                  <img
                    src={profile.avatarDataUrl}
                    alt=""
                    className="block h-full w-full object-cover object-center"
                  />
                ) : (
                  <UserCircle2 className="h-10 w-10 text-[var(--muted)] sm:h-11 sm:w-11" strokeWidth={1.35} />
                )}
              </div>
            </div>
          </div>
        </div>

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Perfil y personalización"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
            <p className="text-sm font-semibold text-[var(--text)]">Perfil de usuario</p>
            <div className="flex items-center gap-3">
                {profile.avatarDataUrl ? (
                  <div className="relative h-14 w-14 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--panel-2)]">
                    <img
                      src={profile.avatarDataUrl}
                      alt="avatar perfil"
                      className="block h-full w-full object-cover object-center"
                    />
                  </div>
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
                className={profileFieldClass}
              />
            </label>

            {fichaPerfilCompleta ? (
              <div className="rounded-lg border border-[var(--border)] bg-white/90 p-3">
                <p className="text-xs font-semibold text-[var(--muted)]">{fichaPerfilCompleta.titulo}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{fichaPerfilCompleta.descripcion}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  className="mt-2"
                  onClick={() => {
                    setProfileOpen(false)
                    navigate(fichaPerfilCompleta.ruta)
                  }}
                >
                  Editar datos completos
                </Button>
              </div>
            ) : null}

            <div className="rounded-lg border border-[var(--border)] bg-white/90 p-3">
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

          <section className="flex max-h-[min(68vh,34rem)] flex-col rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--text)]">Personalizar interfaz</p>
              <button
                type="button"
                title="Restablecer predeterminados"
                onClick={() => setUiSettings({ ...DEFAULT_UI_SETTINGS })}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
              >
                <RotateCcw size={11} />
                Restablecer
              </button>
            </div>

            <div className="ui-prefs-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
              <div className="space-y-2">
                <p className={uiGroupLabelClass}>Diseño</p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <label className={uiToggleClass}>
                    <span className="inline-flex items-center gap-1.5 text-xs"><Monitor size={13} /> Modo compacto</span>
                    <input
                      type="checkbox"
                      checked={uiSettings.compact}
                      onChange={(e) => setUiSettings((prev) => ({ ...prev, compact: e.target.checked }))}
                    />
                  </label>
                  <label className={uiToggleClass}>
                    <span className="inline-flex items-center gap-1.5 text-xs"><Contrast size={13} /> Alto contraste</span>
                    <input
                      type="checkbox"
                      checked={uiSettings.highContrast}
                      onChange={(e) => setUiSettings((prev) => ({ ...prev, highContrast: e.target.checked }))}
                    />
                  </label>
                  <label className={cn(uiToggleClass, 'sm:col-span-2')}>
                    <span className="inline-flex items-center gap-1.5 text-xs"><Sparkles size={13} /> Reducir animaciones</span>
                    <input
                      type="checkbox"
                      checked={uiSettings.reduceMotion}
                      onChange={(e) => setUiSettings((prev) => ({ ...prev, reduceMotion: e.target.checked }))}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <p className={uiGroupLabelClass}>Texto y tablas</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)]"><Type size={12} /> Tamaño de texto</span>
                    <select
                      value={uiSettings.fontScale}
                      onChange={(e) => setUiSettings((prev) => ({ ...prev, fontScale: e.target.value as UserInterfaceSettings['fontScale'] }))}
                      className={uiSelectClass}
                    >
                      <option value="sm">Compacto</option>
                      <option value="md">Normal</option>
                      <option value="lg">Grande</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)]"><Table2 size={12} /> Densidad tablas</span>
                    <select
                      value={uiSettings.tableDensity}
                      onChange={(e) => setUiSettings((prev) => ({ ...prev, tableDensity: e.target.value as UserInterfaceSettings['tableDensity'] }))}
                      className={uiSelectClass}
                    >
                      <option value="comfortable">Cómoda</option>
                      <option value="compact">Compacta</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <p className={uiGroupLabelClass}>Color y fondo</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)]"><Brush size={12} /> Color de acento</span>
                    <select
                      value={uiSettings.accentTone}
                      onChange={(e) => setUiSettings((prev) => ({ ...prev, accentTone: e.target.value as UserInterfaceSettings['accentTone'] }))}
                      className={uiSelectClass}
                    >
                      <option value="amber">Amarillo institucional</option>
                      <option value="blue">Azul profesional</option>
                      <option value="emerald">Verde moderno</option>
                      <option value="violet">Violeta creativo</option>
                      <option value="rose">Rosa vibrante</option>
                      <option value="slate">Gris sobrio</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)]"><LayoutGrid size={12} /> Estilo de fondo</span>
                    <select
                      value={uiSettings.uiSurface}
                      onChange={(e) => setUiSettings((prev) => ({ ...prev, uiSurface: e.target.value as UserInterfaceSettings['uiSurface'] }))}
                      className={uiSelectClass}
                    >
                      <option value="soft">SaaS suave</option>
                      <option value="clean">Limpio minimalista</option>
                      <option value="warm">Cálido acogedor</option>
                      <option value="elegant">SaaS elegante</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <p className={uiGroupLabelClass}>Detalle visual</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)]"><Settings size={12} /> Esquinas</span>
                    <select
                      value={uiSettings.cornerStyle}
                      onChange={(e) => setUiSettings((prev) => ({ ...prev, cornerStyle: e.target.value as UserInterfaceSettings['cornerStyle'] }))}
                      className={uiSelectClass}
                    >
                      <option value="round">Redondeadas</option>
                      <option value="balanced">Moderadas</option>
                      <option value="sharp">Cuadradas</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)]"><Maximize2 size={12} /> Ancho contenido</span>
                    <select
                      value={uiSettings.contentWidth}
                      onChange={(e) => setUiSettings((prev) => ({ ...prev, contentWidth: e.target.value as UserInterfaceSettings['contentWidth'] }))}
                      className={uiSelectClass}
                    >
                      <option value="standard">Estándar</option>
                      <option value="wide">Amplio</option>
                    </select>
                  </label>
                </div>
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
          <Button onClick={() => void saveProfileAndPreferences()} disabled={savingProfile}>
            {savingProfile ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </Modal>
    </header>
  )
}

