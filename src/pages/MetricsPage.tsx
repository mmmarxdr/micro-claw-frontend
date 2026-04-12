import React from 'react'
import { AreaChart, BarChart } from '@tremor/react'
import { useMetricsHistory, useMetrics } from '../hooks/useApi'
import { Card } from '../components/ui/Card'
import { cn } from '../lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtCost(usd: number): string {
  return `$${usd.toFixed(4)}`
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <Card>
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className="text-xl font-semibold font-mono text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-secondary mt-1">{sub}</p>}
    </Card>
  )
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('', className)}>
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      {children}
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MetricsPage() {
  const { data: history30, isLoading: histLoading } = useMetricsHistory(30)
  const { data: metrics } = useMetrics()

  const history = history30?.history ?? []

  // Derived summary
  const totalTokens = history.reduce(
    (s, d) => s + d.input_tokens + d.output_tokens,
    0,
  )
  const totalCost = history.reduce((s, d) => s + d.cost_usd, 0)
  const avgCost = history.length > 0 ? totalCost / history.length : 0

  // Chart data transforms
  const tokenData = history.map((d) => ({
    date: fmtDate(d.date),
    'Input tokens': d.input_tokens,
    'Output tokens': d.output_tokens,
  }))

  const costData = history.map((d) => ({
    date: fmtDate(d.date),
    'Cost (USD)': parseFloat(d.cost_usd.toFixed(6)),
  }))


  // ─── Loading skeleton ────────────────────────────────────────────────────

  if (histLoading) {
    return (
      <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1200px] mx-auto space-y-4">
        <div className="h-7 w-48 animate-pulse bg-hover-surface rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {['a', 'b', 'c'].map((k) => (
            <div key={k} className="h-24 animate-pulse bg-surface rounded-md border border-border" />
          ))}
        </div>
        <div className="h-64 animate-pulse bg-surface rounded-md border border-border" />
        <div className="h-64 animate-pulse bg-surface rounded-md border border-border" />
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-text-primary">Metrics</h1>
        <p className="text-sm text-text-secondary mt-1">
          Historical token usage and cost breakdown.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="Total tokens (30d)"
          value={fmtTokens(totalTokens)}
          sub={`Today: ${fmtTokens(
            (metrics?.today.input_tokens ?? 0) + (metrics?.today.output_tokens ?? 0),
          )}`}
        />
        <SummaryCard
          label="Total cost (30d)"
          value={fmtCost(totalCost)}
          sub={`Today: ${fmtCost(metrics?.today.cost_usd ?? 0)}`}
        />
        <SummaryCard
          label="Avg cost / day"
          value={fmtCost(avgCost)}
          sub={`${history.length} days of data`}
        />
      </div>

      {history.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-sm text-text-secondary">No historical data yet.</p>
          <p className="text-xs text-text-disabled mt-1">
            Data accumulates as the agent processes messages.
          </p>
        </Card>
      ) : (
        <>
          {/* Token usage AreaChart — emerald only */}
          <ChartCard title="Token Usage — Last 30 Days">
            <AreaChart
              data={tokenData}
              index="date"
              categories={['Input tokens', 'Output tokens']}
              colors={['emerald', 'stone']}
              showLegend
              showGridLines={false}
              className="h-52"
              valueFormatter={fmtTokens}
            />
          </ChartCard>

          {/* Cost BarChart — emerald only */}
          <ChartCard title="Daily Cost — Last 30 Days">
            <BarChart
              data={costData}
              index="date"
              categories={['Cost (USD)']}
              colors={['emerald']}
              showGridLines={false}
              className="h-52"
              valueFormatter={(v: number) => `$${v.toFixed(4)}`}
            />
          </ChartCard>

          {/* Bottom row: upcoming charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Model Breakdown">
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-sm text-text-secondary">Coming soon</p>
                <p className="text-xs text-text-disabled mt-1">
                  Per-model usage breakdown will appear in a future update.
                </p>
              </div>
            </ChartCard>

            <ChartCard title="Conversations — Last 14 Days">
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-sm text-text-secondary">Coming soon</p>
                <p className="text-xs text-text-disabled mt-1">
                  Per-day conversation counts will appear in a future update.
                </p>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
