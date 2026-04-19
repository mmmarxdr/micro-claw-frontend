/**
 * RED tests — 12.2 API client: getProviderModels
 * These tests fail until src/api/client.ts has getProviderModels + ProviderModelsResponse.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We import from the module AFTER it exists; the tests define the contract.
// Import from the real client (not mock swap) by importing the function directly.
// We mock global fetch.

describe('getProviderModels', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('12.2.1a — calls GET /api/providers/anthropic/models', async () => {
    const { getProviderModels } = await import('../client')

    const mockResponse = {
      models: [
        { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', context_length: 200000, prompt_cost: 0.015, completion_cost: 0.075, free: false },
      ],
      source: 'live',
      cached_at: '2026-04-19T00:00:00Z',
    }

    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await getProviderModels('anthropic')

    expect(fetch).toHaveBeenCalledWith(
      '/api/providers/anthropic/models',
      expect.objectContaining({ credentials: 'include' })
    )
    expect(result.models).toHaveLength(1)
    expect(result.models[0].id).toBe('claude-opus-4-7')
    expect(result.source).toBe('live')
  })

  it('12.2.1b — different provider = different URL', async () => {
    const { getProviderModels } = await import('../client')

    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ models: [], source: 'live', cached_at: null }),
    })

    await getProviderModels('openrouter')

    expect(fetch).toHaveBeenCalledWith(
      '/api/providers/openrouter/models',
      expect.anything()
    )
  })

  it('12.2.2 — exposes source:fallback from response', async () => {
    const { getProviderModels } = await import('../client')

    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ models: [{ id: 'm1', name: 'M1', context_length: 0, prompt_cost: 0, completion_cost: 0, free: true }], source: 'fallback', cached_at: null }),
    })

    const result = await getProviderModels('anthropic')
    expect(result.source).toBe('fallback')
  })

  it('12.2.3 — 401 throws typed error', async () => {
    const { getProviderModels } = await import('../client')

    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'no api key' }),
    })

    await expect(getProviderModels('openai')).rejects.toThrow()
  })

  it('12.2.4 — 404 throws error', async () => {
    const { getProviderModels } = await import('../client')

    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'unknown provider' }),
    })

    await expect(getProviderModels('badprovider')).rejects.toThrow()
  })

  it('12.2.5 — refresh=true appends query param', async () => {
    const { getProviderModels } = await import('../client')

    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ models: [], source: 'live', cached_at: null }),
    })

    await getProviderModels('anthropic', { refresh: true })

    expect(fetch).toHaveBeenCalledWith(
      '/api/providers/anthropic/models?refresh=true',
      expect.anything()
    )
  })
})
