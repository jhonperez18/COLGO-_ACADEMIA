import { useState } from 'react'
import { Button } from '../common/Button'
import type { StudentStatus } from '../../services/mockData'

export interface CreateStudentFormData {
  name: string
  document: string
  sede: 'Medellín' | 'Bogotá' | 'Virtual'
  status: StudentStatus
  email?: string
  phone?: string
}

export function CreateStudentForm({
  onSubmit,
  loading = false,
}: {
  onSubmit: (data: CreateStudentFormData) => Promise<void>
  loading?: boolean
}) {
  const [formData, setFormData] = useState<CreateStudentFormData>({
    name: '',
    document: '',
    sede: 'Medellín',
    status: 'Pendiente',
  })

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validación simple
    if (!formData.name.trim()) {
      setError('El nombre es requerido')
      return
    }
    if (!formData.document.trim()) {
      setError('El documento es requerido')
      return
    }

    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el estudiante')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-800 mb-1">Error:</p>
          <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
        </div>
      )}

      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">
          Nombre completo *
        </span>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej: Mariana Gómez"
          className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--subtle)] focus:border-[var(--accent)] focus:bg-[var(--panel-2)] focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-[rgba(255,255,255,0.62)]">
          Documento de identidad *
        </span>
        <input
          type="text"
          value={formData.document}
          onChange={(e) => setFormData({ ...formData, document: e.target.value })}
          placeholder="Ej: 1.045.238.771"
          className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--subtle)] focus:border-[var(--accent)] focus:bg-[var(--panel-2)] focus:outline-none"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Sede</span>
          <select
            value={formData.sede}
            onChange={(e) =>
              setFormData({
                ...formData,
                sede: e.target.value as 'Medellín' | 'Bogotá' | 'Virtual',
              })
            }
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:bg-[var(--panel-2)] focus:outline-none"
          >
            <option value="Medellín">Medellín</option>
            <option value="Bogotá">Bogotá</option>
            <option value="Virtual">Virtual</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">Estado</span>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as StudentStatus,
              })
            }
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:bg-[var(--panel-2)] focus:outline-none"
          >
            <option value="Activo">Activo</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">
          Correo electrónico (opcional)
        </span>
        <input
          type="email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Ej: mariana@example.com"
          className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--subtle)] focus:border-[var(--accent)] focus:bg-[var(--panel-2)] focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-[var(--muted)]">
          Teléfono (opcional)
        </span>
        <input
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="Ej: +573001234567"
          className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--subtle)] focus:border-[var(--accent)] focus:bg-[var(--panel-2)] focus:outline-none"
        />
      </label>

      <div className="flex gap-2 pt-2">
        <Button type="submit" variant="primary" disabled={loading} className="flex-1">
          {loading ? 'Creando...' : 'Crear Estudiante'}
        </Button>
      </div>
    </form>
  )
}
