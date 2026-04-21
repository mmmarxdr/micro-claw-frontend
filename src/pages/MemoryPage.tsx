import { useEffect, useMemo, useState } from 'react'
import type { Cluster, Memory } from '../design/memoryMocks'
import { listMemories } from '../api/memory'
import { useKnowledge } from '../api/knowledge'
import { MemoryPreamble, MemoryEmpty } from '../components/liminal/memory/MemoryPreamble'
import { MemoryTabs, type MemoryTab } from '../components/liminal/memory/MemoryTabs'
import {
  MemoryToolbar,
  type MemoryFilter,
  type MemorySort,
} from '../components/liminal/memory/MemoryToolbar'
import { MemoryCard, type Density } from '../components/liminal/memory/MemoryCard'
import { ClusterHeader } from '../components/liminal/memory/ClusterHeader'
import { KnowledgeView } from '../components/liminal/memory/KnowledgeView'

const CONFIDENCE_ORDER = { certain: 0, inferred: 1, assumed: 2 } as const

interface MemoryState {
  items: Memory[]
  loading: boolean
  error: string | null
}

function useMemories(): MemoryState {
  const [state, setState] = useState<MemoryState>({
    items: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    listMemories('', 200)
      .then((items) => {
        if (cancelled) return
        setState({ items, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'failed to load memory'
        setState({ items: [], loading: false, error: message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

/**
 * Memory — long-term memories surfaced from the Curator, plus ingested
 * knowledge. Fetches `/api/memory` on mount and maps the wire shape into the
 * Liminal `Memory` type via `mapApiMemoryToDesign`.
 */
export function MemoryPage() {
  const { items: memories, loading, error } = useMemories()
  const knowledge = useKnowledge()

  const [tab, setTab] = useState<MemoryTab>('memory')
  const [filter, setFilter] = useState<MemoryFilter>('all')
  const [sort, setSort] = useState<MemorySort>('cluster')
  const [query, setQuery] = useState('')

  const density = 'normal' as Density
  const showTrust = true
  const editorial = true

  const counts = useMemo(
    () => ({
      total: memories.length,
      certain:  memories.filter((m) => m.confidence === 'certain').length,
      inferred: memories.filter((m) => m.confidence === 'inferred').length,
      assumed:  memories.filter((m) => m.confidence === 'assumed').length,
    }),
    [memories],
  )

  const sortedItems = useMemo(() => {
    let items = memories
    if (filter !== 'all') items = items.filter((m) => m.confidence === filter)
    const q = query.trim().toLowerCase()
    if (q) {
      items = items.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    const sorted = [...items].sort((a, b) => {
      if (sort === 'confidence') {
        return CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence]
      }
      if (sort === 'confirmations') return b.confirmedCount - a.confirmedCount
      if (sort === 'cluster') return a.cluster.localeCompare(b.cluster)
      return 0
    })
    return sorted
  }, [memories, filter, sort, query])

  const groupedByCluster = useMemo(() => {
    if (sort !== 'cluster') return null
    const groups = new Map<Cluster, typeof sortedItems>()
    for (const m of sortedItems) {
      const bucket = groups.get(m.cluster) ?? []
      bucket.push(m)
      groups.set(m.cluster, bucket)
    }
    return Array.from(groups.entries())
  }, [sortedItems, sort])

  const gridGap = density === 'dense' ? 8 : density === 'sparse' ? 16 : 12

  return (
    <div
      className="font-sans flex flex-col min-w-0"
      style={{ background: 'var(--bg)', color: 'var(--ink)' }}
    >
      {editorial && <MemoryPreamble counts={counts} />}

      <div style={{ padding: '0 48px', borderBottom: '1px solid var(--line)' }}>
        <MemoryTabs
          tab={tab}
          setTab={setTab}
          memoryCount={memories.length}
          knowledgeCount={knowledge.items.length}
        />
      </div>

      <div
        className="mx-auto w-full"
        style={{ maxWidth: 1100, padding: '24px 48px 80px' }}
      >
        {tab === 'memory' ? (
          <>
            <MemoryToolbar
              filter={filter}
              setFilter={setFilter}
              sort={sort}
              setSort={setSort}
              query={query}
              setQuery={setQuery}
              counts={counts}
            />
            {loading ? (
              <MemoryStatus text="Reading what I remember…" />
            ) : error ? (
              <MemoryStatus
                text={`Something went wrong reaching memory — ${error}`}
                tone="error"
              />
            ) : sortedItems.length === 0 ? (
              <MemoryEmpty query={query} />
            ) : groupedByCluster ? (
              groupedByCluster.map(([cluster, group]) => (
                <div key={cluster}>
                  <ClusterHeader cluster={cluster} count={group.length} />
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                      gap: gridGap,
                    }}
                  >
                    {group.map((m) => (
                      <MemoryCard
                        key={m.id}
                        mem={m}
                        density={density}
                        showTrust={showTrust}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: gridGap,
                }}
              >
                {sortedItems.map((m) => (
                  <MemoryCard
                    key={m.id}
                    mem={m}
                    density={density}
                    showTrust={showTrust}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <KnowledgeView
            density={density}
            editorial={editorial}
            docs={knowledge.items}
            loading={knowledge.loading}
            error={knowledge.error}
            onUpload={knowledge.upload}
            onDelete={knowledge.remove}
          />
        )}
      </div>
    </div>
  )
}

interface MemoryStatusProps {
  text: string
  tone?: 'neutral' | 'error'
}

function MemoryStatus({ text, tone = 'neutral' }: MemoryStatusProps) {
  return (
    <div
      className="font-serif italic"
      role={tone === 'error' ? 'alert' : 'status'}
      style={{
        padding: '48px 12px',
        textAlign: 'center',
        fontSize: 14,
        color: tone === 'error' ? 'var(--red)' : 'var(--ink-muted)',
      }}
    >
      {text}
    </div>
  )
}
