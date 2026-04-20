/**
 * RED tests — 13.2 Chat stream: reasoning_token accumulation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'

// Mock all deps
vi.mock('../../api/client', () => ({
  api: {
    listMedia: vi.fn().mockResolvedValue([]),
    uploadFile: vi.fn(),
    deleteMedia: vi.fn(),
  },
  createWebSocket: vi.fn(),
}))

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn()

import { createWebSocket } from '../../api/client'
import { ChatPage } from '../ChatPage'

// Minimal WebSocket mock
class MockWS {
  static instance: MockWS | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  readyState = 1 // OPEN

  constructor() {
    MockWS.instance = this
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(_data: string) {}  // intentionally no-op
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

describe('ChatPage.reasoningStream', () => {
  // 13.2.1 — reasoning_token frames accumulate, ThinkingBlock renders
  it('13.2.1 — reasoning_token frames render ThinkingBlock and auto-collapse on token', async () => {
    render(<ChatPage />)

    const ws = MockWS.instance!
    expect(ws).toBeTruthy()

    // Emit reasoning_token frames
    act(() => {
      ws.emit({ type: 'reasoning_token', data: 'Let me think... ' })
      ws.emit({ type: 'reasoning_token', data: 'Step 1: analyze the problem.' })
    })

    // ThinkingBlock should be rendered with reasoning content
    await waitFor(() => {
      expect(screen.getByText(/let me think/i)).toBeInTheDocument()
    })

    // Emit a token frame (text starts)
    act(() => {
      ws.emit({ type: 'token', text: 'Here is my answer.' })
    })

    // ThinkingBlock should auto-collapse (show "Thought for..." label)
    await waitFor(() => {
      expect(screen.getByText(/pondered for/i)).toBeInTheDocument()
    })
  })

  // 13.2.2 — unknown frame types don't crash; subsequent token frames still work
  it('13.2.2 — unknown frame type causes no crash; token frames still render', async () => {
    render(<ChatPage />)
    const ws = MockWS.instance!

    act(() => {
      ws.emit({ type: 'some_unknown_frame', data: 'ignored' })
      ws.emit({ type: 'token', text: 'Normal answer.' })
    })

    await waitFor(() => {
      expect(screen.getByText(/normal answer/i)).toBeInTheDocument()
    })
  })

  // 13.2.3 — no reasoning_token = no ThinkingBlock
  it('13.2.3 — no reasoning_token frames = ThinkingBlock not in DOM', async () => {
    render(<ChatPage />)
    const ws = MockWS.instance!

    act(() => {
      ws.emit({ type: 'token', text: 'Direct answer without thinking.' })
    })

    await waitFor(() => {
      expect(screen.getByText(/direct answer/i)).toBeInTheDocument()
    })

    // ThinkingBlock should NOT be present
    expect(screen.queryByText(/pondered for/i)).toBeNull()
    expect(screen.queryByText(/pondering/i)).toBeNull()
  })
})
