/**
 * RED test — 12.4.1: KNOWN_MODELS must NOT exist in config.ts
 * This test will PASS once KNOWN_MODELS is removed.
 * Until then it fails if KNOWN_MODELS is still exported.
 */
import { describe, it, expect } from 'vitest'

describe('12.4.1 — KNOWN_MODELS removed from config.ts', () => {
  it('KNOWN_MODELS is not exported from schemas/config', async () => {
    const config = await import('../config')
    expect((config as Record<string, unknown>).KNOWN_MODELS).toBeUndefined()
  })
})
