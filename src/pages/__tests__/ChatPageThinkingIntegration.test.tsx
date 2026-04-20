/**
 * Integration test — 14.4: ThinkingBlock integrated with chat stream
 *
 * Full mock-WS session:
 *   2x reasoning_token → message → done
 *
 * Asserts:
 * - ThinkingBlock renders with accumulated reasoning while streaming
 * - Auto-collapses (shows "Thought for...") once content frame arrives
 * - Remains present and toggleable after done
 * - Final message content is rendered
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react'

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
  send(_data: string) {}  // intentionally no-op: test only emits via emit()
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

describe('ChatPage.integration.thinkingBlock', () => {
  // 14.4 — Full stream: reasoning_token + message → ThinkingBlock lifecycle
  it('14.4 — ThinkingBlock: renders reasoning, collapses on content, persists after done', async () => {
    render(<ChatPage />)

    const ws = MockWS.instance!
    expect(ws).toBeTruthy()

    // Emit 2 reasoning_token frames (streaming state).
    act(() => {
      ws.emit({ type: 'reasoning_token', data: 'Step 1: analyze input.' })
      ws.emit({ type: 'reasoning_token', data: ' Step 2: formulate response.' })
    })

    // ThinkingBlock should render with reasoning content visible.
    await waitFor(() => {
      expect(screen.getByText(/step 1: analyze input/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    // Emit a token frame (text starts → ThinkingBlock should auto-collapse).
    act(() => {
      ws.emit({ type: 'token', text: 'Here is my answer.' })
    })

    // After text starts, "Thought for..." label should appear.
    await waitFor(() => {
      expect(screen.getByText(/pondered for/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    // Emit done frame.
    act(() => {
      ws.emit({ type: 'done' })
    })

    // Final message content should be in the DOM.
    await waitFor(() => {
      expect(screen.getByText(/here is my answer/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    // ThinkingBlock "Thought for..." label should persist after done.
    expect(screen.getByText(/pondered for/i)).toBeInTheDocument()

    // ThinkingBlock should be toggleable (clickable to expand).
    const summary = screen.getByText(/pondered for/i)
    fireEvent.click(summary)
    // After clicking, the reasoning content should be visible again.
    await waitFor(() => {
      expect(screen.getByText(/step 1: analyze input/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  // 14.4b — no reasoning_token → ThinkingBlock NOT in DOM
  it('14.4b — no reasoning_token frames = ThinkingBlock absent', async () => {
    render(<ChatPage />)
    const ws = MockWS.instance!

    act(() => {
      ws.emit({ type: 'token', text: 'Direct answer.' })
      ws.emit({ type: 'done' })
    })

    await waitFor(() => {
      expect(screen.getByText(/direct answer/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.queryByText(/pondered for/i)).toBeNull()
    expect(screen.queryByText(/pondering/i)).toBeNull()
  })
})
