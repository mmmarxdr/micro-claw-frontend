/**
 * RED tests — 12.2 useProviderModels hook
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'

// Mock the api client module
vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>()
  return {
    ...actual,
    getProviderModels: vi.fn(),
  }
})

import { getProviderModels } from '../../api/client'
import { useProviderModels } from '../useProviderModels'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useProviderModels', () => {
  it('12.2.1 — calls getProviderModels with provider name', async () => {
    ;(getProviderModels as ReturnType<typeof vi.fn>).mockResolvedValue({
      models: [{ id: 'm1', name: 'M1', context_length: 0, prompt_cost: 0, completion_cost: 0, free: false }],
      source: 'live',
      cached_at: null,
    })

    const { result } = renderHook(() => useProviderModels('anthropic'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getProviderModels).toHaveBeenCalledWith('anthropic', undefined)
    expect(result.current.data?.models).toHaveLength(1)
  })

  it('12.2.1b — switching provider triggers new fetch (different query key)', async () => {
    let callCount = 0
    ;(getProviderModels as ReturnType<typeof vi.fn>).mockImplementation((provider: string) => {
      callCount++
      return Promise.resolve({ models: [{ id: `${provider}-model`, name: provider, context_length: 0, prompt_cost: 0, completion_cost: 0, free: false }], source: 'live', cached_at: null })
    })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )

    const { result: r1 } = renderHook(() => useProviderModels('anthropic'), { wrapper })
    await waitFor(() => expect(r1.current.isSuccess).toBe(true))

    const { result: r2 } = renderHook(() => useProviderModels('openrouter'), { wrapper })
    await waitFor(() => expect(r2.current.isSuccess).toBe(true))

    // Two separate fetches
    expect(callCount).toBeGreaterThanOrEqual(2)
    // Results are distinct
    expect(r1.current.data?.models[0].id).toBe('anthropic-model')
    expect(r2.current.data?.models[0].id).toBe('openrouter-model')
  })

  it('12.2.2 — exposes source from response', async () => {
    ;(getProviderModels as ReturnType<typeof vi.fn>).mockResolvedValue({
      models: [],
      source: 'fallback',
      cached_at: null,
    })

    const { result } = renderHook(() => useProviderModels('anthropic'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.source).toBe('fallback')
  })
})
