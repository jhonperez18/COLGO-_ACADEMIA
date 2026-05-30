import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Toast } from '../components/common/Toast'
import {
  downloadStudentCertificado,
  getStudentCalendario,
  getStudentCursoNotas,
  getStudentInicio,
  getStudentNotificaciones,
  getStudentPerfil,
  updateStudentPerfil,
  marcarNotificacionLeida,
  subscribeRealtime,
} from '../services/apiClient'
import { loadSessionUser, loadStoredProfilePhoto, PROFILE_PHOTO_UPDATED_EVENT, syncProfilePhoto } from '../state/authSession'
import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, UserCircle2 } from 'lucide-react'
import { withOptimisticUpdate } from '../utils/optimistic'
import { PAIS_COLOMBIA, PAISES_OPCIONES } from '../data/paisesLista'
import { useColombiaMunicipios } from '../hooks/useColombiaMunicipios'
import { backofficePanelCardClass } from '../components/layout/backofficeVisual'
import { cn } from '../utils/cn'
import { buildProfilePhotoDataUrl } from '../utils/profilePhotoDataUrl'

type StudentCourse = {
  id: number
  nombre: string
  codigo?: string
  descripcion?: string
  estado?: string
  calificacion_final?: number | null
  progreso?: number
}

type StudentCertificate = {
  id: number
  numero_certificado?: string
  fecha_emision?: string
  curso_nombre?: string
  descargado?: boolean
}

export function EstudianteDashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [saludo, setSaludo] = useState('Panel estudiante')
  const [nCursos, setNCursos] = useState(0)
  const [cursos, setCursos] = useState<StudentCourse[]>([])
  const [cursoActivoId, setCursoActivoId] = useState<number | null>(null)
  const [notasCurso, setNotasCurso] = useState<Array<{ evaluacion_numero: number; nota: number; descripcion?: string }>>([])
  const [certificados, setCertificados] = useState<StudentCertificate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [calendario, setCalendario] = useState<
    Array<{
      id: number
      titulo: string
      fecha: string
      hora_inicio: string
      tipo: 'virtual' | 'presencial'
      enlace_virtual?: string
      ubicacion?: string
      curso_nombre: string
    }>
  >([])
  const [notificaciones, setNotificaciones] = useState<
    Array<{ id: number; titulo: string; mensaje: string; leida: boolean; fecha_creacion: string }>
  >([])
  const [downloadingCertId, setDownloadingCertId] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileOk, setProfileOk] = useState<string | null>(null)
  const [perfilForm, setPerfilForm] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    tipo_documento: '',
    telefono: '',
    direccion: '',
    pais: '',
    departamento: '',
    municipio: '',
    ciudad: '',
    fecha_nacimiento: '',
    estado_civil: '',
  })
  const [fotoPerfil, setFotoPerfil] = useState('')
  const fotoInputRef = useRef<HTMLInputElement | null>(null)
  const correoSesion = String(loadSessionUser()?.email ?? '')
  const { departamentos: colombiaDeptos, geoError: colombiaGeoError } = useColombiaMunicipios()

  useEffect(() => {
    let cancelled = false
    const userId = loadSessionUser()?.id as number | string | undefined
    const fotoLocal = loadStoredProfilePhoto(userId)
    if (fotoLocal) setFotoPerfil(fotoLocal)

    void (async () => {
      try {
        const inicio = await getStudentInicio()
        if (cancelled) return
        const perfil = inicio.perfil
        if (perfil?.nombre) setSaludo(`Hola, ${String(perfil.nombre)}`)
        setPerfilForm({
          nombre: String(perfil?.nombre || ''),
          apellido: String(perfil?.apellido || ''),
          documento: String(perfil?.documento || ''),
          tipo_documento: String(perfil?.tipo_documento || ''),
          telefono: String(perfil?.telefono || ''),
          direccion: String(perfil?.direccion || ''),
          pais: String(perfil?.pais || ''),
          departamento: String(perfil?.departamento || ''),
          municipio: String(perfil?.municipio || ''),
          ciudad: String(perfil?.ciudad || ''),
          fecha_nacimiento: String(perfil?.fecha_nacimiento || '').slice(0, 10),
          estado_civil: String(perfil?.estado_civil || ''),
        })
        if (typeof perfil?.foto_url === 'string' && perfil.foto_url) {
          setFotoPerfil(perfil.foto_url)
          syncProfilePhoto(userId, perfil.foto_url)
        } else if (!fotoLocal) {
          void getStudentPerfil({ includeFoto: true })
            .then((p) => {
              if (cancelled) return
              const url = typeof (p as Record<string, unknown>)?.foto_url === 'string' ? String((p as Record<string, unknown>).foto_url) : ''
              if (url) {
                setFotoPerfil(url)
                syncProfilePhoto(userId, url)
              }
            })
            .catch(() => {})
        } else if (fotoLocal) {
          syncProfilePhoto(userId, fotoLocal)
        }
        const cursosNormalizados = Array.isArray(inicio.cursos) ? (inicio.cursos as StudentCourse[]) : []
        setCursos(cursosNormalizados)
        setNCursos(cursosNormalizados.length)
        if (cursosNormalizados.length > 0) setCursoActivoId(cursosNormalizados[0].id)
        setCertificados(Array.isArray(inicio.certificados) ? (inicio.certificados as StudentCertificate[]) : [])
        setCalendario(Array.isArray(inicio.calendario) ? (inicio.calendario as typeof calendario) : [])
        setNotificaciones(
          Array.isArray(inicio.notificaciones) ? (inicio.notificaciones as typeof notificaciones) : [],
        )
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
    const onProfileUpdated = (event: Event) => {
      const nombre = (event as CustomEvent<{ nombre?: string }>).detail?.nombre
      if (nombre?.trim()) setSaludo(`Hola, ${nombre.trim()}`)
    }
    window.addEventListener('colgo:profile-updated', onProfileUpdated)
    return () => window.removeEventListener('colgo:profile-updated', onProfileUpdated)
  }, [])

  useEffect(() => {
    const onPhotoUpdated = (event: Event) => {
      const foto = (event as CustomEvent<{ foto?: string }>).detail?.foto ?? ''
      setFotoPerfil(foto)
    }
    window.addEventListener(PROFILE_PHOTO_UPDATED_EVENT, onPhotoUpdated)
    return () => window.removeEventListener(PROFILE_PHOTO_UPDATED_EVENT, onPhotoUpdated)
  }, [])

  useEffect(() => {
    if (!cursoActivoId) {
      setNotasCurso([])
      return
    }
    let cancel = false
    void (async () => {
      try {
        const notas = (await getStudentCursoNotas(cursoActivoId)) as unknown
        if (!cancel) setNotasCurso(Array.isArray(notas) ? (notas as Array<{ evaluacion_numero: number; nota: number; descripcion?: string }>) : [])
      } catch {
        if (!cancel) setNotasCurso([])
      }
    })()
    return () => {
      cancel = true
    }
  }, [cursoActivoId])

  useEffect(() => {
    const sub = subscribeRealtime((type, payload) => {
      const enNotas = location.pathname.endsWith('/notas')
      if (!cursoActivoId || !enNotas) return
      const payloadCursoId = Number(payload?.cursoId ?? 0)
      if (!payloadCursoId || payloadCursoId !== cursoActivoId) return
      if (type !== 'grade_updated' && type !== 'final_grade_updated') return

      void (async () => {
        try {
          const notas = (await getStudentCursoNotas(cursoActivoId)) as unknown
          setNotasCurso(
            Array.isArray(notas)
              ? (notas as Array<{ evaluacion_numero: number; nota: number; descripcion?: string }>)
              : [],
          )
        } catch {
          // ignore refresh failures on realtime notifications
        }
      })()
    })
    return () => sub?.close()
  }, [cursoActivoId, location.pathname])

  useEffect(() => {
    const sub = subscribeRealtime((type) => {
      if (type !== 'notification_created' && type !== 'class_scheduled') return
      void (async () => {
        try {
          const [calendarioApi, notificacionesApi] = await Promise.all([
            getStudentCalendario(),
            getStudentNotificaciones(),
          ])
          setCalendario(Array.isArray(calendarioApi) ? (calendarioApi as typeof calendario) : [])
          setNotificaciones(Array.isArray(notificacionesApi) ? (notificacionesApi as typeof notificaciones) : [])
        } catch {
          // keep previous state
        }
      })()
    })
    return () => sub?.close()
  }, [])

  const guardarPerfil = async () => {
    setProfileError(null)
    setProfileOk(null)
    if (!perfilForm.nombre.trim() || !perfilForm.apellido.trim()) {
      setProfileError('Completa al menos nombre y apellido.')
      return
    }
    setSavingProfile(true)
    try {
      await updateStudentPerfil({
        nombre: perfilForm.nombre.trim(),
        apellido: perfilForm.apellido.trim(),
        documento: perfilForm.documento.trim(),
        tipo_documento: perfilForm.tipo_documento.trim(),
        telefono: perfilForm.telefono.trim(),
        direccion: perfilForm.direccion.trim(),
        pais: perfilForm.pais.trim(),
        departamento: perfilForm.departamento.trim(),
        municipio: perfilForm.municipio.trim(),
        ciudad: perfilForm.ciudad.trim(),
        fecha_nacimiento: perfilForm.fecha_nacimiento || null,
        estado_civil: perfilForm.estado_civil.trim(),
        foto_url: fotoPerfil || null,
      })
      setProfileOk('Perfil actualizado correctamente.')
      setSaludo(`Hola, ${perfilForm.nombre.trim()}`)
      syncProfilePhoto(loadSessionUser()?.id as number | string | undefined, fotoPerfil || null)
      window.dispatchEvent(
        new CustomEvent('colgo:profile-updated', { detail: { nombre: perfilForm.nombre.trim() } }),
      )
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'No se pudo actualizar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const seccion = useMemo<'dashboard' | 'cursos' | 'notas' | 'certificados' | 'perfil'>(() => {
    if (location.pathname.endsWith('/cursos')) return 'cursos'
    if (location.pathname.endsWith('/notas')) return 'notas'
    if (location.pathname.endsWith('/certificados')) return 'certificados'
    if (location.pathname.endsWith('/perfil')) return 'perfil'
    return 'dashboard'
  }, [location.pathname])

  const progresoGlobal = useMemo(() => {
    if (!cursos.length) return 0
    const total = cursos.reduce((acc, c) => acc + Number(c.progreso ?? 0), 0)
    return Math.round(total / cursos.length)
  }, [cursos])

  const departamentosColombiaOrdenados = useMemo(
    () => [...(colombiaDeptos || [])].sort((a, b) => a.departamento.localeCompare(b.departamento, 'es')),
    [colombiaDeptos],
  )

  const municipiosColombiaOrdenados = useMemo(() => {
    const row = departamentosColombiaOrdenados.find((d) => d.departamento === perfilForm.departamento)
    if (!row?.ciudades?.length) return []
    return [...row.ciudades].sort((a, b) => a.localeCompare(b, 'es'))
  }, [departamentosColombiaOrdenados, perfilForm.departamento])

  return (
    <div className="flex flex-col gap-4">
      <Card className={cn(backofficePanelCardClass, 'flex items-center justify-between')}>
        <div>
          <p className="text-base font-semibold text-[var(--text)]">{saludo}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Cursos inscritos: {nCursos}</p>
        </div>
      </Card>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {seccion === 'dashboard' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-sm font-semibold text-[var(--text)]">Progreso académico</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--panel-2)]">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progresoGlobal}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">{progresoGlobal}% de cursos completados</p>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-[var(--text)]">Accesos rápidos</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate('/estudiante/cursos')}>Mis cursos</Button>
              <Button size="sm" variant="secondary" onClick={() => navigate('/estudiante/notas')}>Ver notas</Button>
              <Button size="sm" variant="secondary" onClick={() => navigate('/estudiante/certificados')}>Certificados</Button>
            </div>
          </Card>
          <Card className="md:col-span-2">
            <p className="text-sm font-semibold text-[var(--text)]">Próximas clases</p>
            <div className="mt-3 space-y-2">
              {calendario.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No tienes clases programadas.</p>
              ) : (
                calendario.slice(0, 5).map((c) => (
                  <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2">
                    <p className="text-sm font-medium text-[var(--text)]">{c.titulo} · {c.curso_nombre}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(c.fecha).toLocaleDateString('es-CO')} · {c.hora_inicio.slice(0, 5)} · {c.tipo}
                    </p>
                    {c.tipo === 'virtual' && c.enlace_virtual ? (
                      <a className="mt-1 inline-block text-xs text-blue-600 underline" href={c.enlace_virtual} target="_blank" rel="noreferrer">
                        Entrar a la clase
                      </a>
                    ) : null}
                    {c.tipo === 'presencial' ? (
                      <p className="mt-1 text-xs text-[var(--muted)]">Ubicación: {c.ubicacion || 'Sin definir'}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card className="md:col-span-2">
            <p className="text-sm font-semibold text-[var(--text)]">Notificaciones</p>
            <div className="mt-3 space-y-2">
              {notificaciones.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Sin notificaciones recientes.</p>
              ) : (
                notificaciones.slice(0, 6).map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{n.titulo}</p>
                      <p className="text-xs text-[var(--muted)]">{n.mensaje}</p>
                    </div>
                    {!n.leida ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          void (async () => {
                            try {
                              await withOptimisticUpdate({
                                applyOptimistic: () => {
                                  const prev = notificaciones
                                  setNotificaciones((curr) =>
                                    curr.map((x) => (x.id === n.id ? { ...x, leida: true } : x)),
                                  )
                                  return () => setNotificaciones(prev)
                                },
                                request: () => marcarNotificacionLeida(n.id),
                                onSuccess: () => setToast('Notificación marcada como leída'),
                              })
                            } catch {
                              // rollback handled by helper
                            }
                          })()
                        }}
                      >
                        Marcar leída
                      </Button>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">Leída</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {seccion === 'cursos' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {cursos.map((c) => (
            <Card key={c.id}>
              <p className="text-sm font-semibold text-[var(--text)]">{c.nombre}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{c.codigo || 'Sin código'} · {c.estado || 'activa'}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{c.descripcion || 'Sin descripción'}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
                <div
                  className="h-full bg-[var(--accent)]"
                  style={{ width: `${Math.max(0, Math.min(100, Number(c.progreso ?? 0)))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">Progreso: {Number(c.progreso ?? 0)}%</p>
            </Card>
          ))}
        </div>
      ) : null}

      {seccion === 'notas' ? (
        <Card>
          <div className="mb-3">
            <select
              value={cursoActivoId ?? ''}
              onChange={(e) => setCursoActivoId(Number(e.target.value))}
              className="h-10 min-w-[220px] rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 text-sm"
            >
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            {notasCurso.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No hay notas registradas para este curso.</p>
            ) : (
              notasCurso.map((n, i) => (
                <div key={`${n.evaluacion_numero}-${i}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2">
                  <p className="text-sm font-medium text-[var(--text)]">Evaluación {n.evaluacion_numero}: {n.nota}</p>
                  <p className="text-xs text-[var(--muted)]">{n.descripcion || 'Sin descripción'}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      {seccion === 'certificados' ? (
        <Card>
          <p className="text-sm font-semibold text-[var(--text)]">Certificados</p>
          <div className="mt-3 space-y-2">
            {certificados.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Aún no tienes certificados disponibles.</p>
            ) : (
              certificados.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{cert.curso_nombre || 'Curso'}</p>
                    <p className="text-xs text-[var(--muted)]">{cert.numero_certificado || 'Sin número'} · {cert.fecha_emision ? new Date(cert.fecha_emision).toLocaleDateString('es-CO') : 'Sin fecha'}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={downloadingCertId === cert.id}
                    onClick={() => {
                      void (async () => {
                        try {
                          await withOptimisticUpdate({
                            applyOptimistic: () => {
                              const prevCerts = certificados
                              setDownloadingCertId(cert.id)
                              setCertificados((curr) => curr.map((c) => (c.id === cert.id ? { ...c, descargado: true } : c)))
                              return () => setCertificados(prevCerts)
                            },
                            request: () => downloadStudentCertificado(cert.id),
                            onSuccess: () => setToast('Certificado descargado'),
                            onFinally: () => setDownloadingCertId(null),
                          })
                        } catch {
                          // rollback handled by helper
                        }
                      })()
                    }}
                  >
                    {downloadingCertId === cert.id ? 'Descargando...' : cert.descargado ? 'Descargado' : 'Descargar'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      {seccion === 'perfil' ? (
        <div className="space-y-4">
          <Card>
            {profileError ? <p className="text-sm text-red-700">{profileError}</p> : null}
            {profileOk ? <p className="text-sm text-green-700">{profileOk}</p> : null}
            <div className={cn('flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:gap-4', (profileError || profileOk) && 'mt-3')}>
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
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
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
                      void (async () => {
                        try {
                          setFotoPerfil('')
                          await updateStudentPerfil({ foto_url: null })
                          syncProfilePhoto(loadSessionUser()?.id as number | string | undefined, null)
                          setProfileOk('Foto eliminada.')
                        } catch (err) {
                          setProfileError(err instanceof Error ? err.message : 'No se pudo quitar la foto.')
                        }
                      })()
                    }}
                  >
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
                        await updateStudentPerfil({ foto_url: dataUrl })
                        syncProfilePhoto(loadSessionUser()?.id as number | string | undefined, dataUrl)
                        setProfileOk('Foto guardada en el sistema.')
                      } catch (err) {
                        setProfileError(err instanceof Error ? err.message : 'No se pudo guardar la foto.')
                      }
                    })()
                  }}
                />
              </div>
              <p className="text-xs text-[var(--muted)] sm:max-w-xs">
                JPG, PNG, WebP. Se optimiza al guardar (menor tamaño, misma foto en administración).
              </p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
              Los datos que completes aquí son los mismos que revisa el administrador en tu ficha. Al guardar, el resumen del panel admin se actualiza.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Correo electrónico
                </span>
                <input
                  value={correoSesion}
                  readOnly
                  disabled
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm opacity-70 outline-none"
                />
              </label>
              <input
                value={perfilForm.nombre}
                onChange={(e) => setPerfilForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre(s)"
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
              <input
                value={perfilForm.apellido}
                onChange={(e) => setPerfilForm((p) => ({ ...p, apellido: e.target.value }))}
                placeholder="Apellido(s)"
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
              <select
                value={perfilForm.tipo_documento}
                onChange={(e) => setPerfilForm((p) => ({ ...p, tipo_documento: e.target.value }))}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">Tipo de documento</option>
                <option value="CC">CC</option>
                <option value="TI">TI</option>
                <option value="CE">CE</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="PEP">PEP</option>
                <option value="PPT">PPT</option>
              </select>
              <input
                value={perfilForm.documento}
                onChange={(e) => setPerfilForm((p) => ({ ...p, documento: e.target.value }))}
                placeholder="Número de documento"
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
              <input
                value={perfilForm.telefono}
                onChange={(e) => setPerfilForm((p) => ({ ...p, telefono: e.target.value }))}
                placeholder="Teléfono"
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
              <select
                value={perfilForm.estado_civil}
                onChange={(e) => setPerfilForm((p) => ({ ...p, estado_civil: e.target.value }))}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">Estado civil</option>
                <option value="Soltero(a)">Soltero(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Unión libre">Unión libre</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viudo(a)">Viudo(a)</option>
              </select>
              <input
                type="date"
                value={perfilForm.fecha_nacimiento}
                onChange={(e) => setPerfilForm((p) => ({ ...p, fecha_nacimiento: e.target.value }))}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
              <select
                value={perfilForm.pais}
                onChange={(e) =>
                  setPerfilForm((p) => ({
                    ...p,
                    pais: e.target.value,
                    departamento: e.target.value === PAIS_COLOMBIA ? p.departamento : '',
                    municipio: e.target.value === PAIS_COLOMBIA ? p.municipio : '',
                  }))
                }
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">País</option>
                {PAISES_OPCIONES.map((pais) => (
                  <option key={pais.value} value={pais.value}>
                    {pais.label}
                  </option>
                ))}
              </select>
              {perfilForm.pais === PAIS_COLOMBIA ? (
                <>
                  <select
                    value={perfilForm.departamento}
                    onChange={(e) => setPerfilForm((p) => ({ ...p, departamento: e.target.value, municipio: '' }))}
                    disabled={!colombiaDeptos?.length}
                    className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  >
                    <option value="">{colombiaDeptos?.length ? 'Departamento' : 'Cargando departamentos…'}</option>
                    {departamentosColombiaOrdenados.map((d) => (
                      <option key={d.id} value={d.departamento}>
                        {d.departamento}
                      </option>
                    ))}
                  </select>
                  <select
                    value={perfilForm.municipio}
                    onChange={(e) => setPerfilForm((p) => ({ ...p, municipio: e.target.value, ciudad: e.target.value }))}
                    disabled={!perfilForm.departamento || municipiosColombiaOrdenados.length === 0}
                    className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  >
                    <option value="">{perfilForm.departamento ? 'Ciudad / municipio' : 'Primero selecciona departamento'}</option>
                    {municipiosColombiaOrdenados.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <input
                    value={perfilForm.departamento}
                    onChange={(e) => setPerfilForm((p) => ({ ...p, departamento: e.target.value }))}
                    placeholder="Departamento / estado"
                    className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    value={perfilForm.ciudad}
                    onChange={(e) => setPerfilForm((p) => ({ ...p, ciudad: e.target.value }))}
                    placeholder="Ciudad"
                    className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </>
              )}
              <input
                value={perfilForm.direccion}
                onChange={(e) => setPerfilForm((p) => ({ ...p, direccion: e.target.value }))}
                placeholder="Dirección"
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)] sm:col-span-2"
              />
            </div>
            <div className="mt-3">
              <Button type="button" variant="primary" onClick={() => void guardarPerfil()} disabled={savingProfile}>
                {savingProfile ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
            {colombiaGeoError ? <p className="mt-3 text-xs text-amber-700">{colombiaGeoError}</p> : null}
          </Card>

        </div>
      ) : null}

      {cargando ? <p className="text-sm text-[var(--muted)]">Cargando...</p> : null}
      <Toast message={toast} show={Boolean(toast)} onClose={() => setToast('')} />
    </div>
  )
}
