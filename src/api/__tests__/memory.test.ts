import { describe, it, expect } from 'vitest'

import { mapApiMemoryToDesign, formatRelativeTime } from '../memory'
import type { MemoryEntry as ApiMemoryEntry } from '../client'

function makeApiEntry(overrides: Partial<ApiMemoryEntry> = {}): ApiMemoryEntry {
  return {
    id: 'm1',
    content: 'hello world',
    tags: [],
    cluster: 'preferences',
    importance: 7,
    access_count: 2,
    source_conversation_id: 'conv-1',
    source_conversation_title: 'Payments anomalies',
    created_at: '2026-03-01T12:00:00Z',
    ...overrides,
  }
}

describe('mapApiMemoryToDesign', () => {
  it('maps importance >= 7 to certain confidence', () => {
    const m = mapApiMemoryToDesign(makeApiEntry({ importance: 9 }))
    expect(m.confidence).toBe('certain')
  })

  it('maps importance 5-6 to inferred confidence', () => {
    const m = mapApiMemoryToDesign(makeApiEntry({ importance: 5 }))
    expect(m.confidence).toBe('inferred')
  })

  it('maps importance < 5 to assumed confidence', () => {
    const m = mapApiMemoryToDesign(makeApiEntry({ importance: 3 }))
    expect(m.confidence).toBe('assumed')
  })

  it('maps fact/preference types to kind=fact, others to note', () => {
    expect(mapApiMemoryToDesign(makeApiEntry({ type: 'fact' })).kind).toBe('fact')
    expect(mapApiMemoryToDesign(makeApiEntry({ type: 'preference' })).kind).toBe('fact')
    expect(mapApiMemoryToDesign(makeApiEntry({ type: 'decision' })).kind).toBe('note')
    expect(mapApiMemoryToDesign(makeApiEntry({ type: 'context' })).kind).toBe('note')
    expect(mapApiMemoryToDesign(makeApiEntry({ type: undefined })).kind).toBe('note')
  })

  it('falls back to "general" when cluster is unknown or missing', () => {
    expect(mapApiMemoryToDesign(makeApiEntry({ cluster: 'weird' })).cluster).toBe('general')
    expect(
      mapApiMemoryToDesign(makeApiEntry({ cluster: '' as unknown as string })).cluster,
    ).toBe('general')
  })

  it('preserves valid clusters verbatim', () => {
    expect(mapApiMemoryToDesign(makeApiEntry({ cluster: 'technical' })).cluster).toBe('technical')
    expect(mapApiMemoryToDesign(makeApiEntry({ cluster: 'identity' })).cluster).toBe('identity')
  })

  it('prefers source_conversation_title over id for the source label', () => {
    const m = mapApiMemoryToDesign(makeApiEntry({
      source_conversation_title: 'Onboarding',
      source_conversation_id: 'conv-42',
    }))
    expect(m.source.conv).toBe('Onboarding')
  })

  it('falls back to source_conversation_id when title is missing', () => {
    const m = mapApiMemoryToDesign(makeApiEntry({
      source_conversation_title: undefined,
      source_conversation_id: 'conv-42',
    }))
    expect(m.source.conv).toBe('conv-42')
  })

  it('sets lastSeen to "never" when there is no access signal', () => {
    const m = mapApiMemoryToDesign(makeApiEntry({
      access_count: 0,
      last_accessed_at: undefined,
    }))
    expect(m.lastSeen).toBe('never')
  })

  it('uses last_accessed_at when present for the lastSeen label', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const m = mapApiMemoryToDesign(makeApiEntry({
      last_accessed_at: yesterday,
    }))
    expect(m.lastSeen).toMatch(/yesterday|1 day ago/)
  })

  it('slices the source date to YYYY-MM-DD', () => {
    const m = mapApiMemoryToDesign(makeApiEntry({
      created_at: '2026-01-08T09:30:12Z',
    }))
    expect(m.source.date).toBe('2026-01-08')
  })

  it('exposes access_count as confirmedCount', () => {
    const m = mapApiMemoryToDesign(makeApiEntry({ access_count: 14 }))
    expect(m.confirmedCount).toBe(14)
  })
})

describe('formatRelativeTime', () => {
  it('returns "never" for empty, null, or invalid ISO', () => {
    expect(formatRelativeTime(undefined)).toBe('never')
    expect(formatRelativeTime(null)).toBe('never')
    expect(formatRelativeTime('')).toBe('never')
    expect(formatRelativeTime('not-a-date')).toBe('never')
  })

  it('produces human-readable "ago" phrasing for past timestamps', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(twoDaysAgo)).toMatch(/2 days ago/)
  })
})
