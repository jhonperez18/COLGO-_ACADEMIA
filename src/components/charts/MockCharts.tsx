import { cn } from '../../utils/cn'

export function LineChart({
  values,
  className,
}: {
  values: number[]
  className?: string
}) {
  const w = 520
  const h = 190
  const pad = 18

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)

  const toX = (i: number) => pad + (i * (w - pad * 2)) / (values.length - 1)
  const toY = (v: number) => {
    const t = (v - min) / range
    return h - pad - t * (h - pad * 2)
  }

  const points = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')
  const lastX = toX(values.length - 1)
  const lastY = toY(values[values.length - 1])

  return (
    <div className={cn('relative w-full', className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[190px] w-full">
        <defs>
          <linearGradient id="lineGlow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="rgba(251,191,36,0.9)" />
            <stop offset="1" stopColor="rgba(251,191,36,0.35)" />
          </linearGradient>
          <linearGradient id="fillArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(251,191,36,0.22)" />
            <stop offset="1" stopColor="rgba(251,191,36,0.02)" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((i) => {
          const y = pad + (i * (h - pad * 2)) / 3
          return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(15,23,42,0.08)" />
        })}

        <polyline points={points} fill="none" stroke="url(#lineGlow)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        <path
          d={`M ${pad} ${h - pad} L ${points.replaceAll(',', ' ')} L ${w - pad} ${h - pad} Z`}
          fill="url(#fillArea)"
          opacity="0.85"
        />

        <circle cx={lastX} cy={lastY} r="5.5" fill="rgba(251,191,36,0.95)" />
        <circle cx={lastX} cy={lastY} r="10" fill="rgba(251,191,36,0.12)" />
      </svg>
    </div>
  )
}

export function BarChart({
  values,
  className,
}: {
  values: number[]
  className?: string
}) {
  const max = Math.max(...values, 1)

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-3">
        {values.map((v, idx) => {
          const hPct = (v / max) * 100
          const height = Math.max(8, hPct)
          return (
            <div key={idx} className="flex-1">
              <div
                className="mx-auto w-full rounded-xl border bg-[var(--panel-2)]"
                style={{
                  height: `${height}%`,
                  borderColor: 'rgba(15,23,42,0.08)',
                }}
              >
                <div
                  className="h-full w-full rounded-xl"
                  style={{
                    background: `linear-gradient(180deg, rgba(251,191,36,0.45) 0%, rgba(251,191,36,0.08) 100%)`,
                    clipPath: 'inset(0 0 0 0 round 12px)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

