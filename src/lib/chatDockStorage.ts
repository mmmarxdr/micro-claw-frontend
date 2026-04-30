// Persists the user's choice to dismiss the floating chat dock.
// Cleared automatically when the user navigates back to /chat (handled in AppLayout).

const STORAGE_KEY = 'daimon.chat-dock.closed'
const CHANGE_EVENT = 'daimon:dock-closed-changed'

export function getDockClosed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setDockClosed(closed: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, closed ? 'true' : 'false')
  } catch {
    // best-effort: private mode / quota exceeded / SSR — silently ignore
  }
  // Notify same-tab subscribers. The browser's native `storage` event only
  // fires for *other* tabs, so we also dispatch a custom event for the page
  // that wrote the value.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }
}

// Subscribes a callback to dock-closed changes — both same-tab writes and
// cross-tab `storage` events. Returns an unsubscribe fn.
// Designed for `useSyncExternalStore` so React stays in sync with localStorage
// without forcing components to manage parallel state.
export function subscribeDockClosed(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', cb)
  window.addEventListener(CHANGE_EVENT, cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener(CHANGE_EVENT, cb)
  }
}
