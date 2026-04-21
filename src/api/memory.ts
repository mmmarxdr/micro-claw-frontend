// Live /api/memory wiring: fetches the backend memory list and maps the wire
// shape into the `Memory` type that the Liminal components consume. Kept
// separate from client.ts so the mapping logic (confidence/kind/cluster
// derivations, relative-time formatting) stays out of the thin HTTP layer.

import { api, type MemoryEntry as ApiMemoryEntry } from './client'
import type {
  Memory,
  MemoryKind,
  Confidence,
  Cluster,
} from '../design/memoryMocks'

const VALID_CLUSTERS: Cluster[] = [
  'identity',
  'preferences',
  'projects',
  'relationships',
  'technical',
  'general',
]
const CLUSTER_SET = new Set<string>(VALID_CLUSTERS)

// Memory types that read as atomic propositions vs. longer editorial notes.
// The backend "type" is one of fact|preference|instruction|decision|context.
const FACT_TYPES = new Set(['fact', 'preference'])

/**
 * Confidence is inferred from the Curator's `importance` 1–10 score.
 * The bands mirror the Liminal trust surface:
 *   - certain:  importance ≥ 7 — explicit personal facts, preferences, decisions
 *   - inferred: importance 5–6 — pattern-derived or partial-answer content
 *   - assumed:  importance ≤ 4 — soft signal / weak evidence
 */
function confidenceFromImportance(importance: number): Confidence {
  if (importance >= 7) return 'certain'
  if (importance >= 5) return 'inferred'
  return 'assumed'
}

function kindFromType(type: string | undefined): MemoryKind {
  return type && FACT_TYPES.has(type) ? 'fact' : 'note'
}

function clusterOrGeneral(cluster: string | undefined): Cluster {
  if (cluster && CLUSTER_SET.has(cluster)) return cluster as Cluster
  return 'general'
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

// Bucket relative deltas into units the user expects: seconds → minutes → hours
// → days → weeks → months → years. Matches the human-friendly phrases the mocks
// used ("3 weeks ago", "yesterday", "today").
export function formatRelativeTime(iso: string | undefined | null): string {
  if (!iso) return 'never'
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return 'never'
  const deltaSec = (then - Date.now()) / 1000

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]
  for (const [unit, sec] of units) {
    if (Math.abs(deltaSec) >= sec) {
      return rtf.format(Math.round(deltaSec / sec), unit)
    }
  }
  return 'just now'
}

export function mapApiMemoryToDesign(entry: ApiMemoryEntry): Memory {
  const lastSeen = entry.last_accessed_at
    ? formatRelativeTime(entry.last_accessed_at)
    : entry.access_count > 0
      ? formatRelativeTime(entry.created_at)
      : 'never'

  return {
    id: entry.id,
    kind: kindFromType(entry.type),
    cluster: clusterOrGeneral(entry.cluster),
    content: entry.content,
    tags: entry.tags ?? [],
    confidence: confidenceFromImportance(entry.importance),
    source: {
      conv: entry.source_conversation_title || entry.source_conversation_id || 'unknown',
      date: (entry.created_at ?? '').slice(0, 10),
    },
    lastSeen,
    confirmedCount: entry.access_count,
  }
}

export async function listMemories(
  q = '',
  limit = 200,
): Promise<Memory[]> {
  const { items } = await api.memory(q, limit)
  return items.map(mapApiMemoryToDesign)
}
