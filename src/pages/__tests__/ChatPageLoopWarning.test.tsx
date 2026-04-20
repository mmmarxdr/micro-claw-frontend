/**
 * Integration test — loop_detected passive warning.
 *
 * Backend emits `loop_detected` when the same tool+input is called repeatedly.
 * The UI surfaces it as a passive chip in the LiveStatus bar — the agent
 * keeps running, the user gets a heads-up. The warning clears on turn_end /
 * turn_start.
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

describe('ChatPage.loopWarning', () => {
  it('renders a "looping: TOOL (Nx)" chip on loop_detected', async () => {
    render(<ChatPage />)
    const ws = MockWS.instance!

    act(() => {
      ws.emit({ type: 'turn_start' })
      ws.emit({
        type: 'loop_detected',
        tool_name: 'shell_exec',
        repetitions: 3,
        sample_input: '{"command":"ls"}',
        conversation_id: 'c1',
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/looping/i)).toBeInTheDocument()
    })
    expect(screen.getByText('shell_exec')).toBeInTheDocument()
    expect(screen.getByText(/\(3×\)/)).toBeInTheDocument()
  })

  it('clears the loop chip on turn_start (fresh turn)', async () => {
    render(<ChatPage />)
    const ws = MockWS.instance!

    act(() => {
      ws.emit({ type: 'turn_start' })
      ws.emit({ type: 'loop_detected', tool_name: 'shell_exec', repetitions: 3 })
    })

    await waitFor(() => {
      expect(screen.getByText(/looping/i)).toBeInTheDocument()
    })

    act(() => {
      ws.emit({ type: 'turn_start' })
    })

    await waitFor(() => {
      expect(screen.queryByText(/looping/i)).not.toBeInTheDocument()
    })
  })
})
