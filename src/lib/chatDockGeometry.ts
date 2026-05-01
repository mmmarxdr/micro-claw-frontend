// Persistence + same-tab + cross-tab sync for the chat-dock geometry —
// which corner of the viewport it's anchored to, and its dimensions. Same
// pattern as chatDockStorage (the dismissal flag): a single localStorage
// key, a custom event for same-tab observers, and a useSyncExternalStore
// subscriber tuple. Kept in its own module so writes from the drag/resize
// handlers don't accidentally trip the dismissal flag's storage event.

export type DockCorner = 'tl' | 'tr' | 'bl' | 'br'

export interface DockGeometry {
  corner: DockCorner
  width: number
  height: number
}

const STORAGE_KEY = 'daimon.chat-dock.geometry'
const CHANGE_EVENT = 'daimon:dock-geometry-changed'

export const DEFAULT_GEOMETRY: DockGeometry = {
  corner: 'br',
  width: 380,
  height: 320,
}

// Bounds. Min keeps the input + send button + ~1 message visible; max keeps
// the dock from eating most of the viewport on large screens (at which point
// the user should just expand to fullscreen).
export const MIN_WIDTH = 320
export const MIN_HEIGHT = 240
export const MAX_WIDTH = 720
export const MAX_HEIGHT = 720

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function isCorner(value: unknown): value is DockCorner {
  return value === 'tl' || value === 'tr' || value === 'bl' || value === 'br'
}

// Cached snapshot — useSyncExternalStore requires getSnapshot to return a
// stable reference when the underlying data hasn't changed, otherwise React
// detects a "new" value on every render and infinite-loops. We compare the
// raw localStorage string and only re-parse when it actually changes (so
// cross-tab storage events, same-tab writes, and test storage.clear() all
// invalidate naturally).
let cachedRaw: string | null = null
let cachedSnapshot: DockGeometry = DEFAULT_GEOMETRY
let cacheInitialized = false

function parseRaw(raw: string | null): DockGeometry {
  if (!raw) return DEFAULT_GEOMETRY
  try {
    const parsed = JSON.parse(raw) as Partial<DockGeometry>
    return {
      corner: isCorner(parsed.corner) ? parsed.corner : DEFAULT_GEOMETRY.corner,
      width: clamp(Number(parsed.width), MIN_WIDTH, MAX_WIDTH),
      height: clamp(Number(parsed.height), MIN_HEIGHT, MAX_HEIGHT),
    }
  } catch {
    return DEFAULT_GEOMETRY
  }
}

export function getDockGeometry(): DockGeometry {
  if (typeof window === 'undefined') return DEFAULT_GEOMETRY
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (cacheInitialized && raw === cachedRaw) return cachedSnapshot
  cachedRaw = raw
  cachedSnapshot = parseRaw(raw)
  cacheInitialized = true
  return cachedSnapshot
}

export function setDockGeometry(geo: DockGeometry): void {
  if (typeof window === 'undefined') return
  const clamped: DockGeometry = {
    corner: geo.corner,
    width: clamp(geo.width, MIN_WIDTH, MAX_WIDTH),
    height: clamp(geo.height, MIN_HEIGHT, MAX_HEIGHT),
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped))
  } catch {
    // QuotaExceeded / SecurityError — silently swallow; the dock will simply
    // forget the new geometry on next page load.
  }
  // Fire the same-tab event AFTER the write so subscribers always read fresh.
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

export function subscribeDockGeometry(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => callback()
  window.addEventListener('storage', handler) // cross-tab
  window.addEventListener(CHANGE_EVENT, handler) // same-tab
  return () => {
    window.removeEventListener('storage', handler)
    window.removeEventListener(CHANGE_EVENT, handler)
  }
}
