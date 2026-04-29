import { clearSession, getSessionToken } from '../state/authSession';

/** En Vercel define VITE_API_URL (p. ej. https://tu-backend.railway.app/api) — nunca localhost en producción. */
const API_BASE_URL = String(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const REALTIME_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
}

async function apiCall<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const token = getSessionToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Si el token expiró, redirigir a login
  if (response.status === 401) {
    clearSession();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' })) as {
      message?: string;
      error?: string;
      hint?: string;
      detail?: string;
    };
    const main = error.error || error.message || `Error ${response.status}`;
    const hint = error.hint ? `\n\n${error.hint}` : '';
    const detail = error.detail ? `\n\n${error.detail}` : '';
    throw new Error(`${main}${hint}${detail}`);
  }

  return response.json() as Promise<T>;
}

export type LoginUsuario = {
  id: number
  email: string
  rol: 'admin' | 'estudiante' | 'docente' | 'staff'
  cambiar_password?: boolean
  nombre_panel?: string
}

export type LoginResponse = {
  token: string
  usuario: LoginUsuario
}

// ============ AUTHENTICATION ============
export async function login(email: string, password: string) {
  return apiCall<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  clearSession();
}

// ============ STUDENT ENDPOINTS ============
export async function getStudentPerfil() {
  return apiCall('/student/perfil');
}

export async function updateStudentPerfil(data: Record<string, unknown>) {
  return apiCall('/student/perfil', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getStudentCursos() {
  return apiCall('/student/cursos');
}

export async function getStudentCursoNotas(cursoId: number) {
  return apiCall(`/student/cursos/${cursoId}/notas`);
}

export async function getStudentHorarios() {
  return apiCall('/student/horarios');
}

export async function getStudentCertificados() {
  return apiCall('/student/certificados');
}

export async function downloadStudentCertificado(certificadoId: number) {
  return apiCall(`/student/certificados/${certificadoId}/descargar`, {
    method: 'POST',
  });
}

// ============ TEACHER ENDPOINTS ============
export async function getTeacherPerfil() {
  return apiCall('/teacher/perfil');
}

export async function updateTeacherPerfil(data: Record<string, unknown>) {
  return apiCall('/teacher/perfil', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getTeacherCursos() {
  return apiCall('/teacher/cursos');
}

export async function getTeacherCursoEstudiantes(cursoId: number) {
  return apiCall(`/teacher/cursos/${cursoId}/estudiantes`);
}

export async function getTeacherReporte(cursoId: number) {
  return apiCall(`/teacher/reportes/curso/${cursoId}`);
}

/** Perfil propio en servidor (rol `staff` o `admin`): `GET /api/auth/me/perfil` */
export async function getUsuariosMePerfil() {
  return apiCall('/auth/me/perfil');
}

export async function updateUsuariosMePerfil(data: Record<string, unknown>) {
  return apiCall('/auth/me/perfil', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** @deprecated Usar getUsuariosMePerfil */
export const getStaffPerfil = getUsuariosMePerfil;
/** @deprecated Usar updateUsuariosMePerfil */
export const updateStaffPerfil = updateUsuariosMePerfil;

export async function registrarNota(
  cursoId: number,
  estudianteId: number,
  evaluacion_numero: number,
  nota: number
) {
  return apiCall(`/teacher/cursos/${cursoId}/estudiantes/${estudianteId}/notas`, {
    method: 'POST',
    body: JSON.stringify({ evaluacion_numero, nota }),
  });
}

export async function guardarCalificacionFinal(
  cursoId: number,
  estudianteId: number,
  calificacion_final: number,
  estado: string
) {
  return apiCall(
    `/teacher/cursos/${cursoId}/estudiantes/${estudianteId}/calificacion-final`,
    {
      method: 'PUT',
      body: JSON.stringify({ calificacion_final, estado }),
    }
  );
}

// ============ ADMIN ENDPOINTS ============
export async function getAdminEstadisticas() {
  return apiCall<{
    estudiantes: number;
    docentes: number;
    cursos: number;
    matriculasActivas: number;
    usuarios?: number;
    ventas?: number;
  }>('/admin/estadisticas');
}

export async function getAdminEstudiantes() {
  return apiCall('/admin/estudiantes');
}

export async function createAdminEstudiante(data: Record<string, unknown>) {
  return apiCall('/admin/estudiantes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminEstudiante(id: number, data: Record<string, unknown>) {
  return apiCall(`/admin/estudiantes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminEstudiante(id: number) {
  return apiCall(`/admin/estudiantes/${id}`, {
    method: 'DELETE',
  });
}

export async function getAdminDocentes() {
  return apiCall('/admin/docentes');
}

export async function createAdminDocente(data: Record<string, unknown>) {
  return apiCall('/admin/docentes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminDocente(id: number, data: Record<string, unknown>) {
  return apiCall(`/admin/docentes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminDocente(id: number) {
  return apiCall(`/admin/docentes/${id}`, {
    method: 'DELETE',
  });
}

export async function getAdminCursos() {
  return apiCall('/admin/cursos');
}

export async function createAdminCurso(data: Record<string, unknown>) {
  return apiCall('/admin/cursos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminCurso(id: number, data: Record<string, unknown>) {
  return apiCall(`/admin/cursos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminCurso(id: number) {
  return apiCall(`/admin/cursos/${id}`, {
    method: 'DELETE',
  });
}

export async function getAdminMatriculas() {
  return apiCall('/admin/matriculas');
}

export async function createAdminMatricula(data: Record<string, unknown>) {
  return apiCall('/admin/matriculas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminMatricula(id: number) {
  return apiCall(`/admin/matriculas/${id}`, {
    method: 'DELETE',
  });
}

export type RolApi = 'admin' | 'estudiante' | 'docente' | 'staff';

export type UsuarioListaItem = {
  id: number;
  email: string;
  rol: RolApi;
  activo: boolean;
  fecha_creacion?: string;
  nombre_completo?: string;
  documento?: string | null;
  cursos_asignados?: string | null;
  estudiante_id?: number | null;
  docente_id?: number | null;
  nivel_confianza?: 'baja' | 'media' | 'alta' | null;
  ultimo_acceso?: string | null;
};

export type UsuarioDetalleAdmin = {
  id: number;
  email: string;
  rol: RolApi;
  activo: boolean;
  nombres?: string;
  apellidos?: string;
  cedula?: string;
  tipo_documento?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  departamento?: string | null;
  municipio?: string | null;
  fecha_nacimiento?: string | null;
  estado_civil?: string | null;
  especialidad?: string | null;
};

export type UsuarioPermisos = {
  nivel_confianza: 'baja' | 'media' | 'alta';
  gestionar_usuarios: boolean;
  asignar_cursos: boolean;
  bloquear_usuarios: boolean;
  ver_logs: boolean;
  eliminar_usuarios: boolean;
};

export type SistemaLog = {
  id: number;
  accion: string;
  tabla_afectada?: string | null;
  fecha: string;
  usuario_email?: string | null;
};

export type ActividadUsuario = {
  id: number;
  actor_usuario_id?: number | null;
  actor_rol?: string | null;
  objetivo_usuario_id?: number | null;
  accion: string;
  detalle?: string | null;
  ip_origen?: string | null;
  fecha: string;
};

export async function listUsuariosAdmin() {
  return apiCall<UsuarioListaItem[]>('/usuarios');
}

export async function getUsuariosCursosDisponibles() {
  return apiCall<Array<{ id: number; nombre: string; codigo?: string; activo?: boolean; docente?: string | null }>>(
    '/usuarios/cursos-disponibles',
  );
}

export async function listLogsAdmin() {
  return apiCall<SistemaLog[]>('/usuarios/logs');
}

export async function createUsuarioAdmin(body: {
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  rol: RolApi;
  curso_ids?: number[];
}) {
  return apiCall<{
    id: number;
    email: string;
    rol: RolApi;
    emailSent?: boolean;
    /** Solo si falló el envío: mensaje breve para el administrador */
    emailWarning?: string;
    /** Detalle técnico del SMTP (opcional) */
    emailDetail?: string;
  }>('/usuarios', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateUsuarioAdmin(
  id: number,
  body: {
    nombres?: string;
    apellidos?: string;
    cedula?: string;
    tipo_documento?: string;
    email?: string;
    activo?: boolean;
    telefono?: string;
    direccion?: string;
    ciudad?: string;
    pais?: string;
    departamento?: string;
    municipio?: string;
    fecha_nacimiento?: string;
    estado_civil?: string;
    especialidad?: string;
  },
) {
  return apiCall<{ success: boolean; id: number }>(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function getUsuarioDetalleAdmin(id: number) {
  return apiCall<UsuarioDetalleAdmin>(`/usuarios/${id}/detalle`);
}

export async function getUsuarioPermisosAdmin(id: number) {
  return apiCall<UsuarioPermisos>(`/usuarios/${id}/permisos`);
}

export async function updateUsuarioPermisosAdmin(
  id: number,
  body: Partial<UsuarioPermisos> & { nivel_confianza: 'baja' | 'media' | 'alta' },
) {
  return apiCall<UsuarioPermisos & { success: boolean; usuario_id: number }>(`/usuarios/${id}/permisos`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function toggleUsuarioActivo(id: number, activo: boolean) {
  return apiCall<{ success: boolean; id: number; activo: boolean }>(`/usuarios/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  });
}

export async function deleteUsuarioAdmin(id: number) {
  return apiCall<{ success: boolean; id: number }>(`/usuarios/${id}`, {
    method: 'DELETE',
  });
}

export async function resendUsuarioWelcomeEmail(id: number) {
  return apiCall<{ success: boolean; id: number; email: string }>(`/usuarios/${id}/reenviar-bienvenida`, {
    method: 'POST',
  });
}

export async function resetUsuarioPasswordAdmin(id: number, send_email = false) {
  return apiCall<{
    success: boolean;
    usuario_id: number;
    password_temporal: string;
    forzar_cambio_password: boolean;
    mensaje: string;
    emailSent?: boolean;
    emailWarning?: string;
    emailDetail?: string;
  }>(`/usuarios/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ send_email }),
  });
}

export async function getUsuarioActividadAdmin(id: number) {
  return apiCall<ActividadUsuario[]>(`/usuarios/${id}/actividad`);
}

export async function getUsuariosAnomaliasSeguridad() {
  return apiCall<Array<{ usuario_id: number | null; total_fallos: number }>>('/usuarios/seguridad/anomalias');
}

export async function getSupervisionUsuarioAdmin(id: number) {
  return apiCall<{
    modo_visual: boolean;
    aviso: string;
    usuario: {
      id: number;
      email: string;
      rol: string;
      activo: boolean;
      ultimo_acceso?: string | null;
      nombre: string;
    };
    panel: {
      cursos?: Array<Record<string, unknown>>;
    };
  }>(`/usuarios/${id}/supervision`);
}

export async function validateUsuarioAdmin(params: { cedula?: string; email?: string }) {
  const query = new URLSearchParams();
  if (params.cedula?.trim()) query.set('cedula', params.cedula.trim());
  if (params.email?.trim()) query.set('email', params.email.trim().toLowerCase());
  return apiCall<{
    cedulaExists: boolean;
    emailExists: boolean;
    available: boolean;
  }>(`/usuarios/validate?${query.toString()}`);
}

export async function changePassword(currentPassword: string | null, newPassword: string) {
  const body: Record<string, string> = { newPassword };
  if (currentPassword) body.currentPassword = currentPassword;
  return apiCall<{ success: boolean; message?: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type RealtimeEventPayload = {
  cursoId?: number;
  estudianteId?: number;
  evaluacion_numero?: number;
  nota?: number;
  calificacion_final?: number;
  estado?: string;
  updatedBy?: number;
  at?: string;
  classId?: number;
  tipo?: string;
  titulo?: string;
  usuarioId?: number;
  mensaje?: string;
};

type RealtimeSubscriber = {
  id: number;
  onEvent: (eventType: string, payload: RealtimeEventPayload) => void;
  onError?: () => void;
};

let realtimeES: EventSource | null = null;
let reconnectTimer: number | null = null;
let reconnectAttempt = 0;
let nextSubId = 1;
const realtimeSubs = new Map<number, RealtimeSubscriber>();
let boundDocVisibility = false;

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function closeRealtimeConnection() {
  clearReconnectTimer();
  if (realtimeES) {
    realtimeES.close();
    realtimeES = null;
  }
}

function notifySubscribers(eventType: string, payload: RealtimeEventPayload) {
  for (const sub of realtimeSubs.values()) {
    try {
      sub.onEvent(eventType, payload);
    } catch {
      // subscriber errors should not break the bus
    }
  }
}

function notifyRealtimeError() {
  for (const sub of realtimeSubs.values()) {
    try {
      sub.onError?.();
    } catch {
      // ignore
    }
  }
}

function bindEventType(type: string) {
  if (!realtimeES) return;
  realtimeES.addEventListener(type, (evt) => {
    try {
      const payload = JSON.parse((evt as MessageEvent).data) as RealtimeEventPayload;
      notifySubscribers(type, payload);
    } catch {
      // ignore invalid payload
    }
  });
}

function scheduleRealtimeReconnect() {
  if (reconnectTimer !== null || realtimeSubs.size === 0) return;
  const delay = Math.min(30000, 1000 * 2 ** Math.min(reconnectAttempt, 5));
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    reconnectAttempt += 1;
    ensureRealtimeConnection();
  }, delay);
}

function ensureRealtimeConnection() {
  if (realtimeES || realtimeSubs.size === 0) return;
  const token = getSessionToken();
  if (!token) return;

  const url = `${REALTIME_BASE_URL}/api/realtime/stream?token=${encodeURIComponent(token)}`;
  realtimeES = new EventSource(url);
  bindEventType('connected');
  bindEventType('grade_updated');
  bindEventType('final_grade_updated');
  bindEventType('class_scheduled');
  bindEventType('notification_created');

  realtimeES.onopen = () => {
    reconnectAttempt = 0;
    clearReconnectTimer();
  };
  realtimeES.onerror = () => {
    notifyRealtimeError();
    closeRealtimeConnection();
    scheduleRealtimeReconnect();
  };
}

// ============ ACADEMICO ENDPOINTS ============
export async function getAdminProgramas() {
  return apiCall<Array<{ id: number; nombre: string; codigo: string; descripcion?: string; activo?: boolean }>>(
    '/academico/admin/programas',
  );
}

export async function createAdminPrograma(data: {
  nombre: string;
  codigo: string;
  descripcion?: string;
}) {
  return apiCall<{ success: boolean; id: number }>('/academico/admin/programas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createCursoModulo(cursoId: number, data: { titulo: string; descripcion?: string; orden?: number }) {
  return apiCall<{ success: boolean; id: number }>(`/academico/admin/cursos/${cursoId}/modulos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function asignarDocenteCurso(cursoId: number, docente_id: number) {
  return apiCall<{ success: boolean; message: string }>(`/academico/admin/cursos/${cursoId}/asignar-docente`, {
    method: 'PUT',
    body: JSON.stringify({ docente_id }),
  });
}

export async function inscribirEstudiantesCurso(cursoId: number, estudiante_ids: number[]) {
  return apiCall<{ success: boolean; inscritas: number }>(`/academico/admin/cursos/${cursoId}/inscribir-estudiantes`, {
    method: 'POST',
    body: JSON.stringify({ estudiante_ids }),
  });
}

export async function createTeacherClase(
  cursoId: number,
  data: {
    titulo: string;
    descripcion?: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    tipo: 'virtual' | 'presencial';
    modulo_id?: number;
    enlace_virtual?: string;
    ubicacion?: string;
  },
) {
  return apiCall<{ success: boolean; id: number }>(`/academico/teacher/cursos/${cursoId}/clases`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getStudentMisCursos() {
  return apiCall<
    Array<{
      id: number;
      nombre: string;
      codigo?: string;
      descripcion?: string;
      estado?: string;
      calificacion_final?: number | null;
      total_modulos?: number;
      progreso?: number;
    }>
  >('/academico/student/mis-cursos');
}

export async function getStudentCalendario() {
  return apiCall<
    Array<{
      id: number;
      titulo: string;
      fecha: string;
      hora_inicio: string;
      hora_fin: string;
      tipo: 'virtual' | 'presencial';
      enlace_virtual?: string;
      ubicacion?: string;
      curso_id: number;
      curso_nombre: string;
    }>
  >('/academico/student/calendario');
}

export async function getStudentNotificaciones() {
  return apiCall<
    Array<{
      id: number;
      tipo: string;
      titulo: string;
      mensaje: string;
      entidad_tipo?: string;
      entidad_id?: number;
      leida: boolean;
      fecha_creacion: string;
    }>
  >('/academico/student/notificaciones');
}

export async function marcarNotificacionLeida(id: number) {
  return apiCall<{ success: boolean }>(`/academico/notificaciones/${id}/leer`, {
    method: 'PUT',
  });
}

function ensureVisibilityReconnectListener() {
  if (boundDocVisibility) return;
  const onVisibility = () => {
    if (document.visibilityState === 'visible' && realtimeSubs.size > 0 && !realtimeES) {
      ensureRealtimeConnection();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  boundDocVisibility = true;
}

export function subscribeRealtime(
  onEvent: (eventType: string, payload: RealtimeEventPayload) => void,
  onError?: () => void,
) {
  const id = nextSubId++;
  realtimeSubs.set(id, { id, onEvent, onError });
  ensureVisibilityReconnectListener();
  ensureRealtimeConnection();

  return {
    close: () => {
      realtimeSubs.delete(id);
      if (realtimeSubs.size === 0) {
        closeRealtimeConnection();
      }
    },
  };
}
