// Servicio para comunicación con la API de Backend
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

console.log('🔌 API Base URL:', API_BASE)

export class ApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${endpoint}`

  console.log(`📤 ${options.method || 'GET'} ${url}`)

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new ApiError(error.error || error.message || 'Error en la API', response.status)
    }

    const data = await response.json()
    console.log(`✅ Respuesta exitosa:`, data)
    return data
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`❌ ApiError: ${error.message}`)
      throw error
    }

    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error(`❌ Error de conexión: ${message}`)

    if (message.includes('Failed to fetch') || message.includes('fetch')) {
      throw new ApiError(
        '❌ No se pudo conectar al servidor. Asegúrate de que npm run server está ejecutándose en http://localhost:3001',
        0,
      )
    }

    throw new ApiError(message, 500)
  }
}

// ============================================================================
// API de Estudiantes
// ============================================================================

export interface CreateStudentPayload {
  id?: string
  name: string
  document: string
  sede_id?: string
  status?: 'Activo' | 'Pendiente' | 'Inactivo'
  email?: string
  phone?: string
}

export interface StudentResponse {
  id: string
  name: string
  document: string
  status: string
  sede_id?: string
  email?: string
  phone?: string
  created_at: string
}

export const StudentService = {
  async list(): Promise<StudentResponse[]> {
    return apiRequest('/students')
  },

  async get(id: string): Promise<StudentResponse> {
    return apiRequest(`/students/${id}`)
  },

  async create(data: CreateStudentPayload): Promise<{ message: string; id: string }> {
    // Si la API no está disponible, usar el método local
    try {
      return await apiRequest('/students', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    } catch (error) {
      // Si hay error de conexión, retornar error
      throw error
    }
  },

  async updateStatus(
    id: string,
    status: 'Activo' | 'Pendiente' | 'Inactivo',
  ): Promise<{ message: string; status: string }> {
    return apiRequest(`/students/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  },
}

// ============================================================================
// API de Cursos
// ============================================================================

export const CourseService = {
  async list() {
    return apiRequest('/courses')
  },

  async get(id: string) {
    return apiRequest(`/courses/${id}`)
  },
}

// ============================================================================
// API de Matrículas
// ============================================================================

export const EnrollmentService = {
  async listByStudent(studentId: string) {
    return apiRequest(`/students/${studentId}/enrollments`)
  },

  async create(data: any) {
    return apiRequest('/enrollments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// ============================================================================
// API de Pagos
// ============================================================================

export const PaymentService = {
  async list() {
    return apiRequest('/payments')
  },

  async create(data: any) {
    return apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
