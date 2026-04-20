import type { Confidence } from '../../../design/memoryMocks'

export type MemoryFilter = 'all' | Confidence
export type MemorySort = 'recent' | 'confidence' | 'confirmations' | 'cluster'

export interface MemoryCounts {
  total: number
  certain: number
  inferred: number
  assumed: number
}

interface MemoryToolbarProps {
  filter: MemoryFilter
  setFilter: (f: MemoryFilter) => void
  sort: MemorySort
  setSort: (s: MemorySort) => void
  query: string
  setQuery: (q: string) => void
  counts: MemoryCounts
}

interface FilterDef {
  k: MemoryFilter
  l: string
  n: number
  colorVar?: string
}

export function MemoryToolbar({
  filter,
  setFilter,
  sort,
  setSort,
  query,
  setQuery,
  counts,
}: MemoryToolbarProps) {
  const filters: FilterDef[] = [
    { k: 'all',      l: 'all',      n: counts.total },
    { k: 'certain',  l: 'certain',  n: counts.certain,  colorVar: 'var(--accent)' },
    { k: 'inferred', l: 'inferred', n: counts.inferred, colorVar: 'var(--amber)' },
    { k: 'assumed',  l: 'assumed',  n: counts.assumed,  colorVar: 'var(--ink-muted)' },
  ]
  return (
    <div
      className="flex items-center flex-wrap"
      style={{ gap: 10, marginBottom: 18 }}
    >
      {/* Search */}
      <div
        className="flex items-center flex-1"
        style={{
          gap: 8,
          padding: '7px 12px',
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 5,
          minWidth: 260,
          maxWidth: 380,
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ink-muted)"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-5-5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search what I remember…"
          className="liminal-input font-serif italic flex-1"
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 12.5,
            color: 'var(--ink)',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="cursor-pointer"
            style={{
              color: 'var(--ink-muted)',
              fontSize: 14,
              background: 'transparent',
              border: 'none',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex" style={{ gap: 4 }}>
        {filters.map((f) => {
          const on = filter === f.k
          const tone = f.colorVar ?? 'var(--ink)'
          return (
            <button
              key={f.k}
              type="button"
              onClick={() => setFilter(f.k)}
              className="flex items-center cursor-pointer font-sans"
              style={{
                gap: 6,
                padding: '6px 10px',
                borderRadius: 5,
                fontSize: 11.5,
                background: on
                  ? f.colorVar
                    ? `color-mix(in srgb, ${f.colorVar} 10%, transparent)`
                    : 'var(--bg-deep)'
                  : 'transparent',
                color: on ? tone : 'var(--ink-soft)',
                border: `1px solid ${
                  on
                    ? f.colorVar
                      ? `color-mix(in srgb, ${f.colorVar} 33%, transparent)`
                      : 'var(--line-strong)'
                    : 'var(--line)'
                }`,
                fontWeight: on ? 500 : 400,
              }}
            >
              {f.l}
              <span
                className="font-mono"
                style={{ fontSize: 10, color: on ? tone : 'var(--ink-muted)' }}
              >
                {f.n}
              </span>
            </button>
          )
        })}
      </div>

      <span className="flex-1" />

      {/* Sort */}
      <div
        className="flex items-center"
        style={{ gap: 4, fontSize: 11, color: 'var(--ink-muted)' }}
      >
        <span className="font-serif italic">ordered by</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as MemorySort)}
          className="font-sans cursor-pointer"
          style={{
            background: 'transparent',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            fontSize: 11.5,
            padding: '5px 8px',
            borderRadius: 4,
          }}
        >
          <option value="recent">most recent</option>
          <option value="confidence">confidence</option>
          <option value="confirmations">most confirmed</option>
          <option value="cluster">by cluster</option>
        </select>
      </div>
    </div>
  )
}
