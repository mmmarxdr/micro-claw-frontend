// Live /api/knowledge wiring: fetches ingested documents and maps them into
// the `KnowledgeDoc` type the Memory → Knowledge tab consumes. Mapper lives
// here so client.ts stays a thin HTTP layer.

import { useCallback, useEffect, useState } from 'react'

import { api, type ApiKnowledgeDoc } from './client'
import type { KnowledgeDoc, KnowledgeType } from '../design/memoryMocks'
import { formatRelativeTime } from './memory'

const VALID_TYPES = new Set<KnowledgeType>([
  'pdf',
  'markdown',
  'docx',
  'html',
  'zip',
  'plain',
])

function asKnowledgeType(hint: string | undefined): KnowledgeType {
  if (hint && VALID_TYPES.has(hint as KnowledgeType)) return hint as KnowledgeType
  return 'plain'
}

// formatBytes renders a byte count into a short human-readable label
// ("4.2 MB", "68 KB"). Zero / missing sizes return an empty string so the UI
// can omit the size row.
export function formatBytes(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = unit === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unit]}`
}

// formatWordCount converts a raw token count into a "24.3k" / "680" style word
// estimate. Uses the rough 1 token ≈ 0.75 words rule of thumb — good enough
// for surface-level context, not an exact count.
export function formatWordCount(tokens: number | undefined): string {
  if (!tokens || tokens <= 0) return '0'
  const words = Math.round(tokens * 0.75)
  if (words >= 1_000_000) return `${(words / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (words >= 1_000) return `${(words / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(words)
}

export function mapApiKnowledgeToDesign(api: ApiKnowledgeDoc): KnowledgeDoc {
  return {
    id: api.id,
    title: api.title,
    // Phase A: no separate original filename column — reuse title. Phase B can
    // split these when the upload pipeline persists the raw filename.
    originalName: api.title,
    originalSize: formatBytes(api.size),
    type: asKnowledgeType(api.kind_hint),
    ingestedAt: (api.created_at ?? '').slice(0, 10),
    lastUsed: api.last_accessed_at
      ? formatRelativeTime(api.last_accessed_at)
      : api.access_count > 0
        ? formatRelativeTime(api.updated_at)
        : 'never',
    injections: api.access_count,
    pages: api.page_count ?? null,
    words: formatWordCount(api.token_count),
    chunks: api.chunk_count,
    summary: api.summary ?? '',
    status: api.status,
  }
}

export async function listKnowledge(): Promise<KnowledgeDoc[]> {
  const { items } = await api.knowledge()
  return items.map(mapApiKnowledgeToDesign)
}

export async function uploadKnowledge(
  file: File,
  title?: string,
): Promise<KnowledgeDoc> {
  const created = await api.uploadKnowledge(file, title)
  return mapApiKnowledgeToDesign(created)
}

export async function deleteKnowledge(id: string): Promise<void> {
  await api.deleteKnowledge(id)
}

export interface KnowledgeState {
  items: KnowledgeDoc[]
  loading: boolean
  error: string | null
  upload: (file: File, title?: string) => Promise<void>
  remove: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

// indexingPollInterval controls how often we re-fetch /api/knowledge while at
// least one doc has status=indexing. 3 s feels responsive enough for the
// upload→ready transition without hammering the endpoint. The effect stops
// scheduling once no docs are indexing — zero cost when idle.
const indexingPollInterval = 3000

/**
 * useKnowledge manages the Knowledge tab's data: initial fetch, upload,
 * delete, refetch, and background polling while documents are indexing.
 *
 * Upload is optimistic — the new doc is inserted with status=indexing
 * immediately; the polling effect picks up the worker's chunk_count update so
 * the card flips to status=ready without user action.
 */
export function useKnowledge(): KnowledgeState {
  const [items, setItems] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // fetchSilent updates items + clears errors without toggling the loading
  // flag — used by polling so the UI doesn't flicker into the loading state
  // every 3 seconds.
  const fetchSilent = useCallback(async () => {
    try {
      const next = await listKnowledge()
      setItems(next)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to load knowledge')
    }
  }, [])

  const refetch = useCallback(async () => {
    setLoading(true)
    await fetchSilent()
    setLoading(false)
  }, [fetchSilent])

  useEffect(() => {
    let cancelled = false
    listKnowledge()
      .then((next) => {
        if (!cancelled) {
          setItems(next)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'failed to load knowledge')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Background poll while any doc is still indexing. Schedules the next tick
  // only when a refetch sees indexing docs — so once everything is ready, the
  // loop stops and we're back to zero network traffic.
  useEffect(() => {
    const hasIndexing = items.some((d) => d.status === 'indexing')
    if (!hasIndexing) return
    const timer = setTimeout(() => {
      void fetchSilent()
    }, indexingPollInterval)
    return () => {
      clearTimeout(timer)
    }
  }, [items, fetchSilent])

  const upload = useCallback(
    async (file: File, title?: string) => {
      try {
        const created = await uploadKnowledge(file, title)
        setItems((prev) => [created, ...prev])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'upload failed')
        throw err
      }
    },
    [],
  )

  const remove = useCallback(async (id: string) => {
    const snapshot = items
    setItems((prev) => prev.filter((d) => d.id !== id))
    try {
      await deleteKnowledge(id)
    } catch (err) {
      setItems(snapshot)
      setError(err instanceof Error ? err.message : 'delete failed')
      throw err
    }
  }, [items])

  return { items, loading, error, upload, remove, refetch }
}
