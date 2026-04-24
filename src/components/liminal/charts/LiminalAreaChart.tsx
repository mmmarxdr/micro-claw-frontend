import { useState, useMemo } from 'react'

export interface AreaSeries {
  /** Display name (shown in tooltip + header) */
  name: string
  /** One value per data point, same length as `labels` */
  values: number[]
  /** CSS color reference (e.g. 'var(--accent)') */
  color: string
  /** Stroke opacity 0–1 (default 1) */
  strokeOpacity?: number
  /** Fill opacity 0–1 (default 0.18) */
  fillOpacity?: number
}

export interface LiminalAreaChartProps {
  /** X-axis labels — one per data point */
  labels: string[]
  /** One or more series. Multiple series stack on top of each other. */
  series: AreaSeries[]
  /** Chart height in pixels (default 200) */
  height?: number
  /** Format a value for tooltip + Y-axis (default: number → string) */
  formatValue?: (n: number) => string
  /** Number of horizontal grid lines (default 3) */
  gridLines?: number
}

/**
 * Liminal-styled area chart with smooth fills and mono labels.
 * Pure SVG, no external chart lib — fits the editorial aesthetic and avoids
 * the legend-in-white / black-on-black mess Tremor produces in dark mode.
 *
 * Tooltip appears above the hovered column with values for every series at
 * that x coordinate. Click is a no-op (charts are read-only here).
 */
export function LiminalAreaChart({
  labels,
  series,
  height = 200,
  formatValue = (n) => String(Math.round(n)),
  gridLines = 3,
}: LiminalAreaChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const padding = { top: 14, right: 14, bottom: 24, left: 44 }
  const innerHeight = height - padding.top - padding.bottom

  // Find the max stacked value across all points so the y-axis fits.
  const maxValue = useMemo(() => {
    let m = 0
    for (let i = 0; i < labels.length; i++) {
      let stack = 0
      for (const s of series) stack += s.values[i] ?? 0
      if (stack > m) m = stack
    }
    return m === 0 ? 1 : m
  }, [labels, series])

  // Build path strings for each series (stacked: each on top of previous).
  // We compute in viewBox coordinates with width=1000 so the SVG scales.
  const W = 1000
  const innerWidth = W - padding.left - padding.right
  const stepX = labels.length > 1 ? innerWidth / (labels.length - 1) : 0

  const stackHeights: number[] = new Array(labels.length).fill(0)

  const paths = series.map((s) => {
    const top: { x: number; y: number }[] = []
    const bottom: { x: number; y: number }[] = []
    for (let i = 0; i < labels.length; i++) {
      const v = s.values[i] ?? 0
      const baseY = padding.top + innerHeight - (stackHeights[i] / maxValue) * innerHeight
      const topY = padding.top + innerHeight - ((stackHeights[i] + v) / maxValue) * innerHeight
      const x = padding.left + i * stepX
      top.push({ x, y: topY })
      bottom.push({ x, y: baseY })
      stackHeights[i] += v
    }
    const lineD = top.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
    const areaD =
      lineD +
      ' ' +
      bottom
        .slice()
        .reverse()
        .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(' ') +
      ' Z'
    return { lineD, areaD, color: s.color, strokeOpacity: s.strokeOpacity ?? 1, fillOpacity: s.fillOpacity ?? 0.18 }
  })

  // Y-axis tick values
  const yTicks = useMemo(() => {
    const ticks: number[] = []
    for (let i = 0; i <= gridLines; i++) {
      ticks.push((maxValue * i) / gridLines)
    }
    return ticks
  }, [maxValue, gridLines])

  // Sparse x-axis labels — show first, last, and a few in between for readability.
  const xTickIndices = useMemo(() => {
    if (labels.length <= 7) return labels.map((_, i) => i)
    const indices = new Set<number>()
    indices.add(0)
    indices.add(labels.length - 1)
    const step = Math.floor(labels.length / 6)
    for (let i = step; i < labels.length - step; i += step) indices.add(i)
    return Array.from(indices).sort((a, b) => a - b)
  }, [labels])

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const xRatio = (e.clientX - rect.left) / rect.width
    const xView = xRatio * W
    const xRel = xView - padding.left
    if (xRel < 0 || xRel > innerWidth || labels.length === 0) {
      setHoverIdx(null)
      return
    }
    const idx = Math.round(xRel / Math.max(stepX, 1))
    setHoverIdx(Math.max(0, Math.min(labels.length - 1, idx)))
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Series legend (mono uppercase, top-left) */}
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
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center" style={{ gap: 6 }}>
            <span
              style={{
                width: 9,
                height: 2,
                background: s.color,
                display: 'inline-block',
              }}
            />
            {s.name}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block', overflow: 'visible' }}
        onMouseMove={handleMouseMove}
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

        {/* Stacked areas (drawn back-to-front) */}
        {paths.map((p, i) => (
          <g key={i}>
            <path d={p.areaD} fill={p.color} fillOpacity={p.fillOpacity} stroke="none" />
            <path
              d={p.lineD}
              fill="none"
              stroke={p.color}
              strokeOpacity={p.strokeOpacity}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}

        {/* Hover guide line + dots */}
        {hoverIdx !== null && (
          <g>
            <line
              x1={padding.left + hoverIdx * stepX}
              x2={padding.left + hoverIdx * stepX}
              y1={padding.top}
              y2={padding.top + innerHeight}
              stroke="var(--ink-muted)"
              strokeWidth={1}
              strokeOpacity={0.35}
            />
            {(() => {
              let acc = 0
              return series.map((s, i) => {
                acc += s.values[hoverIdx] ?? 0
                const y = padding.top + innerHeight - (acc / maxValue) * innerHeight
                return (
                  <circle
                    key={i}
                    cx={padding.left + hoverIdx * stepX}
                    cy={y}
                    r={3}
                    fill={s.color}
                    stroke="var(--bg)"
                    strokeWidth={1.5}
                  />
                )
              })
            })()}
          </g>
        )}

        {/* X-axis labels (sparse) */}
        {xTickIndices.map((i) => (
          <text
            key={i}
            x={padding.left + i * stepX}
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

      {/* Tooltip card (positioned above the hovered point) */}
      {hoverIdx !== null && (
        <ChartTooltip
          x={(padding.left + hoverIdx * stepX) / W}
          label={labels[hoverIdx] ?? ''}
          rows={series.map((s) => ({
            color: s.color,
            name: s.name,
            value: formatValue(s.values[hoverIdx] ?? 0),
          }))}
        />
      )}
    </div>
  )
}

/**
 * Floating tooltip card. `x` is a 0–1 ratio of the chart width.
 * Positioned via percentage so it scales with the SVG.
 */
function ChartTooltip({
  x,
  label,
  rows,
}: {
  x: number
  label: string
  rows: { color: string; name: string; value: string }[]
}) {
  // Anchor based on x: keep tooltip inside the visible area.
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
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-center justify-between"
          style={{ gap: 16, fontSize: 12, color: 'var(--ink)' }}
        >
          <span className="inline-flex items-center" style={{ gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: r.color,
                display: 'inline-block',
              }}
            />
            <span style={{ color: 'var(--ink-soft)' }}>{r.name}</span>
          </span>
          <span className="font-mono" style={{ fontWeight: 500 }}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}
