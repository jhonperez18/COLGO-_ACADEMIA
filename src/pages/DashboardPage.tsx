import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { KpiCard } from '../components/dashboard/KpiCard'
import { RecentRegistroCompact } from '../components/dashboard/RecentRegistroCompact'
import { BarChart, LineChart } from '../components/charts/MockCharts'
import { formatCOP } from '../services/mockData'
import { useColgo } from '../state/useColgo'
import { getAdminEstadisticas, listRegistroSistema, subscribeRealtime, type RegistroSistemaItem } from '../services/apiClient'

type AdminStats = {
  estudiantes: number
  docentes: number
  cursos: number
  matriculasActivas: number
  usuarios?: number
  ventas?: number
}

export function DashboardPage() {
  const { payments, enrollments } = useColgo()
  const [registroReciente, setRegistroReciente] = useState<RegistroSistemaItem[]>([])
  const [cargandoRegistro, setCargandoRegistro] = useState(true)
  const [cargandoStats, setCargandoStats] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [apiStats, setApiStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    let cancel = false
    void (async () => {
      setCargandoStats(true)
      setStatsError(false)
      try {
        const stats = await getAdminEstadisticas()
        if (!cancel) setApiStats(stats)
      } catch {
        if (!cancel) {
          setApiStats(null)
          setStatsError(true)
        }
      } finally {
        if (!cancel) setCargandoStats(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    let cancel = false
    void (async () => {
      setCargandoRegistro(true)
      try {
        const rows = await listRegistroSistema({ limit: 5 })
        if (!cancel) setRegistroReciente(Array.isArray(rows) ? rows : [])
      } catch {
        if (!cancel) setRegistroReciente([])
      } finally {
        if (!cancel) setCargandoRegistro(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    const sub = subscribeRealtime((type) => {
      if (type !== 'grade_updated' && type !== 'final_grade_updated') return
      void (async () => {
        try {
          const stats = await getAdminEstadisticas()
          setApiStats(stats)
          setStatsError(false)
        } catch {
          // mantener últimos datos válidos
        }
      })()
    })
    return () => sub?.close()
  }, [])

  const { revenueSeries, matriculaSeries } = useMemo(() => {
    const msWeek = 1000 * 60 * 60 * 24 * 7
    const toWeekStart = (d: Date) => {
      const x = new Date(d)
      const day = x.getDay()
      const diffToMonday = (day + 6) % 7
      x.setDate(x.getDate() - diffToMonday)
      x.setHours(0, 0, 0, 0)
      return x
    }

    const approved = payments.filter((p) => p.status === 'Aprobado')
    const maxPaymentTime = approved.length ? Math.max(...approved.map((p) => new Date(p.paymentDate).getTime())) : 0
    const endPaymentWeek = toWeekStart(new Date(maxPaymentTime))
    const startPaymentWeek = new Date(endPaymentWeek.getTime() - msWeek * 11)

    const revenueBuckets = Array.from({ length: 12 }, () => 0)
    for (const p of approved) {
      const w = toWeekStart(new Date(p.paymentDate))
      const idx = Math.floor((w.getTime() - startPaymentWeek.getTime()) / msWeek)
      if (idx >= 0 && idx < revenueBuckets.length) revenueBuckets[idx] += p.amount
    }
    const revenueVals = revenueBuckets.map((sum) => Math.max(1, Math.round(sum / 1000000)))

    const maxEnrollmentTime = enrollments.length ? Math.max(...enrollments.map((e) => new Date(e.startDate).getTime())) : 0
    const endEnrollWeek = toWeekStart(new Date(maxEnrollmentTime))
    const startEnrollWeek = new Date(endEnrollWeek.getTime() - msWeek * 11)

    const enrollmentBuckets = Array.from({ length: 7 }, () => 0)
    for (const e of enrollments) {
      const w = toWeekStart(new Date(e.startDate))
      const idx = Math.floor((w.getTime() - startEnrollWeek.getTime()) / (msWeek * (12 / 7)))
      const clamped = Math.min(6, Math.max(0, idx))
      if (e.status === 'Activa') enrollmentBuckets[clamped] += 1
    }
    const matriculaVals = enrollmentBuckets.map((c) => Math.max(1, c))

    return { revenueSeries: revenueVals, matriculaSeries: matriculaVals }
  }, [enrollments, payments])

  const statsSublabel = statsError ? 'No se pudo cargar' : 'Dato real backend'

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Estudiantes"
          value={apiStats ? apiStats.estudiantes.toLocaleString('es-CO') : '—'}
          sublabel={statsSublabel}
          accent
          loading={cargandoStats}
        />
        <KpiCard
          label="Ventas"
          value={apiStats ? formatCOP(apiStats.ventas ?? 0) : '—'}
          sublabel={statsSublabel}
          loading={cargandoStats}
        />
        <KpiCard
          label="Cursos"
          value={apiStats ? String(apiStats.cursos) : '—'}
          sublabel={statsSublabel}
          loading={cargandoStats}
        />
        <KpiCard
          label="Usuarios"
          value={apiStats ? String(apiStats.usuarios ?? 0) : '—'}
          sublabel={
            statsError
              ? 'No se pudo cargar'
              : apiStats
                ? `Matrículas activas: ${apiStats.matriculasActivas ?? 0}`
                : statsSublabel
          }
          loading={cargandoStats}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Ingresos por semana</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Serie de referencia (datos locales)</p>
            </div>
            <Badge tone="accent">+12.4%</Badge>
          </div>
          <div className="mt-3">
            <LineChart values={revenueSeries} />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Matrículas</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Volumen de referencia</p>
            </div>
            <Badge tone="neutral">Referencia</Badge>
          </div>
          <div className="mt-3">
            <BarChart values={matriculaSeries} />
          </div>
        </Card>
      </div>

      <div className="flex justify-start">
        <RecentRegistroCompact
          items={registroReciente}
          verTodoHref="/admin/eventos"
          cargando={cargandoRegistro}
        />
      </div>
    </div>
  )
}
