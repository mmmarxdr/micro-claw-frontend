import { useState, useMemo } from 'react'

export interface LiminalBarChartProps {
  /** X-axis labels — one per bar */
  labels: string[]
  /** Bar values — same length as labels */
  values: number[]
  /** Display name shown in the legend + tooltip */
  seriesName?: string
  /** Bar color (default 'var(--accent)') */
  color?: string
  /** Chart height in pixels (default 200) */
  height?: number
  /** Format a value for tooltip + Y-axis (default: number → string) */
  formatValue?: (n: number) => string
  /** Number of horizontal grid lines (default 3) */
  gridLines?: number
}

/**
 * Liminal-styled bar chart, single series. Pure SVG so it shares the visual
 * language with LiminalAreaChart and the rest of the dashboard.
 *
 * Bars are inset (gap between them = 30% of slot) for a quieter look. Hovering
 * a bar lifts its opacity and shows a tooltip with the formatted value.
 */
export function LiminalBarChart({
  labels,
  values,
  seriesName = 'value',
  color = 'var(--accent)',
  height = 200,
  formatValue = (n) => String(Math.round(n)),
  gridLines = 3,
}: LiminalBarChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const padding = { top: 14, right: 14, bottom: 24, left: 44 }
  const innerHeight = height - padding.top - padding.bottom

  const maxValue = useMemo(() => {
    let m = 0
    for (const v of values) if (v > m) m = v
    return m === 0 ? 1 : m
  }, [values])

  const W = 1000
  const innerWidth = W - padding.left - padding.right
  const slotWidth = labels.length > 0 ? innerWidth / labels.length : 0
  const barWidth = Math.max(2, slotWidth * 0.7)

  const yTicks = useMemo(() => {
    const ticks: number[] = []
    for (let i = 0; i <= gridLines; i++) {
      ticks.push((maxValue * i) / gridLines)
    }
    return ticks
  }, [maxValue, gridLines])

  const xTickIndices = useMemo(() => {
    if (labels.length <= 7) return labels.map((_, i) => i)
    const indices = new Set<number>()
    indices.add(0)
    indices.add(labels.length - 1)
    const step = Math.floor(labels.length / 6)
    for (let i = step; i < labels.length - step; i += step) indices.add(i)
    return Array.from(indices).sort((a, b) => a - b)
  }, [labels])

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Legend (mono uppercase) */}
      <div
        className="font-mono"
        style={{
          display: 'flex',
          gap: 16,
          fontSize: 10.5,
          color: 'var(--ink-muted)',
          letterSpacing: 0.7,
          marginBottom: 8,
          textTransform: 'uppercase',
        }}
      >
        <span className="inline-flex items-center" style={{ gap: 6 }}>
          <span
            style={{
              width: 9,
              height: 9,
              background: color,
              display: 'inline-block',
              borderRadius: 1,
            }}
          />
          {seriesName}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Y-axis gridlines + labels */}
        {yTicks.map((t, i) => {
          const y = padding.top + innerHeight - (t / maxValue) * innerHeight
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={W - padding.right}
                y1={y}
                y2={y}
                stroke="var(--line)"
                strokeDasharray={i === 0 ? '0' : '2 4'}
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                style={{
                  fill: 'var(--ink-muted)',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {formatValue(t)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {values.map((v, i) => {
          const barHeight = (v / maxValue) * innerHeight
          const x = padding.left + i * slotWidth + (slotWidth - barWidth) / 2
          const y = padding.top + innerHeight - barHeight
          const isHover = hoverIdx === i
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
              fillOpacity={isHover ? 1 : 0.78}
              rx={1.5}
              onMouseEnter={() => setHoverIdx(i)}
              style={{ cursor: 'pointer', transition: 'fill-opacity 0.12s' }}
            />
          )
        })}

        {/* X-axis labels (sparse) */}
        {xTickIndices.map((i) => (
          <text
            key={i}
            x={padding.left + i * slotWidth + slotWidth / 2}
            y={height - 6}
            textAnchor="middle"
            style={{
              fill: 'var(--ink-muted)',
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {labels[i]}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && (
        <BarTooltip
          x={(padding.left + hoverIdx * slotWidth + slotWidth / 2) / W}
          label={labels[hoverIdx] ?? ''}
          color={color}
          name={seriesName}
          value={formatValue(values[hoverIdx] ?? 0)}
        />
      )}
    </div>
  )
}

function BarTooltip({
  x,
  label,
  color,
  name,
  value,
}: {
  x: number
  label: string
  color: string
  name: string
  value: string
}) {
  const align = x < 0.2 ? 'start' : x > 0.8 ? 'end' : 'center'
  const transform =
    align === 'start' ? 'translate(0, 0)' : align === 'end' ? 'translate(-100%, 0)' : 'translate(-50%, 0)'

  return (
    <div
      style={{
        position: 'absolute',
        top: 28,
        left: `${x * 100}%`,
        transform,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line-strong)',
        borderRadius: 6,
        padding: '8px 12px',
        pointerEvents: 'none',
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        zIndex: 5,
        minWidth: 120,
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          color: 'var(--ink-muted)',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        className="flex items-center justify-between"
        style={{ gap: 16, fontSize: 12, color: 'var(--ink)' }}
      >
        <span className="inline-flex items-center" style={{ gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: color,
              display: 'inline-block',
            }}
          />
          <span style={{ color: 'var(--ink-soft)' }}>{name}</span>
        </span>
        <span className="font-mono" style={{ fontWeight: 500 }}>
          {value}
        </span>
      </div>
    </div>
  )
}
