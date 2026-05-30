import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Trash2, LayoutGrid, UserCheck, PauseCircle, Ban, Flag } from 'lucide-react'
import { Button } from '../components/common/Button'
import { Modal } from '../components/common/Modal'
import { Card } from '../components/common/Card'
import { SidebarFilterChip } from '../components/layout/SidebarNavButton'
import { backofficeAmberInsetHairline, backofficePanelCardClass } from '../components/layout/backofficeVisual'
import { cn } from '../utils/cn'
import { DataTable, type Column } from '../components/common/Table'
import {
  createUsuarioAdmin,
  deleteUsuarioAdmin,
  listUsuariosAdmin,
  updateUsuarioEstadoAcceso,
  validateUsuarioAdmin,
  type EstadoAcceso,
  type RolApi,
  type UsuarioListaItem,
} from '../services/apiClient'
import {
  ESTADOS_ACCESO,
  ETIQUETA_ESTADO_ACCESO,
  claseSelectEstadoAcceso,
  resolveEstadoAcceso,
} from '../utils/estadoAcceso'

const FILTROS_ESTADO = [
  { id: 'todos' as const, label: 'Todos', icon: <LayoutGrid strokeWidth={2} /> },
  { id: 'activo' as const, label: ETIQUETA_ESTADO_ACCESO.activo, icon: <UserCheck strokeWidth={2} /> },
  { id: 'suspendido' as const, label: ETIQUETA_ESTADO_ACCESO.suspendido, icon: <PauseCircle strokeWidth={2} /> },
  { id: 'cancelado' as const, label: ETIQUETA_ESTADO_ACCESO.cancelado, icon: <Ban strokeWidth={2} /> },
  { id: 'finalizado' as const, label: ETIQUETA_ESTADO_ACCESO.finalizado, icon: <Flag strokeWidth={2} /> },
]

function rolEtiqueta(rol: string): string {
  if (rol === 'admin') return 'Administrador'
  if (rol === 'staff') return 'Staff'
  if (rol === 'docente') return 'Docente'
  if (rol === 'estudiante') return 'Estudiante'
  return rol
}

type FormState = {
  nombres: string
  apellidos: string
  cedula: string
  email: string
  rol: RolApi
}

type ViewFiltro = 'todos' | 'admin' | 'docente' | 'estudiante' | 'staff'
type FiltroEstado = 'todos' | EstadoAcceso

const formVacio: FormState = {
  nombres: '',
  apellidos: '',
  cedula: '',
  email: '',
  rol: 'estudiante',
}

export default function UsuariosPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const vistaQuery = searchParams.get('vista')
  const rolDesdeRuta: ViewFiltro | null = location.pathname.endsWith('/docentes')
    ? 'docente'
    : location.pathname.endsWith('/estudiantes-gestion') || location.pathname.endsWith('/estudiantes')
      ? 'estudiante'
      : location.pathname.endsWith('/staff')
        ? 'staff'
        : null
  const vistaInicial: ViewFiltro =
    rolDesdeRuta ??
    (vistaQuery === 'admin' || vistaQuery === 'docente' || vistaQuery === 'estudiante' || vistaQuery === 'staff'
      ? vistaQuery
      : 'todos')
  const [usuarios, setUsuarios] = useState<UsuarioListaItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorLista, setErrorLista] = useState<string | null>(null)
  const [vistaActiva, setVistaActiva] = useState<ViewFiltro>(vistaInicial)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState<FormState>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  /** Solo advertencia (correo no enviado); nunca bloquea el alta exitosa */
  const [advertenciaCorreo, setAdvertenciaCorreo] = useState<string | null>(null)
  const [detalleCorreo, setDetalleCorreo] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<number>>(() => new Set())
  const [confirmEliminar, setConfirmEliminar] = useState<UsuarioListaItem[] | null>(null)
  const [eliminandoLote, setEliminandoLote] = useState(false)
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<number | null>(null)
  const [validacion, setValidacion] = useState<{
    checking: boolean
    cedulaExists: boolean
    emailExists: boolean
    emailRol: string | null
    emailId: number | null
    emailHint: string | null
  }>({ checking: false, cedulaExists: false, emailExists: false, emailRol: null, emailId: null, emailHint: null })

  useEffect(() => {
    setVistaActiva(vistaInicial)
  }, [vistaInicial])

  const cambiarVista = (vista: ViewFiltro) => {
    setVistaActiva(vista)
    if (vista === 'todos') {
      setSearchParams({})
      return
    }
    setSearchParams({ vista })
  }

  const esModuloDocentes = vistaActiva === 'docente'
  const esModuloEstudiantes = vistaActiva === 'estudiante'
  const esModuloStaff = vistaActiva === 'staff'
  const esModuloRol = esModuloDocentes || esModuloEstudiantes || esModuloStaff
  const esVistaNuevoRegistro = !esModuloRol

  const rolModulo: RolApi | null = esModuloEstudiantes
    ? 'estudiante'
    : esModuloDocentes
      ? 'docente'
      : esModuloStaff
        ? 'staff'
        : null

  const abrirModalCrear = () => {
    setErrorForm(null)
    setMensajeExito(null)
    setAdvertenciaCorreo(null)
    setDetalleCorreo(null)
    setValidacion({ checking: false, cedulaExists: false, emailExists: false, emailRol: null, emailId: null, emailHint: null })
    setForm({ ...formVacio, rol: rolModulo ?? formVacio.rol })
    setShowCreateModal(true)
  }

  const panelBase = location.pathname.startsWith('/staff') ? '/staff' : '/admin'
  const origenLista = esVistaNuevoRegistro ? 'nuevo' : 'rol'
  const abrirPanelMiembro = (u: UsuarioListaItem) => {
    const ret = encodeURIComponent(`${location.pathname}${location.search}`)
    navigate(`${panelBase}/miembros/${u.id}?return=${ret}&origen=${origenLista}`)
  }

  const rolFiltroApi: RolApi | undefined =
    vistaActiva === 'admin' || vistaActiva === 'docente' || vistaActiva === 'estudiante' || vistaActiva === 'staff'
      ? vistaActiva
      : undefined

  const cargar = useCallback(
    async (terminoBusqueda?: string) => {
      setCargando(true)
      setErrorLista(null)
      try {
        const data = await listUsuariosAdmin({
          rol: rolFiltroApi,
          q: terminoBusqueda?.trim() || undefined,
          lite: true,
          limit: 500,
        })
        setUsuarios(Array.isArray(data) ? data : [])
      } catch (e) {
        setErrorLista(e instanceof Error ? e.message : 'No se pudo cargar la lista')
        setUsuarios([])
      } finally {
        setCargando(false)
      }
    },
    [rolFiltroApi],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void cargar(busqueda)
    }, busqueda.trim() ? 280 : 0)
    return () => window.clearTimeout(timer)
  }, [cargar, busqueda, vistaActiva])

  useEffect(() => {
    setSeleccionados((prev) => {
      const ids = new Set(usuarios.map((u) => u.id))
      const next = new Set([...prev].filter((id) => ids.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [usuarios])

  const onChange =
    (name: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.value
      setForm((f) => ({ ...f, [name]: name === 'rol' ? (v as RolApi) : v }))
    }

  const limpiarTexto = (s: string) => s.replace(/\u200B/g, '').trim()

  useEffect(() => {
    if (!showCreateModal) return

    const cedula = limpiarTexto(form.cedula)
    const email = limpiarTexto(form.email).toLowerCase()

    if (!cedula && !email) {
      setValidacion({ checking: false, cedulaExists: false, emailExists: false, emailRol: null, emailId: null, emailHint: null })
      return
    }

    const timer = window.setTimeout(() => {
      setValidacion((prev) => ({ ...prev, checking: true }))
      void (async () => {
        try {
          const result = await validateUsuarioAdmin({ cedula, email })
          setValidacion({
            checking: false,
            cedulaExists: Boolean(result.cedulaExists),
            emailExists: Boolean(result.emailExists),
            emailRol: result.emailRol ?? null,
            emailId: result.emailId ?? null,
            emailHint: result.emailHint ?? null,
          })
        } catch {
          setValidacion((prev) => ({ ...prev, checking: false }))
        }
      })()
    }, 350)

    return () => {
      window.clearTimeout(timer)
    }
  }, [form.cedula, form.email, showCreateModal])

  const handleCrearUsuario = (e: FormEvent) => {
    e.preventDefault()
    void (async () => {
      setErrorForm(null)
      setMensajeExito(null)

      const nombres = limpiarTexto(form.nombres)
      const apellidos = limpiarTexto(form.apellidos)
      const cedula = limpiarTexto(form.cedula)
      const email = limpiarTexto(form.email)

      if (!nombres || !apellidos || !cedula || !email) {
        setErrorForm('Completa nombres, apellidos, cédula y correo.')
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrorForm('El correo electrónico no es válido.')
        return
      }
      if (validacion.cedulaExists || validacion.emailExists) {
        const partes: string[] = []
        if (validacion.cedulaExists) partes.push('la cédula ya está en el sistema')
        if (validacion.emailExists) {
          const rolTxt = validacion.emailRol ? ` (${validacion.emailRol})` : ''
          partes.push(`el correo ya está registrado${rolTxt}`)
        }
        setErrorForm(`No se puede crear: ${partes.join(' y ')}. Usa otros datos o elimina el usuario existente en la lista.`)
        return
      }
      setGuardando(true)
      try {
        const payload = {
          nombres,
          apellidos,
          cedula,
          email,
          rol: rolModulo ?? form.rol,
        }
        const res = await createUsuarioAdmin(payload)
        setErrorForm(null)
        setAdvertenciaCorreo(null)
        setDetalleCorreo(null)
        setMensajeExito(
          res.emailSent === true
            ? 'Usuario creado correctamente. Se envió el correo de bienvenida.'
            : 'Usuario creado correctamente.',
        )
        if (res.emailSent === false) {
          setAdvertenciaCorreo(
            res.emailWarning ??
              'No se envió el correo de bienvenida. Comunica al usuario las credenciales por otro medio.',
          )
          if (res.emailDetail) setDetalleCorreo(res.emailDetail)
        }
        setForm({ ...formVacio, rol: rolModulo ?? formVacio.rol })
        setShowCreateModal(false)
        await cargar(busqueda)
      } catch (err) {
        setErrorForm(err instanceof Error ? err.message : 'No se pudo crear el usuario. Intenta de nuevo.')
      } finally {
        setGuardando(false)
      }
    })()
  }

  const puedeEliminar = (u: UsuarioListaItem) => u.rol !== 'admin'

  const cambiarEstadoAcceso = (u: UsuarioListaItem, estado: EstadoAcceso) => {
    const actual = resolveEstadoAcceso(u)
    if (estado === actual || u.rol === 'admin') return
    void (async () => {
      setCambiandoEstadoId(u.id)
      setErrorLista(null)
      try {
        await updateUsuarioEstadoAcceso(u.id, estado)
        setUsuarios((prev) =>
          prev.map((item) =>
            item.id === u.id
              ? { ...item, estado_acceso: estado, activo: estado === 'activo' }
              : item,
          ),
        )
        setMensajeExito(`Estado actualizado a ${ETIQUETA_ESTADO_ACCESO[estado]}.`)
      } catch (e) {
        setErrorLista(e instanceof Error ? e.message : 'No se pudo cambiar el estado')
      } finally {
        setCambiandoEstadoId(null)
      }
    })()
  }

  useEffect(() => {
    setFiltroEstado('todos')
  }, [vistaActiva])

  const conteosEstado = useMemo(() => {
    const counts: Record<FiltroEstado, number> = {
      todos: usuarios.length,
      activo: 0,
      suspendido: 0,
      cancelado: 0,
      finalizado: 0,
    }
    for (const u of usuarios) {
      counts[resolveEstadoAcceso(u)] += 1
    }
    return counts
  }, [usuarios])

  const usuariosFiltrados = useMemo(() => {
    if (filtroEstado === 'todos') return usuarios
    return usuarios.filter((u) => resolveEstadoAcceso(u) === filtroEstado)
  }, [usuarios, filtroEstado])

  const filasEliminables = usuariosFiltrados.filter(puedeEliminar)
  const todosMarcados =
    filasEliminables.length > 0 && filasEliminables.every((u) => seleccionados.has(u.id))
  const algunoMarcado = seleccionados.size > 0

  const toggleSeleccion = (id: number) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSeleccionTodos = () => {
    if (todosMarcados) {
      setSeleccionados(new Set())
      return
    }
    setSeleccionados(new Set(filasEliminables.map((u) => u.id)))
  }

  const solicitarEliminar = (items: UsuarioListaItem[]) => {
    const validos = items.filter(puedeEliminar)
    if (validos.length === 0) return
    setConfirmEliminar(validos)
  }

  const ejecutarEliminar = () => {
    if (!confirmEliminar?.length) return
    void (async () => {
      setEliminandoLote(true)
      setErrorLista(null)
      setMensajeExito(null)
      const ids = new Set(confirmEliminar.map((u) => u.id))
      const total = confirmEliminar.length
      let ok = 0
      let ultimoError = ''
      for (const u of confirmEliminar) {
        setEliminandoId(u.id)
        try {
          await deleteUsuarioAdmin(u.id)
          ok += 1
        } catch (e) {
          ultimoError = e instanceof Error ? e.message : 'No se pudo eliminar'
        }
      }
      setEliminandoId(null)
      setEliminandoLote(false)
      setConfirmEliminar(null)
      setSeleccionados((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.delete(id)
        return next
      })
      if (ok > 0) {
        setMensajeExito(ok === 1 ? 'Usuario eliminado.' : `${ok} usuarios eliminados.`)
        await cargar(busqueda)
      }
      if (ultimoError) {
        setErrorLista(
          ok > 0
            ? `${ultimoError} (${ok} de ${total} eliminados antes del error).`
            : ultimoError,
        )
      }
    })()
  }

  const checkboxCol: Column<UsuarioListaItem> = {
    header: '',
    headerClassName: 'w-11',
    className: 'w-11',
    renderHeader: () => (
      <input
        type="checkbox"
        aria-label="Seleccionar todos"
        checked={todosMarcados}
        disabled={filasEliminables.length === 0}
        onChange={toggleSeleccionTodos}
        className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
      />
    ),
    render: (u) =>
      puedeEliminar(u) ? (
        <input
          type="checkbox"
          aria-label={`Seleccionar ${u.nombre_completo || u.email}`}
          checked={seleccionados.has(u.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleSeleccion(u.id)}
          className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
        />
      ) : null,
  }

  const accionesCol: Column<UsuarioListaItem> = {
    header: '',
    headerClassName: 'w-12 text-right',
    className: 'w-12 text-right',
    render: (u) =>
      puedeEliminar(u) ? (
        <Button
          variant="ghost"
          size="sm"
          className="!px-2 text-red-700 hover:bg-red-50"
          disabled={eliminandoId === u.id || eliminandoLote}
          aria-label={`Eliminar ${u.nombre_completo || u.email}`}
          onClick={(e) => {
            e.stopPropagation()
            solicitarEliminar([u])
          }}
        >
          <Trash2 size={16} />
        </Button>
      ) : null,
  }

  const columns: Column<UsuarioListaItem>[] = [
    checkboxCol,
    { header: 'ID', render: (u) => u.id },
    { header: 'Nombre', className: 'min-w-[180px]', render: (u) => u.nombre_completo ?? '—' },
    { header: 'Cédula', render: (u) => u.documento ?? '—' },
    { header: 'Correo', className: 'min-w-[200px]', render: (u) => u.email },
    ...(!esModuloRol ? [{ header: 'Rol', render: (u: UsuarioListaItem) => rolEtiqueta(u.rol) }] : []),
    {
      header: 'Curso(s) asignado(s)',
      className: 'min-w-[220px]',
      render: (u) => u.cursos_asignados || (u.rol === 'admin' || u.rol === 'staff' ? 'No aplica' : 'Sin asignar'),
    },
    ...(esModuloRol
      ? [
          {
            header: 'Estado',
            className: 'min-w-[140px]',
            render: (u: UsuarioListaItem) => {
              const estado = resolveEstadoAcceso(u)
              if (u.rol === 'admin') {
                return <span className="font-medium text-emerald-700">{ETIQUETA_ESTADO_ACCESO.activo}</span>
              }
              return (
                <select
                  value={estado}
                  disabled={cambiandoEstadoId === u.id}
                  aria-label={`Estado de ${u.nombre_completo || u.email}`}
                  className={cn(
                    'h-8 w-full min-w-[8.5rem] rounded-md border px-2 text-xs font-semibold outline-none transition-colors focus:ring-2 focus:ring-[var(--accent)]/30 disabled:opacity-60',
                    claseSelectEstadoAcceso(estado),
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => cambiarEstadoAcceso(u, e.target.value as EstadoAcceso)}
                >
                  {ESTADOS_ACCESO.map((opt) => (
                    <option key={opt} value={opt}>
                      {ETIQUETA_ESTADO_ACCESO[opt]}
                    </option>
                  ))}
                </select>
              )
            },
          },
        ]
      : []),
    accionesCol,
  ]

  return (
    <div className="flex flex-col gap-5">
      {mensajeExito ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {mensajeExito}
        </div>
      ) : null}

      {advertenciaCorreo ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold text-amber-900">Advertencia · Correo</p>
          <p className="mt-1 leading-relaxed text-amber-950/90">{advertenciaCorreo}</p>
          {detalleCorreo ? (
            <details className="mt-2 text-xs text-amber-900/80">
              <summary className="cursor-pointer font-medium text-amber-900">Detalle técnico</summary>
              <p className="mt-1 whitespace-pre-wrap break-words font-mono leading-snug">{detalleCorreo}</p>
            </details>
          ) : null}
        </div>
      ) : null}

      <Card
        className={cn(
          backofficePanelCardClass,
          'bg-gradient-to-b from-[var(--surface)] to-[var(--panel-2)] p-4 sm:p-5',
        )}
      >
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)]/70 p-2">
            <div className="relative w-full sm:w-[24rem] lg:w-[28rem]">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--muted)]">
                <Search size={16} />
              </div>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, cédula o correo"
                className={cn(
                  'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none transition-colors focus:border-[var(--accent)]',
                  backofficeAmberInsetHairline,
                )}
              />
            </div>
            {esModuloRol ? (
              <div
                className="flex w-full flex-wrap items-center gap-0.5 sm:w-auto sm:flex-1 sm:justify-center"
                role="group"
                aria-label="Filtrar por estado"
              >
                {FILTROS_ESTADO.map(({ id, label, icon }) => (
                  <SidebarFilterChip
                    key={id}
                    active={filtroEstado === id}
                    label={label}
                    icon={icon}
                    count={conteosEstado[id]}
                    onClick={() => setFiltroEstado(id)}
                  />
                ))}
              </div>
            ) : null}
            <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              {esVistaNuevoRegistro ? (
                <>
                  {(
                    [
                      { vista: 'todos' as const, label: 'Todos los usuarios' },
                      { vista: 'admin' as const, label: 'Administradores' },
                      { vista: 'docente' as const, label: 'Docentes' },
                      { vista: 'estudiante' as const, label: 'Estudiantes' },
                    ] as const
                  ).map(({ vista, label }) => (
                    <Button
                      key={vista}
                      size="sm"
                      variant={vistaActiva === vista ? 'primary' : 'secondary'}
                      onClick={() => cambiarVista(vista)}
                    >
                      {label}
                    </Button>
                  ))}
                </>
              ) : null}
              <Button size="sm" variant={esModuloRol ? 'primary' : 'secondary'} onClick={abrirModalCrear}>
                {esModuloRol ? 'Crear nuevo' : 'Nuevo usuario'}
              </Button>
            </div>
          </div>
        </div>

        {errorLista ? (
          <p className="mb-3 text-sm text-red-700">{errorLista}</p>
        ) : null}
        {algunoMarcado ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5">
            <p className="text-sm font-medium text-amber-950">
              {seleccionados.size} seleccionado{seleccionados.size === 1 ? '' : 's'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setSeleccionados(new Set())}>
                Desmarcar
              </Button>
              <Button
                size="sm"
                variant="danger"
                leftIcon={<Trash2 size={15} />}
                disabled={eliminandoLote}
                onClick={() => {
                  const items = usuariosFiltrados.filter((u) => seleccionados.has(u.id))
                  solicitarEliminar(items)
                }}
              >
                Eliminar seleccionados
              </Button>
            </div>
          </div>
        ) : null}
        {cargando ? (
          <p className="text-sm text-[var(--muted)]">Cargando…</p>
        ) : usuariosFiltrados.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            {filtroEstado === 'todos'
              ? 'No hay usuarios en esta lista.'
              : `No hay usuarios con estado «${ETIQUETA_ESTADO_ACCESO[filtroEstado]}».`}
          </p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={usuariosFiltrados}
              getRowId={(u) => String(u.id)}
              onRowClick={esModuloRol ? (u) => abrirPanelMiembro(u) : undefined}
              className={esModuloRol ? 'mt-3' : 'mt-3'}
            />
          </>
        )}
      </Card>

      <Modal
        open={showCreateModal}
        onClose={() => !guardando && setShowCreateModal(false)}
        title={
          esModuloEstudiantes
            ? 'Nuevo estudiante'
            : esModuloDocentes
              ? 'Nuevo docente'
              : esModuloStaff
                ? 'Nuevo staff'
                : 'Nuevo usuario'
        }
        compact
      >
        <form onSubmit={handleCrearUsuario} className="flex flex-col gap-3">
          {errorForm ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800 whitespace-pre-wrap leading-relaxed">
              {errorForm}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label className="block sm:col-span-1">
              <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Nombres
              </span>
              <input
                name="nombres"
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                value={form.nombres}
                onChange={onChange('nombres')}
                autoComplete="given-name"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Apellidos
              </span>
              <input
                name="apellidos"
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                value={form.apellidos}
                onChange={onChange('apellidos')}
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Cédula
            </span>
            <input
              name="cedula"
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              value={form.cedula}
              onChange={onChange('cedula')}
              inputMode="numeric"
              autoComplete="off"
            />
            {validacion.cedulaExists ? (
              <span className="mt-1 block text-xs text-red-700">Esta cédula ya existe en el sistema.</span>
            ) : null}
            {!validacion.cedulaExists && !validacion.emailExists ? (
              <span className="mt-1 block text-[11px] text-[var(--muted)]">
                El usuario y la contraseña inicial serán la cédula. Podrá cambiarla después desde su perfil.
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Correo
            </span>
            <input
              name="email"
              type="email"
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              value={form.email}
              onChange={onChange('email')}
              autoComplete="email"
            />
            {validacion.emailExists ? (
              <span className="mt-1 block text-xs text-red-700">
                {validacion.emailHint ||
                  `Este correo ya está registrado${validacion.emailRol ? ` como ${rolEtiqueta(validacion.emailRol)}` : ''}.`}
              </span>
            ) : null}
          </label>

          {!esModuloRol ? (
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Rol</span>
              <select
                name="rol"
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                value={form.rol}
                onChange={onChange('rol')}
              >
                <option value="estudiante">Estudiante</option>
                <option value="docente">Docente</option>
                <option value="staff">Staff</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-2.5">
            {validacion.checking ? (
              <p className="mr-auto text-xs text-[var(--muted)]">Validando duplicados...</p>
            ) : null}
            <Button variant="secondary" type="button" size="sm" disabled={guardando} onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              size="sm"
              disabled={guardando || validacion.checking || validacion.cedulaExists || validacion.emailExists}
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmEliminar?.length)}
        onClose={() => !eliminandoLote && setConfirmEliminar(null)}
        title={confirmEliminar?.length === 1 ? 'Eliminar usuario' : 'Eliminar usuarios'}
        compact
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={eliminandoLote}
              onClick={() => setConfirmEliminar(null)}
            >
              Cancelar
            </Button>
            <Button variant="danger" size="sm" disabled={eliminandoLote} onClick={() => ejecutarEliminar()}>
              {eliminandoLote ? 'Eliminando…' : 'Eliminar definitivamente'}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-sm text-[var(--text)]">
          <p>Esta acción no se puede deshacer. Se borrarán el acceso y los datos asociados.</p>
          {confirmEliminar && confirmEliminar.length === 1 ? (
            <p className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 font-medium">
              {confirmEliminar[0].nombre_completo || confirmEliminar[0].email}
              <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">
                {confirmEliminar[0].email}
                {confirmEliminar[0].documento ? ` · Cédula ${confirmEliminar[0].documento}` : ''}
              </span>
            </p>
          ) : null}
          {confirmEliminar && confirmEliminar.length > 1 ? (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-xs">
              {confirmEliminar.map((u) => (
                <li key={u.id} className="py-0.5">
                  {u.nombre_completo || u.email} ({u.email})
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
