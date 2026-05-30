import { useEffect, useRef, useState } from 'react'
import { Camera, Shield, UserCircle2 } from 'lucide-react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { backofficePanelCardClass } from '../components/layout/backofficeVisual'
import { cn } from '../utils/cn'
import {
  changePassword,
  getUsuariosMePerfil,
  updateUsuariosMePerfil,
} from '../services/apiClient'
import {
  getSessionToken,
  loadSessionUser,
  persistSession,
  storeProfilePhoto,
} from '../state/authSession'
import { buildProfilePhotoDataUrl } from '../utils/profilePhotoDataUrl'

const inputClass =
  'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]'

export function AdminPerfilPage() {
  const sessionUser = loadSessionUser()
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensajeOk, setMensajeOk] = useState<string | null>(null)
  const [fotoPerfil, setFotoPerfil] = useState('')
  const [email, setEmail] = useState('')
  const [perfilForm, setPerfilForm] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    telefono: '',
    cargo: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    actual: '',
    nueva: '',
    confirmar: '',
  })
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)
  const [cambiandoPassword, setCambiandoPassword] = useState(false)

  useEffect(() => {
    let cancel = false
    void (async () => {
      setCargando(true)
      setError(null)
      try {
        const perfil = (await getUsuariosMePerfil({ noSessionRedirect: true })) as Record<string, unknown>
        if (cancel) return
        setEmail(String(perfil.email || sessionUser?.email || ''))
        setPerfilForm({
          nombre: String(perfil.nombre || ''),
          apellido: String(perfil.apellido || ''),
          documento: String(perfil.documento || ''),
          telefono: String(perfil.telefono || ''),
          cargo: String(perfil.cargo || ''),
        })
        try {
          const conFoto = (await getUsuariosMePerfil({ includeFoto: true, noSessionRedirect: true })) as Record<
            string,
            unknown
          >
          if (cancel) return
          const foto = typeof conFoto.foto_url === 'string' ? conFoto.foto_url : ''
          if (foto) {
            setFotoPerfil(foto)
            storeProfilePhoto(sessionUser?.id as number | string | undefined, foto)
          }
        } catch {
          /* foto opcional */
        }
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil')
      } finally {
        if (!cancel) setCargando(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [sessionUser?.email, sessionUser?.id])

  const guardarPerfil = async () => {
    setError(null)
    setMensajeOk(null)
    if (!perfilForm.nombre.trim() || !perfilForm.apellido.trim()) {
      setError('Completa al menos nombre y apellido.')
      return
    }
    setGuardando(true)
    try {
      await updateUsuariosMePerfil({
        nombre: perfilForm.nombre.trim(),
        apellido: perfilForm.apellido.trim(),
        documento: perfilForm.documento.trim(),
        telefono: perfilForm.telefono.trim(),
        cargo: perfilForm.cargo.trim(),
        foto_url: fotoPerfil || null,
      })
      const display = [perfilForm.nombre.trim(), perfilForm.apellido.trim()].filter(Boolean).join(' ')
      if (sessionUser) {
        persistSession(getSessionToken() || '', { ...sessionUser, nombre_panel: display })
        storeProfilePhoto(sessionUser.id as number | string | undefined, fotoPerfil || null)
      }
      setMensajeOk('Perfil de administrador guardado correctamente.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el perfil')
    } finally {
      setGuardando(false)
    }
  }

  const cambiarPassword = async () => {
    setPasswordMsg(null)
    if (!passwordForm.nueva || !passwordForm.confirmar) {
      setPasswordMsg('Completa la nueva contraseña y su confirmación.')
      return
    }
    if (passwordForm.nueva.length < 8) {
      setPasswordMsg('La nueva contraseña debe tener mínimo 8 caracteres.')
      return
    }
    if (passwordForm.nueva !== passwordForm.confirmar) {
      setPasswordMsg('La confirmación no coincide.')
      return
    }
    setCambiandoPassword(true)
    try {
      await changePassword(passwordForm.actual.trim() || null, passwordForm.nueva)
      setPasswordForm({ actual: '', nueva: '', confirmar: '' })
      setPasswordMsg('Contraseña actualizada correctamente.')
    } catch (e) {
      setPasswordMsg(e instanceof Error ? e.message : 'No se pudo actualizar la contraseña')
    } finally {
      setCambiandoPassword(false)
    }
  }

  const nombreCompleto = [perfilForm.nombre, perfilForm.apellido].filter(Boolean).join(' ').trim()

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {mensajeOk ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{mensajeOk}</div>
      ) : null}

      <Card className={cn(backofficePanelCardClass, 'p-4 sm:p-5')}>
        {cargando ? (
          <p className="text-sm text-[var(--muted)]">Cargando perfil…</p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start">
              <div className="mx-auto shrink-0 sm:mx-0">
                {fotoPerfil ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--panel-2)]">
                    <img src={fotoPerfil} alt="" className="block h-full w-full object-cover object-center" />
                  </div>
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-full border border-[var(--border)] bg-[var(--panel-2)]">
                    <UserCircle2 className="h-12 w-12 text-[var(--muted)]" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-[var(--text)]">{nombreCompleto || 'Administrador'}</p>
                <p className="mt-0.5 text-sm text-[var(--muted)]">{email || '—'}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950">
                  <Shield size={12} />
                  Administrador · Propietario de la base de datos
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    leftIcon={<Camera size={14} />}
                    onClick={() => fotoInputRef.current?.click()}
                  >
                    Elegir foto
                  </Button>
                  {fotoPerfil ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setFotoPerfil('')
                        void updateUsuariosMePerfil({ foto_url: null }).catch(() => {})
                        storeProfilePhoto(sessionUser?.id as number | string | undefined, null)
                      }}
                    >
                      Quitar foto
                    </Button>
                  ) : null}
                </div>
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (!f || !f.type.startsWith('image/')) return
                    void (async () => {
                      try {
                        const dataUrl = await buildProfilePhotoDataUrl(f)
                        setFotoPerfil(dataUrl)
                        await updateUsuariosMePerfil({ foto_url: dataUrl })
                        storeProfilePhoto(sessionUser?.id as number | string | undefined, dataUrl)
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'No se pudo guardar la foto')
                      }
                    })()
                  }}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Nombre(s)</span>
                <input
                  value={perfilForm.nombre}
                  onChange={(e) => setPerfilForm((p) => ({ ...p, nombre: e.target.value }))}
                  className={inputClass}
                  autoComplete="given-name"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Apellido(s)</span>
                <input
                  value={perfilForm.apellido}
                  onChange={(e) => setPerfilForm((p) => ({ ...p, apellido: e.target.value }))}
                  className={inputClass}
                  autoComplete="family-name"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Cédula / documento</span>
                <input
                  value={perfilForm.documento}
                  onChange={(e) => setPerfilForm((p) => ({ ...p, documento: e.target.value }))}
                  className={inputClass}
                  inputMode="numeric"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Teléfono</span>
                <input
                  value={perfilForm.telefono}
                  onChange={(e) => setPerfilForm((p) => ({ ...p, telefono: e.target.value }))}
                  className={inputClass}
                  inputMode="tel"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Cargo / responsabilidad</span>
                <input
                  value={perfilForm.cargo}
                  onChange={(e) => setPerfilForm((p) => ({ ...p, cargo: e.target.value }))}
                  placeholder="Ej. Director académico · Propietario COLGO"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Correo (acceso al sistema)</span>
                <input value={email} readOnly className={cn(inputClass, 'cursor-not-allowed opacity-75')} />
              </label>
            </div>

            <div className="flex justify-end border-t border-[var(--border)] pt-4">
              <Button type="button" variant="primary" onClick={() => void guardarPerfil()} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar perfil'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className={cn(backofficePanelCardClass, 'p-4 sm:p-5')}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-[var(--text)]">Seguridad</p>
          <p className="text-xs text-[var(--muted)]">Actualiza la contraseña de acceso al panel.</p>
        </div>
        {passwordMsg ? (
          <p className={cn('mt-2 text-xs', passwordMsg.includes('correctamente') ? 'text-green-700' : 'text-red-700')}>
            {passwordMsg}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={passwordForm.actual}
            onChange={(e) => setPasswordForm((p) => ({ ...p, actual: e.target.value }))}
            placeholder="Contraseña actual"
            className={cn(inputClass, 'h-9 w-full min-w-[9rem] sm:w-[10.5rem]')}
            autoComplete="current-password"
          />
          <input
            type="password"
            value={passwordForm.nueva}
            onChange={(e) => setPasswordForm((p) => ({ ...p, nueva: e.target.value }))}
            placeholder="Nueva contraseña"
            className={cn(inputClass, 'h-9 w-full min-w-[9rem] sm:w-[10.5rem]')}
            autoComplete="new-password"
          />
          <input
            type="password"
            value={passwordForm.confirmar}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirmar: e.target.value }))}
            placeholder="Confirmar"
            className={cn(inputClass, 'h-9 w-full min-w-[8rem] sm:w-[9.5rem]')}
            autoComplete="new-password"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => void cambiarPassword()}
            disabled={cambiandoPassword}
          >
            {cambiandoPassword ? 'Actualizando…' : 'Cambiar contraseña'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
