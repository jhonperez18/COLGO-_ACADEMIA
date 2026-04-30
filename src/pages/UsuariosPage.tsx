import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { Modal } from '../components/common/Modal'
import { Card } from '../components/common/Card'
import { backofficeAmberInsetHairline, backofficePanelCardClass } from '../components/layout/backofficeVisual'
import { cn } from '../utils/cn'
import { DataTable, type Column } from '../components/common/Table'
import {
  createUsuarioAdmin,
  deleteUsuarioAdmin,
  listLogsAdmin,
  listUsuariosAdmin,
  getUsuariosAnomaliasSeguridad,
  validateUsuarioAdmin,
  type RolApi,
  type SistemaLog,
  type UsuarioListaItem,
} from '../services/apiClient'

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
  const vistaInicial: ViewFiltro =
    vistaQuery === 'admin' || vistaQuery === 'docente' || vistaQuery === 'estudiante' || vistaQuery === 'staff'
      ? vistaQuery
      : location.pathname.endsWith('/docentes')
        ? 'docente'
        : location.pathname.endsWith('/estudiantes-gestion') || location.pathname.endsWith('/estudiantes')
          ? 'estudiante'
          : location.pathname.endsWith('/staff')
            ? 'staff'
          : 'todos'
  const [usuarios, setUsuarios] = useState<UsuarioListaItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorLista, setErrorLista] = useState<string | null>(null)
  const [filtroRol, setFiltroRol] = useState<'todos' | RolApi>('todos')
  const [vistaActiva, setVistaActiva] = useState<ViewFiltro>(vistaInicial)
  const [busqueda, setBusqueda] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState<FormState>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  /** Solo advertencia (correo no enviado); nunca bloquea el alta exitosa */
  const [advertenciaCorreo, setAdvertenciaCorreo] = useState<string | null>(null)
  const [detalleCorreo, setDetalleCorreo] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)
  const [logs, setLogs] = useState<SistemaLog[]>([])
  const [anomalias, setAnomalias] = useState<Array<{ usuario_id: number | null; total_fallos: number }>>([])
  const [validacion, setValidacion] = useState<{
    checking: boolean
    cedulaExists: boolean
    emailExists: boolean
  }>({ checking: false, cedulaExists: false, emailExists: false })

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

  const panelBase = location.pathname.startsWith('/staff') ? '/staff' : '/admin'
  const origenLista = esVistaNuevoRegistro ? 'nuevo' : 'rol'
  const abrirPanelMiembro = (u: UsuarioListaItem) => {
    const ret = encodeURIComponent(`${location.pathname}${location.search}`)
    navigate(`${panelBase}/miembros/${u.id}?return=${ret}&origen=${origenLista}`)
  }

  const cargar = useCallback(async () => {
    setCargando(true)
    setErrorLista(null)
    try {
      const [data, logsData, anomaliasData] = await Promise.all([
        listUsuariosAdmin(),
        listLogsAdmin(),
        getUsuariosAnomaliasSeguridad(),
      ])
      setUsuarios(Array.isArray(data) ? data : [])
      setLogs(Array.isArray(logsData) ? logsData : [])
      setAnomalias(Array.isArray(anomaliasData) ? anomaliasData : [])
    } catch (e) {
      setErrorLista(e instanceof Error ? e.message : 'No se pudo cargar la lista')
      setUsuarios([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

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
      setValidacion({ checking: false, cedulaExists: false, emailExists: false })
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
        setErrorForm('Corrige duplicados antes de guardar (cédula/correo).')
        return
      }
      setGuardando(true)
      try {
        const payload = {
          nombres,
          apellidos,
          cedula,
          email,
          rol: form.rol,
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
        setForm(formVacio)
        setShowCreateModal(false)
        await cargar()
      } catch (err) {
        setErrorForm(err instanceof Error ? err.message : 'Error al crear usuario')
      } finally {
        setGuardando(false)
      }
    })()
  }

  const columns: Column<UsuarioListaItem>[] = [
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
            header: 'Confianza',
            render: (u: UsuarioListaItem) => (u.rol === 'staff' ? (u.nivel_confianza || 'baja').toUpperCase() : '—'),
          },
          {
            header: 'Estado',
            render: (u: UsuarioListaItem) => (u.activo ? 'Activo' : 'Bloqueado'),
          },
        ]
      : [
          {
            header: 'Acciones',
            className: 'min-w-[200px]',
            render: (u: UsuarioListaItem) => (
              <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto sm:flex-row-reverse">
                <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                  Solo alta
                </span>
                {u.rol !== 'admin' ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={eliminandoId === u.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!window.confirm(`¿Eliminar definitivamente a ${u.nombre_completo || u.email}?`)) return
                      void (async () => {
                        setEliminandoId(u.id)
                        setErrorLista(null)
                        setMensajeExito(null)
                        try {
                          await deleteUsuarioAdmin(u.id)
                          setMensajeExito('Usuario eliminado.')
                          await cargar()
                        } catch (e) {
                          setErrorLista(e instanceof Error ? e.message : 'No se pudo eliminar')
                        } finally {
                          setEliminandoId(null)
                        }
                      })()
                    }}
                  >
                    {eliminandoId === u.id ? '…' : 'Eliminar'}
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]
      ),
  ]

  const usuariosFiltrados = usuarios.filter((u) => {
    const filtro = vistaActiva === 'staff' ? 'staff' : vistaActiva
    if (filtro !== 'todos' && u.rol !== filtro) return false
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      String(u.nombre_completo ?? '').toLowerCase().includes(q) ||
      String(u.documento ?? '').toLowerCase().includes(q) ||
      String(u.email ?? '').toLowerCase().includes(q)
    )
  })

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
          {!esModuloRol ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)]/70 p-2">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, cédula o correo"
                className={cn(
                  'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition-colors focus:border-[var(--accent)] sm:w-[24rem] lg:w-[28rem]',
                  backofficeAmberInsetHairline,
                )}
              />
              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value as 'todos' | RolApi)}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition-colors focus:border-[var(--accent)] sm:w-[12.5rem]"
              >
                <option value="todos">Todos los roles</option>
                <option value="admin">Administrador</option>
                <option value="docente">Docente</option>
                <option value="estudiante">Estudiante</option>
                <option value="staff">Staff</option>
              </select>
              <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                <Button size="sm" variant={vistaActiva === 'todos' ? 'primary' : 'secondary'} onClick={() => cambiarVista('todos')}>
                  Todos los usuarios
                </Button>
                <Button size="sm" variant={vistaActiva === 'admin' ? 'primary' : 'secondary'} onClick={() => cambiarVista('admin')}>
                  Administradores
                </Button>
                <Button size="sm" variant="secondary" onClick={() => cambiarVista('docente')}>
                  Docentes
                </Button>
                <Button size="sm" variant="secondary" onClick={() => cambiarVista('estudiante')}>
                  Estudiantes
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setErrorForm(null)
                    setMensajeExito(null)
                    setAdvertenciaCorreo(null)
                    setDetalleCorreo(null)
                    setValidacion({ checking: false, cedulaExists: false, emailExists: false })
                    setShowCreateModal(true)
                  }}
                >
                  Nuevo usuario
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, cédula o correo"
                className={cn(
                  'h-10 justify-self-start rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition-colors focus:border-[var(--accent)]',
                  backofficeAmberInsetHairline,
                  'w-full sm:col-span-3 sm:w-[28rem]',
                )}
              />
            </div>
          )}
        </div>

        {errorLista ? (
          <p className="mb-3 text-sm text-red-700">{errorLista}</p>
        ) : null}
        {cargando ? (
          <p className="text-sm text-[var(--muted)]">Cargando…</p>
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

      {!esModuloRol ? (
        <Card className={backofficePanelCardClass}>
          <div className="mb-3">
            <p className="text-sm font-semibold text-[var(--text)]">Alertas de seguridad</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Usuarios con 3+ intentos fallidos en las últimas 24h.</p>
          </div>
          <div className="max-h-40 overflow-auto rounded-xl border border-[var(--border)]">
            {anomalias.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--muted)]">Sin anomalías detectadas.</p>
            ) : (
              anomalias.map((a, idx) => (
                <div key={`${a.usuario_id ?? 'null'}-${idx}`} className="border-b border-[var(--border)] px-3 py-2 text-sm last:border-b-0">
                  Usuario ID: {a.usuario_id ?? 'Desconocido'} · Intentos fallidos: {a.total_fallos}
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      {!esModuloRol ? (
        <Card className={backofficePanelCardClass}>
          <div className="mb-3">
            <p className="text-sm font-semibold text-[var(--text)]">Logs del sistema</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Logs recientes del sistema (auditoría).</p>
          </div>
          <div className="max-h-64 overflow-auto rounded-xl border border-[var(--border)]">
            {logs.length === 0 ? (
              <p className="px-3 py-4 text-sm text-[var(--muted)]">Sin eventos recientes.</p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="border-b border-[var(--border)] px-3 py-2 text-sm last:border-b-0">
                  <p className="font-medium text-[var(--text)]">{l.accion}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {l.usuario_email || 'sistema'} · {l.tabla_afectada || 'general'} · {new Date(l.fecha).toLocaleString('es-CO')}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      <Modal
        open={showCreateModal}
        onClose={() => !guardando && setShowCreateModal(false)}
        title="Nuevo usuario"
        compact
      >
        <form onSubmit={handleCrearUsuario} className="flex flex-col gap-3">
          {errorForm ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800">{errorForm}</div>
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
              <span className="mt-1 block text-xs text-red-700">Este correo ya está registrado.</span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Rol</span>
            <select
              name="rol"
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              value={form.rol}
              onChange={onChange('rol')}
              disabled={esModuloDocentes || esModuloEstudiantes}
            >
              {esModuloDocentes ? (
                <option value="docente">Docente</option>
              ) : esModuloEstudiantes ? (
                <option value="estudiante">Estudiante</option>
              ) : (
                <>
                  <option value="estudiante">Estudiante</option>
                  <option value="docente">Docente</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Administrador</option>
                </>
              )}
            </select>
          </label>

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
    </div>
  )
}
