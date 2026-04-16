import { useMemo } from 'react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { KpiCard } from '../components/dashboard/KpiCard'
import { BarChart, LineChart } from '../components/charts/MockCharts'
import { formatCOP, formatDate } from '../services/mockData'
import { Clock, CreditCard, MapPinned, ReceiptText, Sparkles, User } from 'lucide-react'
import { useColgo } from '../state/useColgo'

function iconForKind(kind: 'Matrícula' | 'Pago' | 'Curso' | 'Sede' | 'Estudiante') {
  const common = 'text-[rgba(113,63,18,0.95)]'
  switch (kind) {
    case 'Pago':
      return <CreditCard size={16} className={common} />
    case 'Matrícula':
      return <ReceiptText size={16} className={common} />
    case 'Sede':
      return <MapPinned size={16} className={common} />
    case 'Estudiante':
      return <User size={16} className={common} />
    default:
      return <Sparkles size={16} className={common} />
  }
}

export function DashboardPage() {
  const { students, payments, enrollments, courses, locations, recentActivity } = useColgo()

  const kpis = useMemo(() => {
    const revenue = payments.filter((p) => p.status === 'Aprobado').reduce((acc, p) => acc + p.amount, 0)
    return {
      students: students.length,
      revenue,
      courses: courses.length,
      locations: locations.length,
    }
  }, [courses.length, locations.length, payments, students.length])

  const { revenueSeries, matriculaSeries } = useMemo(() => {
    const msWeek = 1000 * 60 * 60 * 24 * 7
    const toWeekStart = (d: Date) => {
      const x = new Date(d)
      const day = x.getDay() // 0..6 (Dom..Sáb)
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
      // idx approximate para mantener un look similar al mock
      const clamped = Math.min(6, Math.max(0, idx))
      if (e.status === 'Activa') enrollmentBuckets[clamped] += 1
    }
    const matriculaVals = enrollmentBuckets.map((c) => Math.max(1, c))

    return { revenueSeries: revenueVals, matriculaSeries: matriculaVals }
  }, [enrollments, payments])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Estudiantes"
          value={kpis.students.toLocaleString('es-CO')}
          sublabel="Crecimiento mensual simulado"
          accent
        />
        <KpiCard
          label="Ingresos"
          value={formatCOP(kpis.revenue)}
          sublabel="Últimos 30 días (mock)"
        />
        <KpiCard label="Cursos" value={String(kpis.courses)} sublabel="Activos en agenda" />
        <KpiCard label="Sedes" value={String(kpis.locations)} sublabel="Medellín · Bogotá · Virtual" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Ingresos por semana</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Serie mock con acento amarillo</p>
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
              <p className="mt-1 text-xs text-[var(--muted)]">Volumen simulado por cohorte</p>
            </div>
            <Badge tone="neutral">Mock</Badge>
          </div>
          <div className="mt-3">
            <BarChart values={matriculaSeries} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Última cohorte: 46</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={14} />
              actualizando...
            </span>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Actividad reciente</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Eventos recientes del sistema (mock)</p>
          </div>
          <Badge tone="accent">Ahora</Badge>
        </div>

        <div className="mt-3 divide-y divide-[var(--border)]">
          {recentActivity.map((a) => (
            <div key={a.id} className="flex items-start gap-3 py-3">
              <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-xl border border-[rgba(251,191,36,0.35)] bg-[rgba(254,243,199,0.65)]">
                {iconForKind(a.kind)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">{a.title}</p>
                  <span className="shrink-0 text-xs text-[var(--subtle)]">{formatDate(a.createdAt)}</span>
                </div>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">{a.detail}</p>
                <div className="mt-2">
                  <Badge tone={a.kind === 'Pago' ? 'warning' : a.kind === 'Matrícula' ? 'success' : 'neutral'}>
                    {a.kind}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

