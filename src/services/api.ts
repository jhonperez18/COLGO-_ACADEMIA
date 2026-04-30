/**
 * Servicio de API para comunicarse con el backend
 */

import { resolveApiBaseUrl } from '../config/apiBaseUrl';

const API_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  return localStorage.getItem('colgo-token');
}

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options;
  const url = `${API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (requiresAuth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('colgo-token');
        localStorage.removeItem('colgo-usuario');
        window.location.href = '/login';
      }
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new ApiError(error.error || error.message || 'Error en la API', response.status);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Error desconocido';

    if (message.includes('Failed to fetch') || message.includes('fetch')) {
      throw new ApiError(
        'No se pudo conectar al servidor. Asegúrate de que npm run server está ejecutándose en http://localhost:3001',
        0,
      );
    }

    throw new ApiError(message, 500);
  }
}

// ===== ADMIN API =====

export const adminAPI = {
  getEstadisticas: () => apiRequest('/admin/estadisticas'),
  getEstudiantes: () => apiRequest('/admin/estudiantes'),
  getEstudiante: (id: number) => apiRequest(`/admin/estudiantes/${id}`),
  crearEstudiante: (datos: Record<string, unknown>) =>
    apiRequest('/admin/estudiantes', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizarEstudiante: (id: number, datos: Record<string, unknown>) =>
    apiRequest(`/admin/estudiantes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),
  desactivarEstudiante: (id: number) =>
    apiRequest(`/admin/estudiantes/${id}`, {
      method: 'DELETE',
    }),
  getDocentes: () => apiRequest('/admin/docentes'),
  crearDocente: (datos: Record<string, unknown>) =>
    apiRequest('/admin/docentes', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  getCursos: () => apiRequest('/admin/cursos'),
  crearCurso: (datos: Record<string, unknown>) =>
    apiRequest('/admin/cursos', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizarCurso: (id: number, datos: Record<string, unknown>) =>
    apiRequest(`/admin/cursos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),
};

// ===== MATRICULAS API =====

export const matriculasAPI = {
  crear: (datos: Record<string, unknown>) =>
    apiRequest('/matriculas/crear', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  listar: () => apiRequest('/matriculas/listar'),
  getEstudiante: (estudianteId: number) =>
    apiRequest(`/matriculas/estudiante/${estudianteId}`),
  cancelar: (id: number) =>
    apiRequest(`/matriculas/${id}`, {
      method: 'DELETE',
    }),
  generarCertificado: (id: number) =>
    apiRequest(`/matriculas/${id}/generar-certificado`, {
      method: 'POST',
    }),
};

// ===== STUDENT API =====

export const studentAPI = {
  getPerfil: () => apiRequest('/student/perfil'),
  actualizarPerfil: (datos: Record<string, unknown>) =>
    apiRequest('/student/perfil', {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),
  getCursos: () => apiRequest('/student/cursos'),
  getNotasCurso: (cursoId: number) =>
    apiRequest(`/student/cursos/${cursoId}/notas`),
  getHorarios: () => apiRequest('/student/horarios'),
  getCertificados: () => apiRequest('/student/certificados'),
  descargarCertificado: (id: number) =>
    apiRequest(`/student/certificados/${id}/descargar`, {
      method: 'POST',
    }),
};

// ===== TEACHER API =====

export const teacherAPI = {
  getPerfil: () => apiRequest('/teacher/perfil'),
  getCursos: () => apiRequest('/teacher/cursos'),
  getEstudiantes: (cursoId: number) =>
    apiRequest(`/teacher/cursos/${cursoId}/estudiantes`),
  getNotas: (cursoId: number, estudianteId: number) =>
    apiRequest(`/teacher/cursos/${cursoId}/estudiantes/${estudianteId}/notas`),
  registrarNota: (cursoId: number, estudianteId: number, datos: Record<string, unknown>) =>
    apiRequest(`/teacher/cursos/${cursoId}/estudiantes/${estudianteId}/notas`, {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  registrarCalificacionFinal: (cursoId: number, estudianteId: number, datos: Record<string, unknown>) =>
    apiRequest(
      `/teacher/cursos/${cursoId}/estudiantes/${estudianteId}/calificacion-final`,
      {
        method: 'PUT',
        body: JSON.stringify(datos),
      }
    ),
  getHorarios: (cursoId: number) =>
    apiRequest(`/teacher/cursos/${cursoId}/horarios`),
};

// ===== AUTH API =====

export const authAPI = {
  getMe: () => apiRequest('/auth/me', { requiresAuth: true }),
  refreshToken: () =>
    apiRequest('/auth/refresh-token', {
      method: 'POST',
      requiresAuth: true,
    }),
};

export default {
  admin: adminAPI,
  matriculas: matriculasAPI,
  student: studentAPI,
  teacher: teacherAPI,
  auth: authAPI,
};

