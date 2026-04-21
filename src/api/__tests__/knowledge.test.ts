import { describe, it, expect } from 'vitest'

import {
  mapApiKnowledgeToDesign,
  formatBytes,
  formatWordCount,
} from '../knowledge'
import type { ApiKnowledgeDoc } from '../client'

function makeApiDoc(overrides: Partial<ApiKnowledgeDoc> = {}): ApiKnowledgeDoc {
  return {
    id: 'd1',
    title: 'sample.md',
    mime: 'text/markdown',
    kind_hint: 'markdown',
    sha256: 'abc',
    size: 1024 * 1024 * 4.2,
    chunk_count: 12,
    token_count: 10_000,
    page_count: null,
    access_count: 3,
    status: 'ready',
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-01T09:00:00Z',
    ...overrides,
  }
}

describe('mapApiKnowledgeToDesign', () => {
  it('maps ready status and derives originalSize via formatBytes', () => {
    const k = mapApiKnowledgeToDesign(makeApiDoc())
    expect(k.status).toBe('ready')
    expect(k.originalSize).toMatch(/MB$/)
  })

  it('preserves page_count when present, null when absent', () => {
    expect(mapApiKnowledgeToDesign(makeApiDoc({ page_count: 42 })).pages).toBe(42)
    expect(mapApiKnowledgeToDesign(makeApiDoc({ page_count: null })).pages).toBeNull()
    expect(mapApiKnowledgeToDesign(makeApiDoc({ page_count: undefined })).pages).toBeNull()
  })

  it('falls back to "plain" type for unknown kind_hint', () => {
    expect(
      mapApiKnowledgeToDesign(makeApiDoc({ kind_hint: undefined })).type,
    ).toBe('plain')
    expect(
      mapApiKnowledgeToDesign(makeApiDoc({ kind_hint: 'bogus' as never })).type,
    ).toBe('plain')
  })

  it('passes through valid type hints', () => {
    expect(mapApiKnowledgeToDesign(makeApiDoc({ kind_hint: 'pdf' })).type).toBe('pdf')
    expect(mapApiKnowledgeToDesign(makeApiDoc({ kind_hint: 'docx' })).type).toBe('docx')
  })

  it('lastUsed returns "never" when no access signal', () => {
    const k = mapApiKnowledgeToDesign(makeApiDoc({
      access_count: 0,
      last_accessed_at: undefined,
    }))
    expect(k.lastUsed).toBe('never')
  })

  it('slices ingestedAt to YYYY-MM-DD', () => {
    expect(
      mapApiKnowledgeToDesign(makeApiDoc({ created_at: '2026-04-02T12:34:56Z' })).ingestedAt,
    ).toBe('2026-04-02')
  })

  it('exposes access_count as injections', () => {
    expect(mapApiKnowledgeToDesign(makeApiDoc({ access_count: 47 })).injections).toBe(47)
  })

  it('reuses title as originalName (Phase A behavior)', () => {
    const k = mapApiKnowledgeToDesign(makeApiDoc({ title: 'tokens.md' }))
    expect(k.originalName).toBe(k.title)
  })
})

describe('formatBytes', () => {
  it('returns empty for zero, undefined, or negative sizes', () => {
    expect(formatBytes(0)).toBe('')
    expect(formatBytes(undefined)).toBe('')
    expect(formatBytes(-10)).toBe('')
  })

  it('formats small sizes in bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats KB and MB with one decimal', () => {
    expect(formatBytes(2048)).toMatch(/^2 KB$/)
    expect(formatBytes(1024 * 1024 * 4.5)).toBe('4.5 MB')
  })
})

describe('formatWordCount', () => {
  it('returns "0" for missing or zero token counts', () => {
    expect(formatWordCount(0)).toBe('0')
    expect(formatWordCount(undefined)).toBe('0')
  })

  it('expresses small counts as raw numbers', () => {
    // 500 tokens ≈ 375 words
    expect(formatWordCount(500)).toBe('375')
  })

  it('uses k suffix for thousands', () => {
    // 10_000 tokens ≈ 7500 words → 7.5k
    expect(formatWordCount(10_000)).toBe('7.5k')
  })

  it('uses M suffix for millions', () => {
    expect(formatWordCount(2_000_000)).toMatch(/M$/)
  })
})
