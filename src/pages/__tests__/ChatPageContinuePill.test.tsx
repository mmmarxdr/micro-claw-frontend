/**
 * Integration test — iteration-limit continue pill.
 *
 * Backend emits `iteration_limit_reached` when a turn's cap is hit. The UI
 * must surface a pill that lets the user resume with the same cap or with no
 * cap at all, and send a `continue_turn` WS message carrying the choice.
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
  /** Records every payload passed to send() so the test can assert on it. */
  sent: unknown[] = []

  constructor() {
    MockWS.instance = this
  }

  send(data: string) {
    try {
      this.sent.push(JSON.parse(data))
    } catch {
      this.sent.push(data)
    }
  }
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

describe('ChatPage.continuePill', () => {
  it('renders the pill on iteration_limit_reached and sends continue_turn with unlimited=false when "Continue" is clicked', async () => {
    render(<ChatPage />)
    const ws = MockWS.instance!
    expect(ws).toBeTruthy()

    act(() => {
      ws.emit({ type: 'turn_start' })
      ws.emit({ type: 'iteration_limit_reached', iterations: 10, conversation_id: 'c1' })
      ws.emit({ type: 'turn_end', elapsed_ms: 1234 })
    })

    // Editorial copy surfaces the iteration count.
    await waitFor(() => {
      expect(screen.getByText(/I stopped at/i)).toBeInTheDocument()
    })
    expect(screen.getByText('10')).toBeInTheDocument()

    const continueBtn = screen.getByRole('button', { name: /Continue \(\+10\)/ })
    fireEvent.click(continueBtn)

    const sent = ws.sent as Array<{ type: string; unlimited?: boolean }>
    const contMsg = sent.find((m) => m.type === 'continue_turn')
    expect(contMsg).toBeDefined()
    expect(contMsg?.unlimited).toBe(false)
  })

  it('sends continue_turn with unlimited=true when "No limit" is clicked', async () => {
    render(<ChatPage />)
    const ws = MockWS.instance!

    act(() => {
      ws.emit({ type: 'turn_start' })
      ws.emit({ type: 'iteration_limit_reached', iterations: 5 })
      ws.emit({ type: 'turn_end' })
    })

    await waitFor(() => {
      expect(screen.getByText(/I stopped at/i)).toBeInTheDocument()
    })

    const unlimitedBtn = screen.getByRole('button', { name: /No limit/ })
    fireEvent.click(unlimitedBtn)

    const sent = ws.sent as Array<{ type: string; unlimited?: boolean }>
    const contMsg = sent.find((m) => m.type === 'continue_turn')
    expect(contMsg).toBeDefined()
    expect(contMsg?.unlimited).toBe(true)
  })

  it('renders the pill on token_budget_reached with consumed/budget copy', async () => {
    render(<ChatPage />)
    const ws = MockWS.instance!

    act(() => {
      ws.emit({ type: 'turn_start' })
      ws.emit({
        type: 'token_budget_reached',
        consumed_tokens: 105000,
        budget: 100000,
        conversation_id: 'c1',
      })
      ws.emit({ type: 'turn_end' })
    })

    // Editorial copy surfaces the consumed/budget breakdown.
    await waitFor(() => {
      expect(screen.getByText(/I used/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/105k \/ 100k/)).toBeInTheDocument()

    // "Continue (+100k)" is the primary action label derived from budget.
    const continueBtn = screen.getByRole('button', { name: /Continue \(\+100k\)/ })
    fireEvent.click(continueBtn)

    const sent = ws.sent as Array<{ type: string; unlimited?: boolean }>
    const contMsg = sent.find((m) => m.type === 'continue_turn')
    expect(contMsg?.unlimited).toBe(false)
  })

  it('hides the pill when a new turn starts', async () => {
    render(<ChatPage />)
    const ws = MockWS.instance!

    act(() => {
      ws.emit({ type: 'turn_start' })
      ws.emit({ type: 'iteration_limit_reached', iterations: 3 })
      ws.emit({ type: 'turn_end' })
    })

    await waitFor(() => {
      expect(screen.getByText(/I stopped at/i)).toBeInTheDocument()
    })

    // A fresh turn (e.g. user sends a new message) clears the pending prompt.
    act(() => {
      ws.emit({ type: 'turn_start' })
    })

    await waitFor(() => {
      expect(screen.queryByText(/I stopped at/i)).not.toBeInTheDocument()
    })
  })
})
