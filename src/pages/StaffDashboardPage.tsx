import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Toast } from '../components/common/Toast'
import { getUsuariosMePerfil, updateUsuariosMePerfil } from '../services/apiClient'
import { backofficePanelCardClass } from '../components/layout/backofficeVisual'
import { cn } from '../utils/cn'

export function StaffDashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [saludo, setSaludo] = useState('Panel staff')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileOk, setProfileOk] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [perfilForm, setPerfilForm] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    telefono: '',
    area: '',
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const perfil = (await getUsuariosMePerfil()) as Record<string, unknown>
        if (cancelled) return
        const nombre = String(perfil.nombre || '')
        if (nombre) setSaludo(`Hola, ${nombre}`)
        setPerfilForm({
          nombre,
          apellido: String(perfil.apellido || ''),
          documento: String(perfil.documento || ''),
          telefono: String(perfil.telefono || ''),
          area: String(perfil.area || ''),
        })
      } catch {
        if (!cancelled) setError('No se pudo cargar el perfil staff.')
      } finally {
        if (!cancelled) setCargando(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onProfileUpdated = (event: Event) => {
      const nombre = (event as CustomEvent<{ nombre?: string }>).detail?.nombre
      if (nombre?.trim()) setSaludo(`Hola, ${nombre.trim()}`)
    }
    window.addEventListener('colgo:profile-updated', onProfileUpdated)
    return () => window.removeEventListener('colgo:profile-updated', onProfileUpdated)
  }, [])

  const seccion = useMemo<'dashboard' | 'usuarios' | 'perfil'>(() => {
    if (location.pathname.endsWith('/usuarios')) return 'usuarios'
    if (location.pathname.endsWith('/perfil')) return 'perfil'
    return 'dashboard'
  }, [location.pathname])

  const guardarPerfil = async () => {
    setProfileError(null)
    setProfileOk(null)
    if (!perfilForm.nombre.trim() || !perfilForm.apellido.trim()) {
      setProfileError('Completa al menos nombre y apellido.')
      return
    }
    setSavingProfile(true)
    try {
      await updateUsuariosMePerfil({
        nombre: perfilForm.nombre.trim(),
        apellido: perfilForm.apellido.trim(),
        documento: perfilForm.documento.trim(),
        telefono: perfilForm.telefono.trim(),
        area: perfilForm.area.trim(),
      })
      setSaludo(`Hola, ${perfilForm.nombre.trim()}`)
      setProfileOk('Perfil actualizado correctamente.')
      setToast('Datos guardados')
      window.dispatchEvent(
        new CustomEvent('colgo:profile-updated', { detail: { nombre: perfilForm.nombre.trim() } }),
      )
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'No se pudo actualizar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className={cn(backofficePanelCardClass, 'flex items-center justify-between')}>
        <div>
          <p className="text-base font-semibold text-[var(--text)]">{saludo}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Panel operativo staff.</p>
        </div>
      </Card>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {seccion === 'dashboard' ? (
        <Card className={backofficePanelCardClass}>
          <p className="text-base font-semibold text-[var(--text)]">Accesos rápidos</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/staff/usuarios')}>
              Ir a usuarios
            </Button>
          </div>
        </Card>
      ) : null}

      {seccion === 'perfil' ? (
        <Card className={backofficePanelCardClass}>
          {profileError ? <p className="text-sm text-red-700">{profileError}</p> : null}
          {profileOk ? <p className="text-sm text-green-700">{profileOk}</p> : null}
          <div className={cn('grid gap-3 sm:grid-cols-2', (profileError || profileOk) && 'mt-3')}>
            <input
              value={perfilForm.nombre}
              onChange={(e) => setPerfilForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Nombre"
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
            <input
              value={perfilForm.apellido}
              onChange={(e) => setPerfilForm((p) => ({ ...p, apellido: e.target.value }))}
              placeholder="Apellido"
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
            <input
              value={perfilForm.documento}
              onChange={(e) => setPerfilForm((p) => ({ ...p, documento: e.target.value }))}
              placeholder="Documento"
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
            <input
              value={perfilForm.telefono}
              onChange={(e) => setPerfilForm((p) => ({ ...p, telefono: e.target.value }))}
              placeholder="Teléfono"
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
            <input
              value={perfilForm.area}
              onChange={(e) => setPerfilForm((p) => ({ ...p, area: e.target.value }))}
              placeholder="Área / responsabilidad"
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)] sm:col-span-2"
            />
          </div>
          <div className="mt-3">
            <Button type="button" variant="primary" onClick={() => void guardarPerfil()} disabled={savingProfile}>
              {savingProfile ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </Card>
      ) : null}

      {cargando ? <p className="text-sm text-[var(--muted)]">Cargando...</p> : null}
      <Toast message={toast} show={Boolean(toast)} onClose={() => setToast('')} />
    </div>
  )
}
