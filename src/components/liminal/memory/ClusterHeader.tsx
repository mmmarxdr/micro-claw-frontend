import type { Cluster } from '../../../design/memoryMocks'

interface ClusterMeta {
  label: string
  daimon: string
}

export const CLUSTER_META: Record<Cluster, ClusterMeta> = {
  identity:      { label: 'Identity',      daimon: 'who you are to me' },
  preferences:   { label: 'Preferences',   daimon: 'how you like things' },
  projects:      { label: 'Projects',      daimon: 'what we are building together' },
  relationships: { label: 'Relationships', daimon: 'the people around you' },
  technical:     { label: 'Technical',     daimon: 'your tools and terrain' },
}

interface ClusterHeaderProps {
  cluster: Cluster
  count: number
}

export function ClusterHeader({ cluster, count }: ClusterHeaderProps) {
  const meta = CLUSTER_META[cluster] ?? { label: cluster, daimon: cluster }
  return (
    <div
      className="flex items-baseline"
      style={{ gap: 12, margin: '28px 0 14px', padding: '0 2px' }}
    >
      <h3
        className="font-serif"
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 500,
          color: 'var(--ink)',
          letterSpacing: -0.3,
        }}
      >
        {meta.label}
      </h3>
      <span
        className="font-serif italic"
        style={{ fontSize: 13, color: 'var(--ink-muted)' }}
      >
        — {meta.daimon}
      </span>
      <span
        className="flex-1 self-center"
        style={{ height: 1, background: 'var(--line)', marginTop: 2 }}
      />
      <span
        className="font-mono"
        style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}
      >
        {count} {count === 1 ? 'thing' : 'things'} I know
      </span>
    </div>
  )
}
