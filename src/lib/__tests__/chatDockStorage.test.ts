import { describe, it, expect, beforeEach, vi } from 'vitest'

import { getDockClosed, setDockClosed } from '../chatDockStorage'

describe('chatDockStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('getDockClosed returns false when nothing has been stored', () => {
    expect(getDockClosed()).toBe(false)
  })

  it("getDockClosed returns true only when the value is exactly 'true'", () => {
    window.localStorage.setItem('daimon.chat-dock.closed', 'true')
    expect(getDockClosed()).toBe(true)

    window.localStorage.setItem('daimon.chat-dock.closed', 'false')
    expect(getDockClosed()).toBe(false)

    window.localStorage.setItem('daimon.chat-dock.closed', 'TRUE')
    expect(getDockClosed()).toBe(false) // strict equality, not case-insensitive
  })

  it('setDockClosed(true) persists the flag', () => {
    setDockClosed(true)
    expect(window.localStorage.getItem('daimon.chat-dock.closed')).toBe('true')
    expect(getDockClosed()).toBe(true)
  })

  it('setDockClosed(false) explicitly clears the flag to "false"', () => {
    setDockClosed(true)
    setDockClosed(false)
    expect(window.localStorage.getItem('daimon.chat-dock.closed')).toBe('false')
    expect(getDockClosed()).toBe(false)
  })

  it('getDockClosed swallows storage access errors and returns false', () => {
    const spy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    expect(getDockClosed()).toBe(false)
    spy.mockRestore()
  })

  it('setDockClosed swallows storage write errors silently', () => {
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    expect(() => setDockClosed(true)).not.toThrow()
    spy.mockRestore()
  })
})
