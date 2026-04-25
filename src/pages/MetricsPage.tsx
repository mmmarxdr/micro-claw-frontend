import { type CSSProperties } from 'react'
import { useMetricsHistory, useMetrics, useSystemMetrics } from '../hooks/useApi'
import { LiminalGlyph } from '../components/liminal/LiminalGlyph'
import { LiminalAreaChart } from '../components/liminal/charts/LiminalAreaChart'
import { LiminalBarChart } from '../components/liminal/charts/LiminalBarChart'
import { formatUSD, formatTokens } from '../lib/format'

// ─── Byte / time formatters ──────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`
  if (sec < 86400) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return `${h}h ${m}m`
  }
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  return `${d}d ${h}h`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Card primitives (shared with OverviewPage style) ────────────────────────

const cardBaseStyle: CSSProperties = {
  background: 'var(--bg-elev)',
  border: '1px solid var(--line)',
  borderRadius: 6,
  padding: '18px 20px',
}

const labelStyle: CSSProperties = {
  fontSize: 10.5,
  letterSpacing: 1,
  color: 'var(--ink-muted)',
  textTransform: 'uppercase',
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div style={cardBaseStyle}>
      <div className="font-mono" style={labelStyle}>
        {label}
      </div>
      <div
        className="font-mono"
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: 'var(--ink)',
          lineHeight: 1.1,
          marginTop: 10,
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          className="font-serif italic"
          style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 4 }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ ...cardBaseStyle, padding: '20px 22px 22px' }}>
      <div style={{ marginBottom: 14 }}>
        <div
          className="font-serif"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ink)',
            letterSpacing: -0.2,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="font-serif italic"
            style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyCard({ title, hint }: { title: string; hint: string }) {
  return (
    <div
      style={{
        ...cardBaseStyle,
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <p
        className="font-serif italic"
        style={{ fontSize: 14, color: 'var(--ink-muted)', margin: 0 }}
      >
        {title}
      </p>
      <p
        className="font-mono"
        style={{
          fontSize: 11,
          color: 'var(--ink-faint)',
          marginTop: 6,
          letterSpacing: 0.5,
        }}
      >
        {hint}
      </p>
    </div>
  )
}

// ─── Meter primitives ────────────────────────────────────────────────────────

function Meter({
  value,
  max,
  format,
  toneAt,
}: {
  value: number
  max: number
  format: (v: number, m: number) => string
  toneAt?: { warn: number; alarm: number } // percentages
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const tone =
    toneAt && pct >= toneAt.alarm
      ? 'var(--red)'
      : toneAt && pct >= toneAt.warn
        ? 'var(--amber)'
        : 'var(--accent)'
  return (
    <div>
      <div
        className="font-mono"
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--ink)',
          lineHeight: 1.1,
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        {format(value, max)}
      </div>
      <div
        style={{
          height: 4,
          background: 'color-mix(in srgb, var(--ink-faint) 25%, transparent)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: tone,
            transition: 'width 320ms ease, background 220ms ease',
          }}
        />
      </div>
    </div>
  )
}

function MeterCard({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div style={cardBaseStyle}>
      <div className="font-mono" style={labelStyle}>
        {label}
      </div>
      {children}
      {hint && (
        <div
          className="font-serif italic"
          style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 6 }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

function StorageBreakdownCard({
  store,
  audit,
  skills,
  total,
}: {
  store: number
  audit: number
  skills: number
  total: number
}) {
  const segments = [
    { label: 'store',  value: store,  color: 'var(--accent)' },
    { label: 'audit',  value: audit,  color: 'color-mix(in srgb, var(--accent) 60%, var(--ink-muted))' },
    { label: 'skills', value: skills, color: 'var(--ink-muted)' },
  ]
  return (
    <div style={{ ...cardBaseStyle, padding: '20px 22px' }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 14 }}>
        <div className="font-mono" style={labelStyle}>
          STORAGE FOOTPRINT
        </div>
        <div
          className="font-mono"
          style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}
        >
          {formatBytes(total)}
        </div>
      </div>
      <div
        className="flex"
        style={{
          height: 8,
          borderRadius: 3,
          overflow: 'hidden',
          background: 'color-mix(in srgb, var(--ink-faint) 25%, transparent)',
          marginBottom: 12,
        }}
      >
        {segments.map((s) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0
          if (pct < 0.1) return null
          return (
            <div
              key={s.label}
              style={{ width: `${pct}%`, background: s.color, transition: 'width 320ms ease' }}
              title={`${s.label}: ${formatBytes(s.value)}`}
            />
          )
        })}
      </div>
      <div className="flex" style={{ gap: 18, flexWrap: 'wrap' }}>
        {segments.map((s) => (
          <div key={s.label} className="flex items-center" style={{ gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span
              className="font-mono"
              style={{ fontSize: 10.5, letterSpacing: 0.5, color: 'var(--ink-muted)', textTransform: 'uppercase' }}
            >
              {s.label}
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}
            >
              {formatBytes(s.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MetricsPage() {
  const { data: history30, isLoading: histLoading } = useMetricsHistory(30)
  const { data: metrics } = useMetrics()
  const { data: sys } = useSystemMetrics()

  const history = history30?.history ?? []

  const totalTokens = history.reduce(
    (s, d) => s + d.input_tokens + d.output_tokens,
    0,
  )
  const totalCost = history.reduce((s, d) => s + d.cost_usd, 0)
  // Average over days that actually had activity, not the full 30-day window
  // (which would dilute the signal if the agent has only been used recently).
  const activeDays = history.filter((d) => d.input_tokens + d.output_tokens > 0).length
  const avgCost = activeDays > 0 ? totalCost / activeDays : 0

  const labels = history.map((d) => fmtDate(d.date))
  const inputSeries = history.map((d) => d.input_tokens)
  const outputSeries = history.map((d) => d.output_tokens)
  const costSeries = history.map((d) => d.cost_usd)

  return (
    <div
      style={{
        padding: '28px 32px 40px',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {/* Preamble */}
      <div style={{ marginBottom: 28 }}>
        <div className="flex items-baseline" style={{ gap: 14, marginBottom: 6 }}>
          <LiminalGlyph size={20} animate />
          <h1
            className="font-serif"
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 500,
              color: 'var(--ink)',
              letterSpacing: -0.6,
            }}
          >
            <span className="italic" style={{ color: 'var(--accent)', fontWeight: 400 }}>
              what I've been costing
            </span>
            <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>&nbsp;·&nbsp;</span>
            <span>last 30 days</span>
          </h1>
        </div>
        <p
          className="font-serif italic"
          style={{
            fontSize: 14.5,
            color: 'var(--ink-soft)',
            maxWidth: 640,
            lineHeight: 1.55,
            marginLeft: 34,
            marginTop: 0,
          }}
        >
          tokens flow in, tokens flow out, dollars get spent — here's the shape
          of it over time.
        </p>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <SummaryCard
          label="TOTAL TOKENS · 30D"
          value={formatTokens(totalTokens)}
          hint={`today: ${formatTokens(
            (metrics?.today.input_tokens ?? 0) + (metrics?.today.output_tokens ?? 0),
          )}`}
        />
        <SummaryCard
          label="TOTAL COST · 30D"
          value={formatUSD(totalCost)}
          hint={`today: ${formatUSD(metrics?.today.cost_usd ?? 0)}`}
        />
        <SummaryCard
          label="AVG COST / ACTIVE DAY"
          value={formatUSD(avgCost)}
          hint={`${activeDays} day${activeDays === 1 ? '' : 's'} of activity`}
        />
      </div>

      {/* Loading skeleton */}
      {histLoading && (
        <div
          style={{
            ...cardBaseStyle,
            height: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p className="font-serif italic" style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
            gathering the days…
          </p>
        </div>
      )}

      {/* Empty state */}
      {!histLoading && totalTokens === 0 && (
        <EmptyCard
          title="no history yet."
          hint="data accumulates as we exchange messages."
        />
      )}

      {/* Charts */}
      {!histLoading && totalTokens > 0 && (
        <div className="flex flex-col" style={{ gap: 14 }}>
          <ChartCard title="Token usage" subtitle="input + output, stacked, day by day">
            <LiminalAreaChart
              labels={labels}
              series={[
                {
                  name: 'output',
                  values: outputSeries,
                  color: 'var(--ink-soft)',
                  fillOpacity: 0.10,
                },
                {
                  name: 'input',
                  values: inputSeries,
                  color: 'var(--accent)',
                  fillOpacity: 0.16,
                },
              ]}
              height={220}
              formatValue={formatTokens}
            />
          </ChartCard>

          <ChartCard title="Daily cost" subtitle="USD spent per day">
            <LiminalBarChart
              labels={labels}
              values={costSeries}
              seriesName="cost"
              color="var(--accent)"
              height={200}
              formatValue={(n) => formatUSD(n)}
            />
          </ChartCard>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            <EmptyCard
              title="model breakdown"
              hint="per-model usage — coming soon"
            />
            <EmptyCard
              title="conversations"
              hint="daily conversation counts — coming soon"
            />
          </div>
        </div>
      )}

      {/* ─── System pulse ─── */}
      {sys && (
        <div style={{ marginTop: 36 }}>
          <div className="flex items-baseline" style={{ gap: 14, marginBottom: 6 }}>
            <LiminalGlyph size={16} animate={false} />
            <h2
              className="font-serif"
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 500,
                color: 'var(--ink)',
                letterSpacing: -0.4,
              }}
            >
              <span className="italic" style={{ color: 'var(--accent)', fontWeight: 400 }}>
                system pulse
              </span>
              <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>&nbsp;·&nbsp;</span>
              <span>now</span>
            </h2>
          </div>
          <p
            className="font-serif italic"
            style={{
              fontSize: 13.5,
              color: 'var(--ink-soft)',
              maxWidth: 560,
              lineHeight: 1.55,
              marginLeft: 30,
              marginTop: 0,
              marginBottom: 18,
            }}
          >
            the agent's pulse — and the machine it lives on.
          </p>

          {/* Process row */}
          <div
            className="font-mono"
            style={{
              ...labelStyle,
              fontSize: 9.5,
              letterSpacing: 1,
              marginBottom: 8,
              marginLeft: 2,
            }}
          >
            DAIMON PROCESS
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <MeterCard label="MEMORY (RSS)" hint={`heap: ${formatBytes(sys.process.heap_alloc_bytes)}`}>
              <div
                className="font-mono"
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                  marginTop: 10,
                }}
              >
                {formatBytes(sys.process.rss_bytes)}
              </div>
            </MeterCard>
            <MeterCard label="CPU (PROCESS)" hint={`${sys.process.goroutines} goroutines`}>
              <div
                className="font-mono"
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                  marginTop: 10,
                }}
              >
                {sys.process.cpu_percent.toFixed(1)}%
              </div>
            </MeterCard>
            <MeterCard label="UPTIME" hint={`gc pause: ${sys.process.gc_pause_ms.toFixed(2)}ms`}>
              <div
                className="font-mono"
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                  marginTop: 10,
                }}
              >
                {formatUptime(sys.process.uptime_sec)}
              </div>
            </MeterCard>
          </div>

          {/* Host row */}
          <div
            className="font-mono"
            style={{
              ...labelStyle,
              fontSize: 9.5,
              letterSpacing: 1,
              marginBottom: 8,
              marginLeft: 2,
            }}
          >
            HOST MACHINE
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <MeterCard label="CPU" hint={`${sys.host.cpu_cores} core${sys.host.cpu_cores === 1 ? '' : 's'}`}>
              <Meter
                value={sys.host.cpu_percent}
                max={100}
                format={(v) => `${v.toFixed(1)}%`}
                toneAt={{ warn: 70, alarm: 90 }}
              />
            </MeterCard>
            <MeterCard
              label="MEMORY"
              hint={`${formatBytes(sys.host.mem_total_bytes - sys.host.mem_used_bytes)} free`}
            >
              <Meter
                value={sys.host.mem_used_bytes}
                max={sys.host.mem_total_bytes}
                format={(v, m) => `${formatBytes(v)} / ${formatBytes(m)}`}
                toneAt={{ warn: 75, alarm: 92 }}
              />
            </MeterCard>
            <MeterCard
              label="DISK"
              hint={sys.host.disk_mountpoint ?? undefined}
            >
              <Meter
                value={sys.host.disk_used_bytes}
                max={sys.host.disk_total_bytes}
                format={(v, m) => `${formatBytes(v)} / ${formatBytes(m)}`}
                toneAt={{ warn: 80, alarm: 95 }}
              />
            </MeterCard>
          </div>

          {/* Storage breakdown */}
          <StorageBreakdownCard
            store={sys.storage.store_bytes}
            audit={sys.storage.audit_bytes}
            skills={sys.storage.skills_bytes}
            total={sys.storage.total_bytes}
          />
        </div>
      )}
    </div>
  )
}
