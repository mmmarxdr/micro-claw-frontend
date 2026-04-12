import { useStatus, useMetrics, useMemory, useConfig } from '../hooks/useApi'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { cn } from '../lib/utils'

function StatCard({
  label,
  value,
  sub,
  mono = false,
  loading = false,
  error = false,
}: {
  label: string
  value: string | number
  sub?: string
  mono?: boolean
  loading?: boolean
  error?: boolean
}) {
  return (
    <Card>
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">{label}</p>
      {loading ? (
        <div className="h-7 w-24 animate-pulse bg-hover-surface rounded" />
      ) : error ? (
        <p className="text-sm text-error">Failed to load</p>
      ) : (
        <>
          <p className={cn('text-xl font-semibold text-text-primary', mono && 'font-mono')}>{value}</p>
          {sub && <p className="text-xs text-text-secondary mt-1">{sub}</p>}
        </>
      )}
    </Card>
  )
}

function StatusCard() {
  const { data, isLoading, isError } = useStatus()

  const variantMap: Record<string, 'success' | 'default' | 'error'> = {
    running: 'success',
    idle:    'default',
    error:   'error',
  }

  const dotColor: Record<string, string> = {
    running: 'bg-success',
    idle:    'bg-text-disabled',
    error:   'bg-error',
  }

  return (
    <Card>
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
        Agent Status
      </p>
      {isLoading ? (
        <div className="h-6 w-20 animate-pulse bg-hover-surface rounded" />
      ) : isError ? (
        <p className="text-sm text-error">Failed to load</p>
      ) : (
        <div className="flex items-center gap-2">
          <span
            className={cn('w-2 h-2 rounded-full shrink-0',
              dotColor[data?.status ?? 'idle'] ?? 'bg-text-disabled'
            )}
          />
          <Badge variant={variantMap[data?.status ?? 'idle'] ?? 'default'}>
            {data?.status ?? 'unknown'}
          </Badge>
          {data?.uptime_seconds != null && (
            <span className="text-xs text-text-secondary font-mono ml-auto">
              up {Math.floor(data.uptime_seconds / 3600)}h{' '}
              {Math.floor((data.uptime_seconds % 3600) / 60)}m
            </span>
          )}
        </div>
      )}
    </Card>
  )
}

function QuotaBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = Math.min((spent / budget) * 100, 100)
  const isWarning = pct >= 80
  const isOver    = pct >= 100

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Monthly budget</span>
        <span className={cn(
          'text-sm font-mono font-semibold',
          isOver ? 'text-error' : isWarning ? 'text-warning' : 'text-text-primary'
        )}>
          ${spent.toFixed(2)} / ${budget.toFixed(2)}
          <span className="text-text-secondary font-normal ml-1">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="w-full h-1.5 bg-hover-surface rounded-full overflow-hidden border border-border">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isOver ? 'bg-error' : isWarning ? 'bg-warning' : 'bg-accent'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isWarning && !isOver && (
        <p className="text-xs text-warning mt-1.5">Approaching monthly budget limit.</p>
      )}
      {isOver && (
        <p className="text-xs text-error mt-1.5">Monthly budget exceeded.</p>
      )}
    </div>
  )
}

export function OverviewPage() {
  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useMetrics()
  const { data: memory } = useMemory('')
  const { data: config } = useConfig()
  const budget = (config as any)?.limits?.monthly_budget_usd ?? 0

  const fmtCost = (usd: number) => `$${usd.toFixed(4)}`
  const fmtTokens = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

  return (
    <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-text-primary">Overview</h1>
        <p className="text-sm text-text-secondary mt-1">Agent health and usage at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusCard />

        <StatCard
          label="Cost today"
          value={metrics ? fmtCost(metrics.today.cost_usd) : '—'}
          mono
          loading={metricsLoading}
          error={metricsError}
        />
        <StatCard
          label="Cost this month"
          value={metrics ? fmtCost(metrics.month.cost_usd) : '—'}
          mono
          loading={metricsLoading}
          error={metricsError}
        />
        <StatCard
          label="Tokens today"
          value={
            metrics
              ? fmtTokens(metrics.today.input_tokens + metrics.today.output_tokens)
              : '—'
          }
          sub={
            metrics
              ? `↑ ${fmtTokens(metrics.today.input_tokens)} in  ↓ ${fmtTokens(metrics.today.output_tokens)} out`
              : undefined
          }
          mono
          loading={metricsLoading}
          error={metricsError}
        />
        <StatCard
          label="Conversations today"
          value={metrics?.today.conversations ?? '—'}
          loading={metricsLoading}
          error={metricsError}
        />
        <StatCard
          label="Messages today"
          value={metrics?.today.messages ?? '—'}
          loading={metricsLoading}
          error={metricsError}
        />
        <StatCard
          label="Memory entries"
          value={memory?.items.length ?? '—'}
        />
        <StatCard
          label="Active model"
          value={(config as any)?.provider?.model ?? '—'}
          sub={(config as any)?.provider?.type ?? 'configure in Settings'}
        />
      </div>

      {budget > 0 && metrics && (
        <QuotaBar spent={metrics.month.cost_usd} budget={budget} />
      )}
    </div>
  )
}
