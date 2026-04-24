import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      conversationMessages: vi.fn(),
    },
  }
})

import { api, MessagesPage } from '../../api/client'
import { useResumeSession } from '../useResumeSession'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

const mockedMessages = api.conversationMessages as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

function mockPage(page: MessagesPage) {
  mockedMessages.mockResolvedValueOnce(page)
}

describe('useResumeSession', () => {
  it('canContinue=true when last message is from user', async () => {
    mockPage({
      messages: [
        { role: 'assistant', content: 'a', timestamp: '' },
        { role: 'user', content: 'quiero más', timestamp: '' },
      ],
      oldest_index: 10,
      has_more: true,
    })

    const send = vi.fn().mockReturnValue(true)
    const { result } = renderHook(
      () => useResumeSession('conv_x', send),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.canContinue).toBe(true)
    expect(result.current.hasOlder).toBe(true)
  })

  it('canContinue=false when last message is from assistant', async () => {
    mockPage({
      messages: [
        { role: 'user', content: 'ok', timestamp: '' },
        { role: 'assistant', content: 'listo', timestamp: '' },
      ],
      oldest_index: 0,
      has_more: false,
    })

    const send = vi.fn().mockReturnValue(true)
    const { result } = renderHook(
      () => useResumeSession('conv_done', send),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.canContinue).toBe(false)
    expect(result.current.hasOlder).toBe(false)
  })

  it('convID=null disables fetch and returns idle state', () => {
    const send = vi.fn().mockReturnValue(true)
    const { result } = renderHook(
      () => useResumeSession(null, send),
      { wrapper: makeWrapper() },
    )

    expect(mockedMessages).not.toHaveBeenCalled()
    expect(result.current.canContinue).toBe(false)
    expect(result.current.hasOlder).toBe(false)
  })

  it('continueTurn() sends the continue_turn WS frame', async () => {
    mockPage({
      messages: [{ role: 'user', content: 'x', timestamp: '' }],
      oldest_index: 0,
      has_more: false,
    })

    const send = vi.fn().mockReturnValue(true)
    const { result } = renderHook(
      () => useResumeSession('conv_c', send),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    result.current.continueTurn()
    expect(send).toHaveBeenCalledWith({ type: 'continue_turn' })
  })
})
