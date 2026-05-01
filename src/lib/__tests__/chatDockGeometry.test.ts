import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  DEFAULT_GEOMETRY,
  MAX_HEIGHT,
  MAX_WIDTH,
  MIN_HEIGHT,
  MIN_WIDTH,
  getDockGeometry,
  setDockGeometry,
  subscribeDockGeometry,
} from '../chatDockGeometry'

beforeEach(() => {
  window.localStorage.clear()
})

describe('chatDockGeometry — persistence', () => {
  it('returns DEFAULT_GEOMETRY when nothing is stored', () => {
    expect(getDockGeometry()).toEqual(DEFAULT_GEOMETRY)
  })

  it('round-trips a valid geometry through localStorage', () => {
    setDockGeometry({ corner: 'tl', width: 480, height: 400 })
    expect(getDockGeometry()).toEqual({ corner: 'tl', width: 480, height: 400 })
  })

  it('falls back to defaults on malformed JSON', () => {
    window.localStorage.setItem('daimon.chat-dock.geometry', '{not json')
    expect(getDockGeometry()).toEqual(DEFAULT_GEOMETRY)
  })

  it('falls back to default corner on unknown corner value', () => {
    window.localStorage.setItem(
      'daimon.chat-dock.geometry',
      JSON.stringify({ corner: 'middle', width: 400, height: 350 }),
    )
    const geo = getDockGeometry()
    expect(geo.corner).toBe(DEFAULT_GEOMETRY.corner)
    expect(geo.width).toBe(400)
    expect(geo.height).toBe(350)
  })
})

describe('chatDockGeometry — bounds clamping', () => {
  it('clamps width below MIN_WIDTH', () => {
    setDockGeometry({ corner: 'br', width: 100, height: 300 })
    expect(getDockGeometry().width).toBe(MIN_WIDTH)
  })

  it('clamps width above MAX_WIDTH', () => {
    setDockGeometry({ corner: 'br', width: 9999, height: 300 })
    expect(getDockGeometry().width).toBe(MAX_WIDTH)
  })

  it('clamps height below MIN_HEIGHT', () => {
    setDockGeometry({ corner: 'br', width: 400, height: 50 })
    expect(getDockGeometry().height).toBe(MIN_HEIGHT)
  })

  it('clamps height above MAX_HEIGHT', () => {
    setDockGeometry({ corner: 'br', width: 400, height: 9999 })
    expect(getDockGeometry().height).toBe(MAX_HEIGHT)
  })

  it('coerces NaN dimensions to MIN_*', () => {
    setDockGeometry({ corner: 'br', width: Number.NaN, height: Number.NaN })
    expect(getDockGeometry().width).toBe(MIN_WIDTH)
    expect(getDockGeometry().height).toBe(MIN_HEIGHT)
  })
})

describe('chatDockGeometry — subscribe', () => {
  it('fires the listener on same-tab writes via the custom event', () => {
    const cb = vi.fn()
    const unsubscribe = subscribeDockGeometry(cb)
    setDockGeometry({ corner: 'tl', width: 400, height: 300 })
    expect(cb).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('does NOT fire the listener after unsubscribe', () => {
    const cb = vi.fn()
    const unsubscribe = subscribeDockGeometry(cb)
    unsubscribe()
    setDockGeometry({ corner: 'tl', width: 400, height: 300 })
    expect(cb).not.toHaveBeenCalled()
  })

  it('fires on cross-tab storage events', () => {
    const cb = vi.fn()
    const unsubscribe = subscribeDockGeometry(cb)
    window.dispatchEvent(new StorageEvent('storage', { key: 'daimon.chat-dock.geometry' }))
    expect(cb).toHaveBeenCalledTimes(1)
    unsubscribe()
  })
})
