import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Toast } from '../components/common/Toast'
import {
  createTeacherClase,
  getTeacherCursoEstudiantes,
  getTeacherCursos,
  getTeacherPerfil,
  registrarNota,
  subscribeRealtime,
  updateTeacherPerfil,
} from '../services/apiClient'
import { BookOpen, Camera, ChevronDown, FolderOpen, UserCircle2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { withOptimisticUpdate } from '../utils/optimistic'
import { backofficePanelCardClass } from '../components/layout/backofficeVisual'
import { cn } from '../utils/cn'
import { buildProfilePhotoDataUrl } from '../utils/profilePhotoDataUrl'

type TeacherCourse = {
  id: number
  nombre: string
  codigo?: string
  descripcion?: string
  estudiantes_inscritos?: number
}

type TeacherStudent = {
  id: number
  nombre: string
  apellido: string
  email?: string
  calificacion_final?: number | null
}

export function DocenteDashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [saludo, setSaludo] = useState('Panel docente')
  const [cursos, setCursos] = useState<TeacherCourse[]>([])
  const [nCursos, setNCursos] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [cursoActivoId, setCursoActivoId] = useState<number | null>(null)
  const [estudiantes, setEstudiantes] = useState<TeacherStudent[]>([])
  const [cargandoEstudiantes, setCargandoEstudiantes] = useState(false)
  const [notaRapida, setNotaRapida] = useState<Record<number, string>>({})
  const [guardandoNotaId, setGuardandoNotaId] = useState<number | null>(null)
  const [notasLocales, setNotasLocales] = useState<Record<number, number>>({})
  const [dropOn, setDropOn] = useState(false)
  const [materiales, setMateriales] = useState<File[]>([])
  const [menuCursosAbierto, setMenuCursosAbierto] = useState(false)
  const [creandoClase, setCreandoClase] = useState(false)
  const [toast, setToast] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileOk, setProfileOk] = useState<string | null>(null)
  const [perfilForm, setPerfilForm] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    telefono: '',
    especialidad: '',
  })
  const [fotoPerfil, setFotoPerfil] = useState('')
  const fotoInputRef = useRef<HTMLInputElement | null>(null)
  const [clasesRecientes, setClasesRecientes] = useState<
    Array<{ id: string; cursoId: number; titulo: string; fecha: string; hora_inicio: string; tipo: 'virtual' | 'presencial' }>
  >([])
  const [nuevaClase, setNuevaClase] = useState({
    titulo: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    tipo: 'virtual' as 'virtual' | 'presencial',
    enlace_virtual: '',
    ubicacion: '',
  })
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)
  const menuCursosRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const perfil = (await getTeacherPerfil()) as Record<string, unknown>
        const cursosApi = (await getTeacherCursos()) as unknown
        if (cancelled) return
        if (perfil?.nombre) setSaludo(`Hola, ${String(perfil.nombre)}`)
        setPerfilForm({
          nombre: String(perfil?.nombre || ''),
          apellido: String(perfil?.apellido || ''),
          documento: String(perfil?.documento || ''),
          telefono: String(perfil?.telefono || ''),
          especialidad: String(perfil?.especialidad || ''),
        })
        setFotoPerfil(typeof perfil.foto_url === 'string' ? perfil.foto_url : '')
        const cursosNormalizados = Array.isArray(cursosApi) ? (cursosApi as TeacherCourse[]) : []
        setCursos(cursosNormalizados)
        setNCursos(cursosNormalizados.length)
        if (cursosNormalizados.length > 0) setCursoActivoId(cursosNormalizados[0].id)
      } catch {
        if (!cancelled) {
          setError('No se pudo conectar con el API. Ejecuta el backend (npm run server) en el puerto 3001.')
        }
      } finally {
        if (!cancelled) setCargando(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!cursoActivoId) {
      setEstudiantes([])
      return
    }
    let cancelled = false
    setCargandoEstudiantes(true)
    void (async () => {
      try {
        const data = (await getTeacherCursoEstudiantes(cursoActivoId)) as unknown
        if (cancelled) return
        setEstudiantes(Array.isArray(data) ? (data as TeacherStudent[]) : [])
      } catch {
        if (!cancelled) setEstudiantes([])
      } finally {
        if (!cancelled) setCargandoEstudiantes(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cursoActivoId])

  useEffect(() => {
    const sub = subscribeRealtime((type, payload) => {
      const payloadCursoId = Number(payload?.cursoId ?? 0)
      if (!payloadCursoId || !cursoActivoId || payloadCursoId !== cursoActivoId) return
      const enVistaRelacionada =
        location.pathname.endsWith('/estudiantes') || location.pathname.endsWith('/notas')
      if (!enVistaRelacionada) return
      if (type !== 'grade_updated' && type !== 'final_grade_updated') return

      void (async () => {
        try {
          const data = (await getTeacherCursoEstudiantes(cursoActivoId)) as unknown
          setEstudiantes(Array.isArray(data) ? (data as TeacherStudent[]) : [])
        } catch {
          // ignore realtime refresh failure
        }
      })()
    })
    return () => sub?.close()
  }, [cursoActivoId, location.pathname])

  useEffect(() => {
    setMateriales([])
  }, [cursoActivoId])

  useEffect(() => {
    if (!menuCursosAbierto) return
    const cerrar = (e: MouseEvent) => {
      if (menuCursosRef.current && !menuCursosRef.current.contains(e.target as Node)) {
        setMenuCursosAbierto(false)
      }
    }
    window.addEventListener('mousedown', cerrar)
    return () => window.removeEventListener('mousedown', cerrar)
  }, [menuCursosAbierto])

  const irAMaterialCurso = (cursoId: number) => {
    setCursoActivoId(cursoId)
    setMenuCursosAbierto(false)
    navigate('/docente/material')
  }

  const guardarPerfil = async () => {
    setProfileError(null)
    setProfileOk(null)
    if (!perfilForm.nombre.trim() || !perfilForm.apellido.trim()) {
      setProfileError('Completa al menos nombre y apellido.')
      return
    }
    setSavingProfile(true)
    try {
      await updateTeacherPerfil({
        nombre: perfilForm.nombre.trim(),
        apellido: perfilForm.apellido.trim(),
        documento: perfilForm.documento.trim(),
        telefono: perfilForm.telefono.trim(),
        especialidad: perfilForm.especialidad.trim(),
        foto_url: fotoPerfil || null,
      })
      setSaludo(`Hola, ${perfilForm.nombre.trim()}`)
      setProfileOk('Perfil actualizado correctamente.')
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'No se pudo actualizar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const seccion = useMemo<'dashboard' | 'estudiantes' | 'notas' | 'material' | 'perfil'>(() => {
    if (location.pathname.endsWith('/estudiantes')) return 'estudiantes'
    if (location.pathname.endsWith('/notas')) return 'notas'
    if (location.pathname.endsWith('/material')) return 'material'
    if (location.pathname.endsWith('/perfil')) return 'perfil'
    return 'dashboard'
  }, [location.pathname])

  const cursoActivo = cursos.find((c) => c.id === cursoActivoId) ?? null

  const onDropFiles = (files: FileList | null) => {
    if (!files?.length) return
    setMateriales((prev) => [...files].concat(prev))
  }

  const guardarNotaRapida = async (studentId: number) => {
    if (!cursoActivoId) return
    const value = Number(notaRapida[studentId] ?? '')
    if (!Number.isFinite(value) || value < 0 || value > 5) {
      setError('La nota debe estar entre 0 y 5.')
      return
    }
    setError(null)
    setGuardandoNotaId(studentId)
    try {
      await registrarNota(cursoActivoId, studentId, 1, value)
      setNotasLocales((prev) => ({ ...prev, [studentId]: value }))
      setNotaRapida((prev) => ({ ...prev, [studentId]: '' }))
      setToast('Nota registrada')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la nota')
    } finally {
      setGuardandoNotaId(null)
    }
  }

  const crearClaseRapida = async () => {
    if (!cursoActivoId) return
    if (!nuevaClase.titulo || !nuevaClase.fecha || !nuevaClase.hora_inicio || !nuevaClase.hora_fin) {
      setError('Completa título, fecha y horas de la clase.')
      return
    }
    if (nuevaClase.tipo === 'virtual' && !nuevaClase.enlace_virtual.trim()) {
      setError('Para clase virtual debes ingresar un enlace.')
      return
    }
    if (nuevaClase.tipo === 'presencial' && !nuevaClase.ubicacion.trim()) {
      setError('Para clase presencial debes ingresar una ubicación.')
      return
    }

    setError(null)
    setCreandoClase(true)
    const optimisticClass = {
      id: `tmp-${Date.now()}`,
      cursoId: cursoActivoId,
      titulo: nuevaClase.titulo,
      fecha: nuevaClase.fecha,
      hora_inicio: nuevaClase.hora_inicio,
      tipo: nuevaClase.tipo,
    }
    try {
      await withOptimisticUpdate({
        applyOptimistic: () => {
          const snapshot = [...clasesRecientes]
          setClasesRecientes((prev) => [optimisticClass, ...prev].slice(0, 6))
          setToast('Clase programándose...')
          return () => setClasesRecientes(snapshot)
        },
        request: () =>
          createTeacherClase(cursoActivoId, {
            titulo: nuevaClase.titulo,
            fecha: nuevaClase.fecha,
            hora_inicio: nuevaClase.hora_inicio,
            hora_fin: nuevaClase.hora_fin,
            tipo: nuevaClase.tipo,
            enlace_virtual: nuevaClase.tipo === 'virtual' ? nuevaClase.enlace_virtual : undefined,
            ubicacion: nuevaClase.tipo === 'presencial' ? nuevaClase.ubicacion : undefined,
          }),
        onSuccess: () => setToast('Clase programada'),
      })
      setNuevaClase({
        titulo: '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        tipo: 'virtual',
        enlace_virtual: '',
        ubicacion: '',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la clase')
    } finally {
      setCreandoClase(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className={cn(backofficePanelCardClass, 'flex items-center justify-between')}>
        <div>
          <p className="text-base font-semibold text-[var(--text)]">{saludo}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Cursos asignados: {nCursos}</p>
        </div>
      </Card>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {seccion === 'dashboard' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,320px)]">
          <Card className={backofficePanelCardClass}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Mis cursos</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">Listado de asignaturas a tu cargo.</p>
              </div>
              <div ref={menuCursosRef} className="relative shrink-0">
                <Button
                  type="button"
                  className="min-w-[200px] justify-between gap-2 sm:min-w-[240px]"
                  leftIcon={<BookOpen size={18} />}
                  rightIcon={<ChevronDown size={18} className={menuCursosAbierto ? 'rotate-180' : ''} />}
                  onClick={() => setMenuCursosAbierto((v) => !v)}
                  disabled={cursos.length === 0}
                >
                  Cursos y material
                </Button>
                {menuCursosAbierto && cursos.length > 0 ? (
                  <div
                    className="absolute right-0 z-20 mt-1 max-h-72 min-w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg sm:min-w-[280px]"
                    role="menu"
                  >
                    {cursos.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="menuitem"
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-[rgba(15,23,42,0.06)]"
                        onClick={() => irAMaterialCurso(c.id)}
                      >
                        <span className="font-medium text-[var(--text)]">{c.nombre}</span>
                        <span className="text-xs text-[var(--muted)]">
                          {c.codigo || 'Sin código'} · {c.estudiantes_inscritos ?? 0} estudiantes · Cargar material
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {cursos.length === 0 && !cargando ? (
                <p className="text-sm text-[var(--muted)]">No tienes cursos asignados.</p>
              ) : null}
              {cursos.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)]">{c.nombre}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {c.codigo || 'Sin código'} · Estudiantes: {c.estudiantes_inscritos ?? 0}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => irAMaterialCurso(c.id)}>
                    Material
                  </Button>
                </div>
              ))}
            </div>
          </Card>
          <Card className={backofficePanelCardClass}>
            <p className="text-sm font-semibold text-[var(--text)]">Accesos</p>
            <div className="mt-3 flex flex-col gap-2">
              <Button size="sm" className="w-full justify-start" onClick={() => navigate('/docente/estudiantes')}>
                Ver estudiantes
              </Button>
              <Button size="sm" className="w-full justify-start" variant="secondary" onClick={() => navigate('/docente/notas')}>
                Editar notas
              </Button>
            </div>
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <p className="text-xs font-semibold text-[var(--muted)]">Programar clase</p>
              <div className="mt-2 space-y-2">
                <input
                  value={nuevaClase.titulo}
                  onChange={(e) => setNuevaClase((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Título"
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={nuevaClase.fecha}
                    onChange={(e) => setNuevaClase((p) => ({ ...p, fecha: e.target.value }))}
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-sm"
                  />
                  <select
                    value={nuevaClase.tipo}
                    onChange={(e) => setNuevaClase((p) => ({ ...p, tipo: e.target.value as 'virtual' | 'presencial' }))}
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-sm"
                  >
                    <option value="virtual">Virtual</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={nuevaClase.hora_inicio}
                    onChange={(e) => setNuevaClase((p) => ({ ...p, hora_inicio: e.target.value }))}
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-sm"
                  />
                  <input
                    type="time"
                    value={nuevaClase.hora_fin}
                    onChange={(e) => setNuevaClase((p) => ({ ...p, hora_fin: e.target.value }))}
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-sm"
                  />
                </div>
                {nuevaClase.tipo === 'virtual' ? (
                  <input
                    value={nuevaClase.enlace_virtual}
                    onChange={(e) => setNuevaClase((p) => ({ ...p, enlace_virtual: e.target.value }))}
                    placeholder="https://meet.google.com/..."
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-sm"
                  />
                ) : (
                  <input
                    value={nuevaClase.ubicacion}
                    onChange={(e) => setNuevaClase((p) => ({ ...p, ubicacion: e.target.value }))}
                    placeholder="Aula o dirección"
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-sm"
                  />
                )}
                <Button size="sm" onClick={() => void crearClaseRapida()} disabled={creandoClase || !cursoActivoId}>
                  {creandoClase ? 'Programando...' : 'Programar clase'}
                </Button>
              </div>
              {clasesRecientes.length > 0 ? (
                <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2">
                  <p className="text-xs font-semibold text-[var(--muted)]">Clases recientes</p>
                  <div className="mt-2 space-y-1">
                    {clasesRecientes.map((cl) => (
                      <p key={cl.id} className="text-xs text-[var(--text)]">
                        {cl.fecha} {cl.hora_inicio} · {cl.titulo} ({cl.tipo})
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      {seccion === 'estudiantes' || seccion === 'notas' ? (
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={cursoActivoId ?? ''}
              onChange={(e) => setCursoActivoId(Number(e.target.value))}
              className="h-10 min-w-[220px] rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm"
            >
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.codigo || 'sin código'})
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--muted)]">
              {cursoActivo ? `Curso activo: ${cursoActivo.nombre}` : 'Selecciona un curso'}
            </p>
          </div>

          {cargandoEstudiantes ? (
            <p className="text-sm text-[var(--muted)]">Cargando estudiantes...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs text-[var(--muted)]">Estudiante</th>
                    <th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs text-[var(--muted)]">Correo</th>
                    <th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs text-[var(--muted)]">Final</th>
                    {seccion === 'notas' ? <th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs text-[var(--muted)]">Nota rápida</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {estudiantes.map((st) => (
                    <tr key={st.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2 text-sm text-[var(--text)]">{st.nombre} {st.apellido}</td>
                      <td className="px-3 py-2 text-sm text-[var(--muted)]">{st.email || '—'}</td>
                      <td className="px-3 py-2 text-sm text-[var(--text)]">{st.calificacion_final ?? '—'}</td>
                      {seccion === 'notas' ? (
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              step={0.1}
                              value={notaRapida[st.id] ?? ''}
                              onChange={(e) => setNotaRapida((prev) => ({ ...prev, [st.id]: e.target.value }))}
                              className="h-9 w-24 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2 text-sm"
                            />
                            <Button
                              size="sm"
                              disabled={guardandoNotaId === st.id}
                              onClick={() => void guardarNotaRapida(st.id)}
                            >
                              {guardandoNotaId === st.id ? '...' : 'Guardar'}
                            </Button>
                          </div>
                          {typeof notasLocales[st.id] === 'number' ? (
                            <p className="mt-1 text-xs text-[var(--muted)]">Última nota enviada: {notasLocales[st.id]}</p>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {seccion === 'material' ? (
        <Card>
          {cursos.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No tienes cursos asignados para subir material.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="docente-curso-material">
                  Curso para el material
                </label>
                <select
                  id="docente-curso-material"
                  value={cursoActivoId ?? ''}
                  onChange={(e) => setCursoActivoId(Number(e.target.value))}
                  className="h-10 min-w-[220px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm sm:max-w-md"
                >
                  {cursos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.codigo || 'sin código'})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">
                Material{cursoActivo ? `: ${cursoActivo.nombre}` : ''}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Arrastra archivos, elige varios a la vez o sube una carpeta completa (Chrome / Edge).
              </p>

              <div
                className={`mt-3 rounded-xl border-2 border-dashed p-6 text-center ${dropOn ? 'border-[var(--accent)] bg-[var(--panel-2)]' : 'border-[var(--border)]'}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDropOn(true)
                }}
                onDragLeave={() => setDropOn(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDropOn(false)
                  onDropFiles(e.dataTransfer.files)
                }}
              >
                <p className="text-sm text-[var(--text)]">Suelta archivos o carpetas aquí</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    Seleccionar archivos (varios)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    leftIcon={<FolderOpen size={16} />}
                    onClick={() => folderInputRef.current?.click()}
                  >
                    Cargar carpeta completa
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onDropFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  {...{ webkitdirectory: '' }}
                  onChange={(e) => {
                    onDropFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </div>

              <div className="mt-3 space-y-2">
                {materiales.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No hay archivos cargados en esta sesión.</p>
                ) : (
                  materiales.map((f, idx) => (
                    <div
                      key={`${f.webkitRelativePath || f.name}-${idx}`}
                      className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm"
                    >
                      {f.webkitRelativePath || f.name} · {(f.size / 1024).toFixed(1)} KB
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </Card>
      ) : null}

      {seccion === 'perfil' ? (
        <Card>
          <p className="text-base font-semibold text-[var(--text)]">Perfil y datos</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Actualiza tus datos personales. La foto y los datos coinciden con la ficha que ve administración (solo lectura en ese panel).
          </p>
          {profileError ? <p className="mt-3 text-sm text-red-700">{profileError}</p> : null}
          {profileOk ? <p className="mt-3 text-sm text-green-700">{profileOk}</p> : null}
          <div className="mt-4 flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="mx-auto flex shrink-0 justify-center sm:mx-0">
              {fotoPerfil ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--panel-2)]">
                  <img
                    src={fotoPerfil}
                    alt=""
                    className="block h-full w-full object-cover object-center"
                  />
                </div>
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-full border border-[var(--border)] bg-[var(--panel-2)]">
                  <UserCircle2 className="h-10 w-10 text-[var(--muted)]" aria-hidden />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
                <Button type="button" size="sm" variant="secondary" onClick={() => setFotoPerfil('')}>
                  Quitar foto
                </Button>
              ) : null}
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  if (!f.type.startsWith('image/')) {
                    setProfileError('El archivo debe ser una imagen.')
                    return
                  }
                  if (f.size > 8 * 1024 * 1024) {
                    setProfileError('El archivo supera 8 MB. Elige una imagen más pequeña.')
                    return
                  }
                  setProfileError(null)
                  void (async () => {
                    try {
                      const dataUrl = await buildProfilePhotoDataUrl(f)
                      setFotoPerfil(dataUrl)
                    } catch (err) {
                      setProfileError(err instanceof Error ? err.message : 'No se pudo procesar la imagen.')
                    }
                  })()
                }}
              />
            </div>
            <p className="text-xs text-[var(--muted)] sm:max-w-xs">JPG, PNG. Se optimiza al guardar para que el admin vea la misma foto.</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
              value={perfilForm.especialidad}
              onChange={(e) => setPerfilForm((p) => ({ ...p, especialidad: e.target.value }))}
              placeholder="Especialidad"
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
