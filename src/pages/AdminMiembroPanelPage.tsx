import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Activity, BookOpen, ExternalLink, LayoutDashboard, Lock, Mail, Shield, UserCircle2 } from 'lucide-react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { ColgoBrandBlock, rolEtiqueta as etiquetaModoInterfaz } from '../components/layout/ColgoBrandBlock'
import {
  backofficeBottomAccentClass,
  backofficeDarkCardChrome,
  backofficeDarkOrbBottomLeft,
  backofficeDarkOrbTopRight,
  backofficePanelCardClass,
  backofficeDarkSurfaceGradient,
  backofficeDarkSurfaceInset,
  backofficeTopHeaderPadClass,
  backofficeTopHeaderFrameClass,
  backofficeTopTwoBlockGridClass,
  backofficeTopTwoBlockLeftClass,
  backofficeTopTwoBlockRightClass,
} from '../components/layout/backofficeVisual'
import { cn } from '../utils/cn'
import {
  asignarDocenteCurso,
  deleteUsuarioAdmin,
  getUsuarioActividadAdmin,
  getUsuarioDetalleAdmin,
  getUsuarioPermisosAdmin,
  getUsuariosCursosDisponibles,
  inscribirEstudiantesCurso,
  listUsuariosAdmin,
  resendUsuarioWelcomeEmail,
  resetUsuarioPasswordAdmin,
  toggleUsuarioActivo,
  updateUsuarioAdmin,
  updateUsuarioPermisosAdmin,
  type ActividadUsuario,
  type RolApi,
  type UsuarioDetalleAdmin,
  type UsuarioListaItem,
  type UsuarioPermisos,
} from '../services/apiClient'
import { loadSessionUser, type UserRole } from '../state/authSession'
import { PAIS_COLOMBIA, PAISES_OPCIONES } from '../data/paisesLista'
import { useColombiaMunicipios } from '../hooks/useColombiaMunicipios'

/** Valor válido para <input type="date" /> (YYYY-MM-DD). */
function toHtmlDateInputValue(value: unknown): string {
  const s = String(value ?? '').trim()
  if (!s) return ''
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  const dm = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dm) {
    const d = Number(dm[1])
    const mo = Number(dm[2])
    const y = Number(dm[3])
    if (Number.isFinite(d) && Number.isFinite(mo) && Number.isFinite(y) && mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  return ''
}

function rolEtiqueta(rol: string): string {
  if (rol === 'admin') return 'Administrador'
  if (rol === 'staff') return 'Staff'
  if (rol === 'docente') return 'Docente'
  if (rol === 'estudiante') return 'Estudiante'
  return rol
}

function presetByTrustLevel(nivel: UsuarioPermisos['nivel_confianza']): UsuarioPermisos {
  if (nivel === 'alta') {
    return {
      nivel_confianza: 'alta',
      gestionar_usuarios: true,
      asignar_cursos: true,
      bloquear_usuarios: true,
      ver_logs: true,
      eliminar_usuarios: false,
    }
  }
  if (nivel === 'media') {
    return {
      nivel_confianza: 'media',
      gestionar_usuarios: true,
      asignar_cursos: true,
      bloquear_usuarios: false,
      ver_logs: true,
      eliminar_usuarios: false,
    }
  }
  return {
    nivel_confianza: 'baja',
    gestionar_usuarios: false,
    asignar_cursos: false,
    bloquear_usuarios: false,
    ver_logs: false,
    eliminar_usuarios: false,
  }
}

const fieldClass =
  'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]'

const profileLabelClass =
  'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]'

const TIPOS_DOCUMENTO_ESTUDIANTE: { value: string; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'RC', label: 'Registro civil' },
  { value: 'CE', label: 'Cédula de extranjería' },
]

type TabId = 'resumen' | 'perfil' | 'cursos' | 'seguridad' | 'staff' | 'actividad'

function buildTabItems(rol: RolApi, viewerRol: UserRole): { id: TabId; label: string; icon: ReactNode }[] {
  const ic = 'h-3 w-3 shrink-0 opacity-90'
  const items: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: 'resumen', label: 'Resumen', icon: <LayoutDashboard className={ic} /> },
    { id: 'perfil', label: 'Perfil y datos anexos', icon: <UserCircle2 className={ic} /> },
  ]
  if (rol === 'docente' || rol === 'estudiante') {
    items.push({
      id: 'cursos',
      label: 'Cursos y asignación',
      icon: <BookOpen className={ic} />,
    })
  }
  items.push({ id: 'seguridad', label: 'Seguridad', icon: <Lock className={ic} /> })
  if (rol === 'staff' && viewerRol === 'admin') {
    items.push({ id: 'staff', label: 'Permisos staff', icon: <Shield className={ic} /> })
  }
  items.push({ id: 'actividad', label: 'Actividad', icon: <Activity className={ic} /> })
  return items
}

export default function AdminMiembroPanelPage() {
  const { id: idParam } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const session = loadSessionUser()
  const viewerRol = (session?.rol as UserRole) || 'admin'
  const basePath = viewerRol === 'staff' ? '/staff' : '/admin'

  const returnTo = useMemo(() => {
    const r = searchParams.get('return')
    if (r && r.startsWith('/')) return r
    return viewerRol === 'staff' ? `${basePath}/usuarios` : `${basePath}/usuarios`
  }, [searchParams, viewerRol, basePath])

  const origen = searchParams.get('origen') || 'rol'
  const allowDelete = origen === 'nuevo' && viewerRol === 'admin'

  const id = Number(idParam)
  const idValid = Number.isFinite(id) && id > 0

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [listaItem, setListaItem] = useState<UsuarioListaItem | null>(null)

  const [formEditar, setFormEditar] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    email: '',
    activo: true,
    rol: '' as '' | RolApi,
    telefono: '',
    direccion: '',
    ciudad: '',
    pais: '',
    departamento: '',
    municipio: '',
    fecha_nacimiento: '',
    estado_civil: '',
    especialidad: '',
    tipoDocumento: '',
  })
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null)

  const [cursosAsignables, setCursosAsignables] = useState<
    Array<{ id: number; nombre: string; codigo?: string; docente?: string | null }>
  >([])
  const [cursoAsignacionIds, setCursoAsignacionIds] = useState<number[]>([])
  const [guardandoCursos, setGuardandoCursos] = useState(false)

  const [reenviando, setReenviando] = useState(false)
  const [actividad, setActividad] = useState<ActividadUsuario[]>([])
  const [cargandoActividad, setCargandoActividad] = useState(false)

  const [formPermisos, setFormPermisos] = useState<UsuarioPermisos>(presetByTrustLevel('baja'))
  const [guardandoPermisos, setGuardandoPermisos] = useState(false)

  const [enviarResetCorreo, setEnviarResetCorreo] = useState(true)
  const [passwordTemporal, setPasswordTemporal] = useState<string | null>(null)
  const [reseteando, setReseteando] = useState(false)

  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [tab, setTab] = useState<TabId>('resumen')
  const { departamentos: colombiaDeptos, geoError: colombiaGeoError } = useColombiaMunicipios()

  const departamentosColombiaOrdenados = useMemo(() => {
    if (!colombiaDeptos) return []
    return [...colombiaDeptos].sort((a, b) => a.departamento.localeCompare(b.departamento, 'es'))
  }, [colombiaDeptos])

  const municipiosColombiaOrdenados = useMemo(() => {
    if (!colombiaDeptos || !formEditar.departamento) return []
    const row = colombiaDeptos.find((x) => x.departamento === formEditar.departamento)
    if (!row?.ciudades?.length) return []
    return [...row.ciudades].sort((a, b) => a.localeCompare(b, 'es'))
  }, [colombiaDeptos, formEditar.departamento])

  useEffect(() => {
    setTab('resumen')
  }, [id])

  const onChangeEditar =
    (name: Exclude<keyof typeof formEditar, 'activo'>) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.value
      setFormEditar((f) => {
        if (name === 'pais') {
          const esCo = v === PAIS_COLOMBIA
          return {
            ...f,
            pais: v,
            departamento: esCo ? f.departamento : '',
            municipio: esCo ? f.municipio : '',
          }
        }
        if (name === 'departamento') {
          return { ...f, departamento: v, municipio: '' }
        }
        return { ...f, [name]: v }
      })
    }

  const cargar = useCallback(async () => {
    if (!idValid) {
      setError('ID de miembro inválido.')
      setCargando(false)
      return
    }
    setCargando(true)
    setError(null)
    try {
      const [lista, cursosData] = await Promise.all([listUsuariosAdmin(), getUsuariosCursosDisponibles()])
      const arr = Array.isArray(lista) ? lista : []
      const u = arr.find((x) => x.id === id) || null
      if (!u) {
        setListaItem(null)
        setError('Usuario no encontrado o sin permisos para verlo.')
        setCargando(false)
        return
      }
      setListaItem(u)
      const cursos = Array.isArray(cursosData) ? cursosData : []
      setCursosAsignables(
        cursos
          .filter((c) => c?.activo !== false && String(c?.docente || '').trim())
          .map((c) => ({
            id: Number(c.id),
            nombre: String(c.nombre || ''),
            codigo: String(c.codigo || ''),
            docente: c.docente ? String(c.docente) : null,
          })),
      )
      setCursoAsignacionIds([])
      setPasswordTemporal(null)

      setCargandoDetalle(true)
      try {
        const detalle = await getUsuarioDetalleAdmin(u.id)
        const d = detalle as UsuarioDetalleAdmin
        setFormEditar({
          nombres: String(detalle.nombres || ''),
          apellidos: String(detalle.apellidos || ''),
          cedula: String(detalle.cedula || ''),
          email: String(detalle.email || ''),
          activo: Boolean(detalle.activo),
          rol: detalle.rol,
          telefono: String(detalle.telefono || ''),
          direccion: String(d.direccion || ''),
          ciudad: String(d.ciudad || ''),
          pais: String(d.pais || ''),
          departamento: String(d.departamento || ''),
          municipio: String(d.municipio || ''),
          fecha_nacimiento: toHtmlDateInputValue(d.fecha_nacimiento),
          estado_civil: String(d.estado_civil || ''),
          especialidad: String(d.especialidad || ''),
          tipoDocumento: String(d.tipo_documento || ''),
        })
        if (u.rol === 'staff' && viewerRol === 'admin') {
          const permisos = await getUsuarioPermisosAdmin(u.id)
          setFormPermisos(permisos)
        }
      } catch {
        const nombresBase = String(u.nombre_completo || '').split(' ')
        setFormEditar({
          nombres: nombresBase.slice(0, 1).join(' ') || '',
          apellidos: nombresBase.slice(1).join(' ') || '',
          cedula: String(u.documento || ''),
          email: String(u.email || ''),
          activo: Boolean(u.activo),
          rol: u.rol,
          telefono: '',
          direccion: '',
          ciudad: '',
          pais: '',
          departamento: '',
          municipio: '',
          fecha_nacimiento: '',
          estado_civil: '',
          especialidad: '',
          tipoDocumento: '',
        })
      } finally {
        setCargandoDetalle(false)
      }

      setCargandoActividad(true)
      try {
        const act = await getUsuarioActividadAdmin(u.id)
        setActividad(Array.isArray(act) ? act : [])
      } catch {
        setActividad([])
      } finally {
        setCargandoActividad(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el miembro')
      setListaItem(null)
    } finally {
      setCargando(false)
    }
  }, [id, idValid])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    if (!listaItem) return
    const prev = document.title
    document.title = `Ficha: ${listaItem.nombre_completo || listaItem.email} · COLGO`
    return () => {
      document.title = prev
    }
  }, [listaItem])

  const volverLista = () => {
    navigate(returnTo)
  }

  const guardarPerfil = (e: FormEvent) => {
    e.preventDefault()
    if (!listaItem) return
    const telefonoLimpio = formEditar.telefono.trim()
    const emailLimpio = formEditar.email.trim().toLowerCase()
    const regexTelefono = /^[0-9+\-\s()]{7,20}$/
    if (!formEditar.nombres.trim() || !formEditar.apellidos.trim() || !formEditar.cedula.trim() || !emailLimpio) {
      setErrorPerfil('Completa nombres, apellidos, número de documento y correo.')
      return
    }
    if (telefonoLimpio && !regexTelefono.test(telefonoLimpio)) {
      setErrorPerfil('Teléfono inválido (7–20 caracteres).')
      return
    }
    if (formEditar.rol === 'estudiante') {
      if (!formEditar.tipoDocumento.trim()) {
        setErrorPerfil('Selecciona el tipo de documento de identidad.')
        return
      }
      if (!formEditar.direccion.trim()) {
        setErrorPerfil('La dirección es obligatoria para estudiantes.')
        return
      }
      if (!formEditar.pais.trim()) {
        setErrorPerfil('Selecciona el país de residencia.')
        return
      }
      if (formEditar.pais === PAIS_COLOMBIA) {
        if (!colombiaDeptos?.length) {
          setErrorPerfil('No se cargó el listado de Colombia. Comprueba que exista /geo/colombia-municipios.json y recarga la página.')
          return
        }
        if (!formEditar.departamento.trim() || !formEditar.municipio.trim()) {
          setErrorPerfil('Selecciona departamento y ciudad / municipio (lista oficial Colombia).')
          return
        }
      } else if (!formEditar.ciudad.trim()) {
        setErrorPerfil('Indica ciudad o localidad.')
        return
      }
    }
    if (formEditar.rol === 'docente' && !formEditar.especialidad.trim()) {
      setErrorPerfil('La especialidad es obligatoria para docentes.')
      return
    }
    void (async () => {
      setGuardandoPerfil(true)
      setErrorPerfil(null)
      setError(null)
      try {
        await updateUsuarioAdmin(listaItem.id, {
          nombres: formEditar.nombres.trim(),
          apellidos: formEditar.apellidos.trim(),
          cedula: formEditar.cedula.trim(),
          email: emailLimpio,
          activo: formEditar.activo,
          ...(formEditar.rol === 'estudiante'
            ? {
                telefono: telefonoLimpio,
                direccion: formEditar.direccion.trim(),
                ciudad:
                  formEditar.pais === PAIS_COLOMBIA
                    ? [formEditar.municipio.trim(), formEditar.departamento.trim(), formEditar.pais.trim()]
                        .filter(Boolean)
                        .join(', ')
                    : [formEditar.ciudad.trim(), formEditar.pais.trim()].filter(Boolean).join(', '),
                pais: formEditar.pais.trim(),
                departamento: formEditar.pais === PAIS_COLOMBIA ? formEditar.departamento.trim() : '',
                municipio: formEditar.pais === PAIS_COLOMBIA ? formEditar.municipio.trim() : '',
                fecha_nacimiento: formEditar.fecha_nacimiento.trim(),
                estado_civil: formEditar.estado_civil.trim(),
                tipo_documento: formEditar.tipoDocumento.trim(),
              }
            : {}),
          ...(formEditar.rol === 'docente'
            ? {
                telefono: telefonoLimpio,
                especialidad: formEditar.especialidad.trim(),
              }
            : {}),
        })
        setMensaje('Perfil guardado correctamente.')
        await cargar()
      } catch (err) {
        setErrorPerfil(err instanceof Error ? err.message : 'No se pudo guardar')
      } finally {
        setGuardandoPerfil(false)
      }
    })()
  }

  const guardarCursos = () => {
    if (!listaItem) return
    if (listaItem.rol !== 'docente' && listaItem.rol !== 'estudiante') return
    void (async () => {
      setGuardandoCursos(true)
      setError(null)
      setMensaje(null)
      try {
        if (cursoAsignacionIds.length === 0) {
          setError('Selecciona al menos un curso.')
          return
        }
        if (listaItem.rol === 'docente') {
          if (!listaItem.docente_id) throw new Error('Docente sin perfil interno')
          for (const cursoId of cursoAsignacionIds) {
            await asignarDocenteCurso(cursoId, Number(listaItem.docente_id))
          }
        } else {
          if (!listaItem.estudiante_id) throw new Error('Estudiante sin perfil interno')
          for (const cursoId of cursoAsignacionIds) {
            await inscribirEstudiantesCurso(cursoId, [Number(listaItem.estudiante_id)])
          }
        }
        setMensaje('Cursos asignados correctamente.')
        setCursoAsignacionIds([])
        await cargar()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al asignar cursos')
      } finally {
        setGuardandoCursos(false)
      }
    })()
  }

  const reenviar = () => {
    if (!listaItem) return
    void (async () => {
      setReenviando(true)
      setError(null)
      setMensaje(null)
      try {
        await resendUsuarioWelcomeEmail(listaItem.id)
        setMensaje(`Correo de bienvenida reenviado a ${listaItem.email}.`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo reenviar el correo')
      } finally {
        setReenviando(false)
      }
    })()
  }

  const generarReset = () => {
    if (!listaItem) return
    void (async () => {
      setReseteando(true)
      setError(null)
      setMensaje(null)
      try {
        const r = await resetUsuarioPasswordAdmin(listaItem.id, enviarResetCorreo)
        setPasswordTemporal(r.password_temporal)
        if (enviarResetCorreo && r.emailSent) setMensaje('Contraseña temporal generada y enviada por correo.')
        else if (enviarResetCorreo && !r.emailSent) setMensaje('Contraseña temporal generada. Falló el envío por correo.')
        else setMensaje('Contraseña temporal generada.')
        if (r.emailWarning) setError(`${r.emailWarning}${r.emailDetail ? ` (${r.emailDetail})` : ''}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo restablecer la contraseña')
      } finally {
        setReseteando(false)
      }
    })()
  }

  const toggleActivo = () => {
    if (!listaItem) return
    void (async () => {
      setCambiandoEstado(true)
      setError(null)
      setMensaje(null)
      try {
        await toggleUsuarioActivo(listaItem.id, !listaItem.activo)
        setMensaje(listaItem.activo ? 'Usuario desactivado.' : 'Usuario activado.')
        await cargar()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado')
      } finally {
        setCambiandoEstado(false)
      }
    })()
  }

  const eliminarMiembro = () => {
    if (!listaItem || !allowDelete) return
    if (!window.confirm(`¿Eliminar definitivamente a ${listaItem.nombre_completo || listaItem.email}? Esta acción no se puede deshacer.`)) return
    void (async () => {
      setEliminando(true)
      setError(null)
      try {
        await deleteUsuarioAdmin(listaItem.id)
        navigate(returnTo)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo eliminar')
      } finally {
        setEliminando(false)
      }
    })()
  }

  const guardarPermisosStaff = () => {
    if (!listaItem || listaItem.rol !== 'staff' || viewerRol !== 'admin') return
    void (async () => {
      setGuardandoPermisos(true)
      setError(null)
      setMensaje(null)
      try {
        await updateUsuarioPermisosAdmin(listaItem.id, formPermisos)
        setMensaje('Permisos de staff actualizados.')
        await cargar()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo guardar permisos')
      } finally {
        setGuardandoPermisos(false)
      }
    })()
  }

  if (!idValid) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-700">ID inválido.</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate(basePath)}>
          Volver
        </Button>
      </div>
    )
  }

  if (cargando) {
    return (
      <div className="min-h-[70vh] space-y-4 p-4 lg:p-8">
        <div className="h-9 w-44 animate-pulse rounded-xl bg-[var(--panel-2)]" />
        <div className="overflow-hidden rounded-2xl border border-slate-700/25 shadow-md">
          <div className="space-y-2 bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-2.5 sm:px-5 sm:py-2.5 sm:h-[8.25rem]">
            <div className="h-5 w-56 max-w-full animate-pulse rounded bg-white/10" />
            <div className="h-3 w-40 max-w-full animate-pulse rounded bg-white/10" />
            <div className="flex flex-wrap gap-1 border-t border-white/10 pt-1.5">
              <div className="h-7 w-16 animate-pulse rounded-md bg-white/10" />
              <div className="h-7 w-20 animate-pulse rounded-md bg-white/10" />
              <div className="h-7 w-14 animate-pulse rounded-md bg-white/10" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-2xl bg-[var(--panel-2)]" />
          <div className="h-48 animate-pulse rounded-2xl bg-[var(--panel-2)]" />
        </div>
        <p className="text-center text-sm text-[var(--muted)]">Cargando ficha del miembro…</p>
      </div>
    )
  }

  if (!listaItem) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-700">{error || 'No encontrado.'}</p>
        <Button className="mt-4" variant="secondary" onClick={volverLista}>
          Volver a la lista
        </Button>
      </div>
    )
  }

  const u = listaItem
  const supervisionHref = viewerRol === 'admin' && (u.rol === 'docente' || u.rol === 'estudiante') ? `/admin/supervision?target=${u.id}` : null

  const tabItems = buildTabItems(u.rol, viewerRol)
  const fichaHeaderChipTitulo = (() => {
    switch (tab) {
      case 'resumen':
        return 'Resumen del miembro'
      case 'perfil':
        return 'Perfil y datos anexos'
      case 'cursos':
        return u.rol === 'docente' ? 'Cursos como docente' : 'Inscripción a cursos'
      case 'seguridad':
        return 'Seguridad'
      case 'staff':
        return 'Permisos staff'
      case 'actividad':
        return 'Actividad reciente'
      default:
        return tabItems.find((item) => item.id === tab)?.label ?? ''
    }
  })()
  const resumenChecksBase = [
    { label: 'Nombre(s)', ok: Boolean(formEditar.nombres.trim()) },
    { label: 'Apellido(s)', ok: Boolean(formEditar.apellidos.trim()) },
    { label: 'Correo electrónico', ok: Boolean(formEditar.email.trim()) },
    { label: 'Documento', ok: Boolean(formEditar.cedula.trim()) },
  ]
  const resumenChecksPorRol =
    formEditar.rol === 'estudiante'
      ? [
          { label: 'Tipo de documento', ok: Boolean(formEditar.tipoDocumento.trim()) },
          { label: 'Teléfono', ok: Boolean(formEditar.telefono.trim()) },
          { label: 'Dirección', ok: Boolean(formEditar.direccion.trim()) },
          { label: 'País', ok: Boolean(formEditar.pais.trim()) },
          {
            label: formEditar.pais === PAIS_COLOMBIA ? 'Departamento' : 'Ciudad o localidad',
            ok: formEditar.pais === PAIS_COLOMBIA ? Boolean(formEditar.departamento.trim()) : Boolean(formEditar.ciudad.trim()),
          },
          {
            label: formEditar.pais === PAIS_COLOMBIA ? 'Municipio' : 'Estado civil',
            ok: formEditar.pais === PAIS_COLOMBIA ? Boolean(formEditar.municipio.trim()) : Boolean(formEditar.estado_civil.trim()),
          },
          { label: 'Fecha de nacimiento', ok: Boolean(formEditar.fecha_nacimiento.trim()) },
        ]
      : formEditar.rol === 'docente'
        ? [
            { label: 'Teléfono', ok: Boolean(formEditar.telefono.trim()) },
            { label: 'Especialidad', ok: Boolean(formEditar.especialidad.trim()) },
          ]
        : []
  const resumenChecks = [...resumenChecksBase, ...resumenChecksPorRol]
  const camposCompletos = resumenChecks.filter((x) => x.ok).length
  const totalCampos = resumenChecks.length || 1
  const progresoPerfil = Math.round((camposCompletos / totalCampos) * 100)
  const faltantesPerfil = resumenChecks.filter((x) => !x.ok).map((x) => x.label)
  const resumenTablaCamposBase: Array<{ campo: string; valor: string; ok: boolean }> = [
    { campo: 'Nombre(s)', valor: formEditar.nombres.trim(), ok: Boolean(formEditar.nombres.trim()) },
    { campo: 'Apellido(s)', valor: formEditar.apellidos.trim(), ok: Boolean(formEditar.apellidos.trim()) },
    { campo: 'Correo electrónico', valor: formEditar.email.trim(), ok: Boolean(formEditar.email.trim()) },
    { campo: 'Documento', valor: formEditar.cedula.trim(), ok: Boolean(formEditar.cedula.trim()) },
  ]
  const resumenTablaCamposRol: Array<{ campo: string; valor: string; ok: boolean }> =
    formEditar.rol === 'estudiante'
      ? [
          { campo: 'Tipo de documento', valor: formEditar.tipoDocumento.trim(), ok: Boolean(formEditar.tipoDocumento.trim()) },
          { campo: 'Teléfono', valor: formEditar.telefono.trim(), ok: Boolean(formEditar.telefono.trim()) },
          { campo: 'Dirección', valor: formEditar.direccion.trim(), ok: Boolean(formEditar.direccion.trim()) },
          { campo: 'País', valor: formEditar.pais.trim(), ok: Boolean(formEditar.pais.trim()) },
          {
            campo: 'Departamento',
            valor: formEditar.pais === PAIS_COLOMBIA ? formEditar.departamento.trim() : 'No aplica',
            ok: formEditar.pais === PAIS_COLOMBIA ? Boolean(formEditar.departamento.trim()) : true,
          },
          {
            campo: 'Ciudad / municipio',
            valor: formEditar.pais === PAIS_COLOMBIA ? formEditar.municipio.trim() : formEditar.ciudad.trim(),
            ok: formEditar.pais === PAIS_COLOMBIA ? Boolean(formEditar.municipio.trim()) : Boolean(formEditar.ciudad.trim()),
          },
          { campo: 'Fecha de nacimiento', valor: formEditar.fecha_nacimiento.trim(), ok: Boolean(formEditar.fecha_nacimiento.trim()) },
          { campo: 'Estado civil', valor: formEditar.estado_civil.trim(), ok: Boolean(formEditar.estado_civil.trim()) },
        ]
      : formEditar.rol === 'docente'
        ? [
            { campo: 'Teléfono', valor: formEditar.telefono.trim(), ok: Boolean(formEditar.telefono.trim()) },
            { campo: 'Especialidad', valor: formEditar.especialidad.trim(), ok: Boolean(formEditar.especialidad.trim()) },
          ]
        : []
  const resumenTablaCampos = [...resumenTablaCamposBase, ...resumenTablaCamposRol]
  /** Misma pauta que `DataTable` (Table.tsx): cabecera + filas cebra + hover */
  const resumenTablaHeadThClass =
    'sticky top-0 z-[1] border-b-2 border-[var(--accent)] bg-[var(--panel-2)] px-4 py-3 text-left align-middle text-sm font-extrabold uppercase tracking-wide text-[var(--text)] antialiased'
  const tabCardClass = cn(backofficePanelCardClass, 'bg-gradient-to-b from-[var(--surface)] to-[var(--panel-2)] p-4 sm:p-5')
  const tabHeaderTitleClass = 'text-base font-semibold tracking-tight text-[var(--text)]'
  const tabInnerBlockClass = cn(
    'rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-4',
    'ring-1 ring-inset ring-amber-300/22',
  )

  return (
    <div className="flex min-h-0 w-full flex-col gap-5 px-0 pb-10 pt-0 lg:gap-6 lg:pb-12 lg:pt-0">
      <div className={cn('w-full', backofficeTopTwoBlockGridClass)}>
        <div className={backofficeTopTwoBlockLeftClass}>
          <div className="px-3 pt-3">
            <ColgoBrandBlock badgeLabel={etiquetaModoInterfaz(viewerRol)} variant="fichaHeader" className="rounded-2xl" />
          </div>
        </div>

        <div className={cn('w-full', backofficeTopTwoBlockRightClass)}>
          <div className="mx-3 pt-3 lg:mx-0">
            <header
              className={cn(
                'h-full text-white',
                backofficeTopHeaderFrameClass,
                backofficeDarkCardChrome,
                backofficeDarkSurfaceGradient,
                backofficeDarkSurfaceInset,
              )}
            >
              <div className={backofficeDarkOrbTopRight} aria-hidden />
              <div className={backofficeDarkOrbBottomLeft} aria-hidden />
              <div className={backofficeBottomAccentClass} aria-hidden />
              <div className={cn(backofficeTopHeaderPadClass, 'min-h-0 pt-3 pb-[1cm] grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-3')}>
                <div className="min-w-0 space-y-3 sm:space-y-4">
                  <p className="truncate text-base font-semibold tracking-tight text-white lg:text-lg">{u.nombre_completo || u.email}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/95 backdrop-blur-sm">
                      ID {u.id}
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/95 backdrop-blur-sm">
                      {rolEtiqueta(u.rol)}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm ${
                        u.activo ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-50' : 'border-red-400/35 bg-red-500/25 text-red-50'
                      }`}
                    >
                      {u.activo ? 'Cuenta activa' : 'Cuenta bloqueada'}
                    </span>
                  </div>
                  <p className="flex max-w-full items-center gap-2 text-sm text-white/75">
                    <Mail className="h-4 w-4 shrink-0 text-amber-200/90" aria-hidden />
                    <span className="truncate" title={u.email}>
                      {u.email}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 border-t border-white/10 pt-1.5 sm:border-t-0 sm:pt-0 lg:flex-col lg:items-stretch lg:border-t-0 lg:pt-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={cambiandoEstado}
                    onClick={toggleActivo}
                    className="h-7 min-h-0 border-white/20 bg-white/10 px-2.5 text-xs font-medium text-white hover:bg-white/18 lg:min-w-[10.5rem]"
                  >
                    {cambiandoEstado ? '…' : u.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={reenviando}
                    onClick={reenviar}
                    className="h-7 min-h-0 border-white/20 bg-white/10 px-2.5 text-xs font-medium text-white hover:bg-white/18 lg:min-w-[10.5rem]"
                  >
                    {reenviando ? 'Enviando…' : 'Reenviar bienvenida'}
                  </Button>
                  {supervisionHref ? (
                    <Link
                      to={supervisionHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abre la supervisión visual (solo lectura: cursos y datos del usuario) en una pestaña nueva. Esta ficha permanece abierta."
                      className="inline-flex h-7 min-h-0 min-w-0 shrink-0 items-center justify-center gap-1 rounded-xl border border-white/20 bg-white/10 px-2.5 text-xs font-medium text-white transition hover:bg-white/18 lg:min-w-[10.5rem]"
                    >
                      Ver como
                      <ExternalLink className="h-3 w-3 opacity-90" aria-hidden />
                    </Link>
                  ) : null}
                  {allowDelete && u.rol !== 'admin' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={eliminando}
                      onClick={eliminarMiembro}
                      className="h-7 min-h-0 border-red-400/35 bg-red-950/35 px-2.5 text-xs text-red-50 hover:bg-red-950/55 lg:min-w-[10.5rem]"
                    >
                      {eliminando ? 'Eliminando…' : 'Eliminar'}
                    </Button>
                  ) : null}
                </div>
                {fichaHeaderChipTitulo ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-1 z-20 flex justify-center">
                    <p className="max-w-[min(100%,42rem)] truncate rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-center text-xs font-semibold tracking-wide text-white/95 shadow-[0_2px_12px_rgba(0,0,0,0.25)] backdrop-blur-md sm:px-4 sm:text-sm">
                      {fichaHeaderChipTitulo}
                    </p>
                  </div>
                ) : null}
              </div>
            </header>
          </div>
        </div>

        <aside className="overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] via-[#fffdf8] to-[var(--panel-2)] shadow-[6px_0_28px_rgba(15,23,42,0.08)] lg:sticky lg:top-0 lg:col-start-1 lg:row-start-2 lg:max-h-dvh lg:self-start lg:overflow-y-auto lg:rounded-l-none lg:rounded-r-2xl lg:border-l-0">
          <div className="relative p-2">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-amber-50/40 to-transparent" aria-hidden />
          <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-[var(--accent)]/50 via-[var(--accent-2)]/25 to-transparent" aria-hidden />
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Secciones</p>
          <nav className="flex flex-col gap-1" aria-label="Secciones de la ficha">
            {tabItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-150 ${
                  tab === item.id
                    ? 'border border-slate-200 bg-gradient-to-r from-white to-slate-100/75 font-semibold text-[var(--text)] ring-1 ring-[rgba(251,191,36,0.18)]'
                    : 'border border-transparent font-medium text-[var(--text)]/78 hover:border-slate-300/70 hover:bg-gradient-to-r hover:from-slate-100/95 hover:to-slate-200/75 hover:text-[var(--text)]'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                    tab === item.id
                      ? 'border-slate-300/80 bg-slate-100/90 text-[rgba(113,63,18,0.95)]'
                      : 'border-[rgba(15,23,42,0.08)] bg-slate-50/80 text-[var(--muted)] group-hover:border-slate-300/80 group-hover:bg-slate-200/85 group-hover:text-[var(--text)]'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-3 border-t border-[var(--border)] pt-3">
            <Button type="button" variant="primary" onClick={volverLista} className="w-full text-xs">
              Volver
            </Button>
          </div>
          </div>
        </aside>

        <div className="min-w-0 w-full space-y-4 lg:col-start-2 lg:row-start-2">
          {mensaje ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{mensaje}</div>
          ) : null}
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {tab === 'resumen' ? (
        <Card className={tabCardClass}>
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <div className="flex flex-col divide-y divide-[var(--border)] bg-[var(--panel-2)]/50 lg:flex-row lg:divide-x lg:divide-y-0">
              <div className="min-w-0 flex-[1.25] p-3.5 lg:py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Completitud del perfil</p>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <p className="text-sm text-[var(--text)]">
                    {camposCompletos} de {totalCampos} campos
                  </p>
                  <span className="text-xs font-semibold tabular-nums text-[var(--text)]">{progresoPerfil}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                    style={{ width: `${progresoPerfil}%` }}
                  />
                </div>
              </div>
              <div className="flex min-w-0 flex-none flex-col justify-center p-3.5 lg:w-[7.5rem] xl:w-[8.5rem]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Estado de cuenta</p>
                <p className="mt-1 text-sm font-medium text-[var(--text)]">{u.activo ? 'Activa' : 'Bloqueada'}</p>
              </div>
              <div className="min-w-0 flex-1 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Último acceso</p>
                <p className="mt-1 break-words text-sm text-[var(--text)]">
                  {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-CO') : '—'}
                </p>
              </div>
              <div className="min-w-0 flex-1 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Cursos</p>
                <p className="mt-1 text-sm text-[var(--text)]">
                  {u.cursos_asignados || (u.rol === 'admin' || u.rol === 'staff' ? 'No aplica' : 'Sin asignar')}
                </p>
              </div>
              {u.rol === 'staff' ? (
                <div className="flex min-w-0 flex-none flex-col justify-center p-3.5 lg:w-[7.5rem]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Nivel de confianza</p>
                  <p className="mt-1 text-sm font-medium text-[var(--text)]">{(u.nivel_confianza || 'baja').toUpperCase()}</p>
                </div>
              ) : null}
            </div>
            <div className="border-t border-[var(--border)] bg-[var(--surface)]/80 px-0 py-0 sm:px-0">
              <div className="overflow-x-auto rounded-b-xl">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className={cn(resumenTablaHeadThClass, 'w-[40%] min-w-[10rem] sm:w-[45%]')}>
                        Datos de campo
                      </th>
                      <th scope="col" className={cn(resumenTablaHeadThClass, 'min-w-[6.5rem] whitespace-nowrap')}>
                        Valor actual
                      </th>
                      <th scope="col" className={cn(resumenTablaHeadThClass, 'min-w-[6.5rem] whitespace-nowrap text-right')}>
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenTablaCampos.map((row, index) => {
                      const sep =
                        index < resumenTablaCampos.length - 1 ? 'border-b border-amber-300/55' : ''
                      return (
                      <tr
                        key={row.campo}
                        className={cn(
                          'transition-[background-color,box-shadow] duration-150',
                          index % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--panel-2)]',
                          'hover:bg-amber-50/75 hover:shadow-[inset_0_0_0_9999px_rgba(251,191,36,0.06)]',
                        )}
                      >
                        <th
                          scope="row"
                          className={cn(
                            'px-4 py-2.5 text-left align-middle text-sm font-semibold text-[var(--text)]',
                            sep,
                          )}
                        >
                          {row.campo}
                        </th>
                        <td className={cn('px-4 py-2.5 align-middle text-sm text-[var(--text)]', sep)}>{row.valor || '—'}</td>
                        <td className={cn('px-4 py-2.5 text-right align-middle text-sm', sep)}>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                              row.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
                            )}
                          >
                            {row.ok ? 'Completo' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {faltantesPerfil.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <span className="font-semibold">Campos pendientes: </span>
              {faltantesPerfil.join(', ')}
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === 'perfil' ? (
      <form onSubmit={guardarPerfil}>
        <Card className={tabCardClass}>
          {cargandoDetalle ? (
            <p className="mb-3 text-xs font-medium text-amber-700">Sincronizando con el servidor…</p>
          ) : null}
          {errorPerfil ? <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{errorPerfil}</div> : null}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={tabInnerBlockClass}>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Identidad legal</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={profileLabelClass}>Nombre(s)</span>
                  <input
                    className={fieldClass}
                    value={formEditar.nombres}
                    onChange={onChangeEditar('nombres')}
                    placeholder="Ej. Juan Carlos"
                    autoComplete="given-name"
                  />
                </label>
                <label className="block">
                  <span className={profileLabelClass}>Apellido(s)</span>
                  <input
                    className={fieldClass}
                    value={formEditar.apellidos}
                    onChange={onChangeEditar('apellidos')}
                    placeholder="Ej. Pérez García"
                    autoComplete="family-name"
                  />
                </label>
                {formEditar.rol === 'estudiante' ? (
                  <>
                    <label className="block">
                      <span className={profileLabelClass}>Tipo de documento</span>
                      <select
                        className={fieldClass}
                        value={formEditar.tipoDocumento}
                        onChange={onChangeEditar('tipoDocumento')}
                      >
                        <option value="">Selecciona tipo</option>
                        {TIPOS_DOCUMENTO_ESTUDIANTE.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={profileLabelClass}>Número de documento</span>
                      <input
                        className={fieldClass}
                        value={formEditar.cedula}
                        onChange={onChangeEditar('cedula')}
                        placeholder="Sin puntos ni espacios"
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    </label>
                  </>
                ) : (
                  <label className="block sm:col-span-2">
                    <span className={profileLabelClass}>Documento de identidad</span>
                    <input
                      className={fieldClass}
                      value={formEditar.cedula}
                      onChange={onChangeEditar('cedula')}
                      placeholder="Número de identificación"
                      autoComplete="off"
                    />
                  </label>
                )}
                {formEditar.rol !== 'estudiante' && formEditar.rol !== 'docente' ? (
                  <label className="block sm:col-span-2">
                    <span className={profileLabelClass}>Correo electrónico</span>
                    <input
                      type="email"
                      className={fieldClass}
                      value={formEditar.email}
                      onChange={onChangeEditar('email')}
                      placeholder="correo@ejemplo.com"
                      autoComplete="email"
                    />
                  </label>
                ) : null}
              </div>
            </div>
            {(formEditar.rol === 'estudiante' || formEditar.rol === 'docente') ? (
              <div className={tabInnerBlockClass}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Contacto</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={profileLabelClass}>Correo electrónico</span>
                    <input
                      type="email"
                      className={fieldClass}
                      value={formEditar.email}
                      onChange={onChangeEditar('email')}
                      placeholder="correo@ejemplo.com"
                      autoComplete="email"
                    />
                  </label>
                  <label className="block">
                    <span className={profileLabelClass}>Teléfono</span>
                    <input
                      className={fieldClass}
                      value={formEditar.telefono}
                      onChange={onChangeEditar('telefono')}
                      placeholder="Ej. +57 300 1234567"
                      autoComplete="tel"
                    />
                  </label>
                </div>
              </div>
            ) : null}
            {formEditar.rol === 'estudiante' ? (
              <div className={cn(tabInnerBlockClass, 'lg:col-span-2')}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Datos de estudiante</p>
                {colombiaGeoError ? <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">{colombiaGeoError}</p> : null}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Dirección</span>
                    <input
                      className={fieldClass}
                      value={formEditar.direccion}
                      onChange={onChangeEditar('direccion')}
                      placeholder="Calle, barrio, número…"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">País</span>
                    <select className={fieldClass} value={formEditar.pais} onChange={onChangeEditar('pais')}>
                      <option value="">Selecciona país</option>
                      {PAISES_OPCIONES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {formEditar.pais === PAIS_COLOMBIA ? (
                    <>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Departamento</span>
                        <select
                          className={fieldClass}
                          value={formEditar.departamento}
                          onChange={onChangeEditar('departamento')}
                          disabled={!colombiaDeptos?.length}
                        >
                          <option value="">{colombiaDeptos?.length ? 'Selecciona departamento' : 'Cargando…'}</option>
                          {departamentosColombiaOrdenados.map((d) => (
                            <option key={d.id} value={d.departamento}>
                              {d.departamento}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Ciudad / municipio</span>
                        <select
                          className={fieldClass}
                          value={formEditar.municipio}
                          onChange={onChangeEditar('municipio')}
                          disabled={!formEditar.departamento || municipiosColombiaOrdenados.length === 0}
                        >
                          <option value="">{formEditar.departamento ? 'Selecciona municipio' : 'Primero el departamento'}</option>
                          {municipiosColombiaOrdenados.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : formEditar.pais ? (
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Ciudad o localidad</span>
                      <input
                        className={fieldClass}
                        value={formEditar.ciudad}
                        onChange={onChangeEditar('ciudad')}
                        placeholder="Ej. Ciudad de México, Guayaquil, Miami…"
                      />
                    </label>
                  ) : null}
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Fecha de nacimiento</span>
                    <input
                      type="date"
                      className={fieldClass}
                      value={formEditar.fecha_nacimiento}
                      onChange={onChangeEditar('fecha_nacimiento')}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Estado civil</span>
                    <select
                      className={fieldClass}
                      value={formEditar.estado_civil}
                      onChange={onChangeEditar('estado_civil')}
                    >
                      <option value="">Selecciona estado civil</option>
                      <option value="Soltero(a)">Soltero(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Unión libre">Unión libre</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viudo(a)">Viudo(a)</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : null}
            {formEditar.rol === 'docente' ? (
              <div className={tabInnerBlockClass}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Docente</p>
                <label className="block">
                  <span className={profileLabelClass}>Especialidad</span>
                  <input
                    className={fieldClass}
                    value={formEditar.especialidad}
                    onChange={onChangeEditar('especialidad')}
                    placeholder="Área o disciplina principal"
                  />
                </label>
              </div>
            ) : null}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 px-4 py-3 text-sm font-medium text-[var(--text)] lg:col-span-2">
              <input
                type="checkbox"
                checked={formEditar.activo}
                onChange={(e) => setFormEditar((f) => ({ ...f, activo: e.target.checked }))}
              />
              Cuenta activa
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm" disabled={guardandoPerfil}>
              {guardandoPerfil ? 'Guardando…' : 'Guardar perfil'}
            </Button>
          </div>
        </Card>
      </form>
      ) : null}

      {tab === 'cursos' && (u.rol === 'docente' || u.rol === 'estudiante') ? (
        <Card className={tabCardClass}>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Selecciona uno o varios cursos (con docente asignado) y aplica. Puedes volver a esta pestaña para sumar más.
          </p>
          <div className="mt-4 max-h-56 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-4">
            {cursosAsignables.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No hay cursos activos con docente asignado.</p>
            ) : (
              cursosAsignables.map((curso) => (
                <label key={curso.id} className="flex items-start gap-2 rounded px-1 py-1 hover:bg-white/40">
                  <input
                    type="checkbox"
                    checked={cursoAsignacionIds.includes(curso.id)}
                    onChange={(e) => {
                      setCursoAsignacionIds((prev) =>
                        e.target.checked ? [...prev, curso.id] : prev.filter((x) => x !== curso.id),
                      )
                    }}
                  />
                  <span className="text-xs text-[var(--text)]">
                    {curso.nombre} {curso.codigo ? `(${curso.codigo})` : ''} · Docente: {curso.docente}
                  </span>
                </label>
              ))
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <Button type="button" size="sm" disabled={guardandoCursos || cursoAsignacionIds.length === 0} onClick={guardarCursos}>
              {guardandoCursos ? 'Guardando…' : 'Aplicar cursos seleccionados'}
            </Button>
          </div>
        </Card>
      ) : null}

      {tab === 'seguridad' ? (
        <Card className={tabCardClass}>
          <div className={tabInnerBlockClass}>
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
              <h3 className={tabHeaderTitleClass}>Si olvidó la contraseña o no tiene el correo de acceso</h3>
            </div>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Reenvía el correo de bienvenida a <span className="font-medium text-[var(--text)]">{u.email}</span>. Allí suele venir el enlace o las
              instrucciones para entrar. Úsalo cuando el usuario no recuerde la clave o haya perdido el primer correo.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" disabled={reenviando} onClick={reenviar}>
                {reenviando ? 'Enviando…' : 'Reenviar correo de bienvenida'}
              </Button>
            </div>
          </div>
          <div className={cn(tabInnerBlockClass, 'mt-4')}>
            <div className="mb-3 flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <h3 className={tabHeaderTitleClass}>Nueva contraseña temporal (administración)</h3>
            </div>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Genera una clave provisional. Puedes copiarla y pasársela por otro canal, o marcar la opción para intentar enviarla por correo si el
              servidor de correo está configurado.
            </p>
            {passwordTemporal ? (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-900">Contraseña temporal generada</p>
                <p className="mt-2 font-mono text-sm font-medium text-amber-950">{passwordTemporal}</p>
                <Button
                  type="button"
                  className="mt-3"
                  variant="secondary"
                  size="sm"
                  onClick={() => void navigator.clipboard.writeText(passwordTemporal)}
                >
                  Copiar al portapapeles
                </Button>
              </div>
            ) : null}
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]">
              <input type="checkbox" checked={enviarResetCorreo} onChange={(e) => setEnviarResetCorreo(e.target.checked)} />
              También intentar enviar la contraseña temporal por correo
            </label>
            <div className="mt-4 flex justify-end">
              <Button type="button" size="sm" disabled={reseteando} onClick={generarReset}>
                {reseteando ? 'Generando…' : 'Generar contraseña temporal'}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {tab === 'staff' && u.rol === 'staff' && viewerRol === 'admin' ? (
        <Card className={tabCardClass}>
          <div className="grid max-w-xl grid-cols-1 gap-3">
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-semibold uppercase text-[var(--muted)]">Nivel de confianza</span>
              <select
                className={fieldClass}
                value={formPermisos.nivel_confianza}
                onChange={(e) => {
                  const nivel = e.target.value as UsuarioPermisos['nivel_confianza']
                  setFormPermisos(presetByTrustLevel(nivel))
                }}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </label>
            <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setFormPermisos((p) => presetByTrustLevel(p.nivel_confianza))}>
              Restaurar preset del nivel
            </Button>
            {(
              [
                ['gestionar_usuarios', 'Gestionar usuarios'],
                ['asignar_cursos', 'Asignar cursos'],
                ['bloquear_usuarios', 'Activar / desactivar usuarios'],
                ['ver_logs', 'Ver logs'],
                ['eliminar_usuarios', 'Eliminar usuarios'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={formPermisos[key]}
                  onChange={(e) => setFormPermisos((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="button" size="sm" disabled={guardandoPermisos} onClick={guardarPermisosStaff}>
              {guardandoPermisos ? 'Guardando…' : 'Guardar permisos'}
            </Button>
          </div>
        </Card>
      ) : null}

      {tab === 'actividad' ? (
        <Card className={tabCardClass}>
          <div className="max-h-[28rem] space-y-3 overflow-auto pr-1">
            {cargandoActividad ? (
              <p className="text-sm text-[var(--muted)]">Cargando…</p>
            ) : actividad.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Sin actividad registrada.</p>
            ) : (
              actividad.map((a) => (
                <div key={a.id} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-4">
                  <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-200/50" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text)]">{a.accion}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {a.actor_rol || '—'} · {new Date(a.fecha).toLocaleString('es-CO')}
                    </p>
                    {a.detalle ? <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{a.detalle}</p> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-6">
        <p className="text-xs text-[var(--muted)]">Los cambios se guardan con los botones de cada sección.</p>
      </div>
    </div>
  )
}
