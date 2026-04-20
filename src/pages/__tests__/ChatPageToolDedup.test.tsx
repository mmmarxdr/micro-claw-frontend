/**
 * Regression test — tool_start dedup.
 *
 * The backend emits `tool_start` twice for the same invocation:
 *   1. From `internal/agent/stream.go` during streaming (no input yet).
 *   2. From `internal/agent/loop.go` right before execution (with input).
 * Both events carry the same `tool_call_id`. ChatPage must treat them as one
 * tool block — merging the incoming input into the existing entry rather
 * than pushing a second row.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'

vi.mock('../../api/client', () => ({
  api: {
    listMedia: vi.fn().mockResolvedValue([]),
    uploadFile: vi.fn(),
    deleteMedia: vi.fn(),
  },
  createWebSocket: vi.fn(),
}))

window.HTMLElement.prototype.scrollIntoView = vi.fn()

import { createWebSocket } from '../../api/client'
import { ChatPage } from '../ChatPage'

class MockWS {
  static instance: MockWS | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  readyState = 1

  constructor() {
    MockWS.instance = this
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(_data: string) {}
  close() {}

  emit(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  MockWS.instance = null
  ;(createWebSocket as ReturnType<typeof vi.fn>).mockImplementation(() => {
    return new MockWS() as unknown as WebSocket
  })
})

describe('ChatPage.toolDedup', () => {
  it('dedups two tool_start events with the same tool_call_id and merges the input', async () => {
    render(<ChatPage />)
    const ws = MockWS.instance!
    expect(ws).toBeTruthy()

    act(() => {
      // First emission — from stream.go, before input is assembled.
      ws.emit({ type: 'tool_start', name: 'web_fetch', tool_call_id: 'tc_1' })
      // Second emission — from loop.go, carrying the full input.
      ws.emit({
        type: 'tool_start',
        name: 'web_fetch',
        tool_call_id: 'tc_1',
        input: '{"url":"https://example.com/foo"}',
      })
    })

    // Only a single tool block — the name appears exactly once.
    await waitFor(() => {
      const matches = screen.queryAllByText('web_fetch')
      expect(matches).toHaveLength(1)
    })

    // And the input from the second emission merged in (preview shows the URL).
    expect(screen.getByText(/example\.com\/foo/)).toBeInTheDocument()
  })

  it('still appends distinct tool_call_ids as separate blocks', async () => {
    render(<ChatPage />)
    const ws = MockWS.instance!

    act(() => {
      ws.emit({
        type: 'tool_start',
        name: 'web_fetch',
        tool_call_id: 'tc_1',
        input: '{"url":"https://a.example"}',
      })
      ws.emit({
        type: 'tool_start',
        name: 'web_fetch',
        tool_call_id: 'tc_2',
        input: '{"url":"https://b.example"}',
      })
    })

    await waitFor(() => {
      const matches = screen.queryAllByText('web_fetch')
      expect(matches).toHaveLength(2)
    })
  })
})
