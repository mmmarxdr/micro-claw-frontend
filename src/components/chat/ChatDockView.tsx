import {
  memo,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Send, X } from 'lucide-react'
import type { ChatMessage } from '../../types/chat'
import {
  DEFAULT_GEOMETRY,
  MAX_HEIGHT,
  MAX_WIDTH,
  MIN_HEIGHT,
  MIN_WIDTH,
  getDockGeometry,
  setDockGeometry,
  subscribeDockGeometry,
  type DockCorner,
  type DockGeometry,
} from '../../lib/chatDockGeometry'

interface ChatDockViewProps {
  recentMessages: ChatMessage[]
  status: string
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  isWaiting: boolean
  onExpand: () => void
  onClose: () => void
}

// Distance the pointer must travel before a header press is treated as a
// drag instead of a click-to-expand. Below this, the press is a tap.
const DRAG_THRESHOLD_PX = 5

// Margin between the dock and the viewport edge it's anchored to.
const ANCHOR_MARGIN = 16

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// Snap a release point to the nearest viewport corner via simple quadrants.
function nearestCorner(x: number, y: number): DockCorner {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const left = x < cx
  const top = y < cy
  if (top && left) return 'tl'
  if (top && !left) return 'tr'
  if (!top && left) return 'bl'
  return 'br'
}

function ChatDockViewImpl({
  recentMessages,
  status,
  input,
  onInputChange,
  onSend,
  isWaiting,
  onExpand,
  onClose,
}: ChatDockViewProps) {
  // Mount-time fade+scale, no keyframe in global CSS.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  // Geometry: corner + width + height, persisted via the same useSyncExternalStore
  // pattern as the dismissal flag. Reads are stable per snapshot.
  const geometry: DockGeometry = useSyncExternalStore(
    subscribeDockGeometry,
    getDockGeometry,
    () => DEFAULT_GEOMETRY,
  )
  const isTop = geometry.corner === 'tl' || geometry.corner === 'tr'
  const isLeft = geometry.corner === 'tl' || geometry.corner === 'bl'

  const isConnected = status === 'connected'
  const dotColor = isConnected ? 'var(--accent)' : 'var(--ink-muted)'
  const canSend = !isWaiting && isConnected && input.trim().length > 0

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) onSend()
    }
  }

  // Auto-scroll the messages list to the bottom on new content — but ONLY if
  // the user was already near the bottom.
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = messagesContainerRef.current
    if (!c) return
    const distanceFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight
    if (distanceFromBottom < 32) {
      messagesEndRef.current?.scrollIntoView({ block: 'end' })
    }
  }, [recentMessages, isWaiting])

  // ─────────────────────────────────────────────────────────────────────────
  // Drag + resize: PERFORMANCE-CRITICAL paths.
  //
  // During a pointer drag (move or resize) we MUST NOT trigger a React render
  // per pointermove — at 60-120 Hz that would re-render the whole dock + the
  // streaming message list. Instead we mutate the card's inline style
  // directly via the ref. React re-renders ONCE on pointerup when we commit
  // the new geometry to localStorage (which fires the subscribe callback).
  //
  // Also: pointer listeners live on `document`, not on the element, so the
  // user can drag past the dock's bounds without losing the gesture; and we
  // set `user-select: none` on <body> for the duration so text selection
  // doesn't fight the drag.
  // ─────────────────────────────────────────────────────────────────────────
  const cardRef = useRef<HTMLDivElement>(null)

  const startBodyUnselect = () => {
    document.body.style.userSelect = 'none'
  }
  const endBodyUnselect = () => {
    document.body.style.userSelect = ''
  }

  const onHeaderPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    // Only primary button; ignore right-click and middle-click drags.
    if (e.button !== 0) return
    if (!cardRef.current) return

    const startX = e.clientX
    const startY = e.clientY
    let dragStarted = false

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (!dragStarted) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
        dragStarted = true
        startBodyUnselect()
        if (cardRef.current) {
          cardRef.current.style.willChange = 'transform'
          cardRef.current.style.transition = 'none'
          cardRef.current.style.cursor = 'grabbing'
        }
      }
      if (cardRef.current) {
        cardRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      }
    }

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)

      if (!dragStarted) {
        // Below threshold — interpret as a click on the header → expand.
        onExpand()
        return
      }

      endBodyUnselect()
      if (cardRef.current) {
        cardRef.current.style.willChange = ''
        cardRef.current.style.transition = ''
        cardRef.current.style.transform = ''
        cardRef.current.style.cursor = ''
      }

      // Snap to nearest viewport corner, persist. The next React render reads
      // geometry from useSyncExternalStore and re-anchors via top/right etc.
      const finalCorner = nearestCorner(ev.clientX, ev.clientY)
      if (finalCorner !== geometry.corner) {
        setDockGeometry({ ...geometry, corner: finalCorner })
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }

  const onResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if (!cardRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const startW = cardRef.current.offsetWidth
    const startH = cardRef.current.offsetHeight
    const startX = e.clientX
    const startY = e.clientY

    // Width/height grow in the direction the resize grip moves AWAY from the
    // anchor. Grip lives at the corner OPPOSITE the anchor:
    //   anchor right (isLeft=false) → grip on the dock's left edge → moving
    //   the cursor LEFT (negative dx) grows width → xMult = -1
    const xMult = isLeft ? 1 : -1
    const yMult = isTop ? 1 : -1

    let lastW = startW
    let lastH = startH

    startBodyUnselect()
    if (cardRef.current) {
      cardRef.current.style.willChange = 'width, height'
      cardRef.current.style.transition = 'none'
    }

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const newW = clamp(startW + xMult * dx, MIN_WIDTH, MAX_WIDTH)
      const newH = clamp(startH + yMult * dy, MIN_HEIGHT, MAX_HEIGHT)
      if (cardRef.current) {
        cardRef.current.style.width = `${newW}px`
        cardRef.current.style.height = `${newH}px`
      }
      lastW = newW
      lastH = newH
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      endBodyUnselect()
      if (cardRef.current) {
        cardRef.current.style.willChange = ''
        cardRef.current.style.transition = ''
      }
      // Commit. React render will set width/height from geometry, replacing
      // the inline values — they should be identical so no visual jump.
      if (lastW !== geometry.width || lastH !== geometry.height) {
        setDockGeometry({ ...geometry, width: lastW, height: lastH })
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }

  // Position style — only one of top/bottom and one of left/right is set, so
  // React's diff cleanly removes the unused property when the corner changes.
  const positionStyle: CSSProperties = {
    [isTop ? 'top' : 'bottom']: ANCHOR_MARGIN,
    [isLeft ? 'left' : 'right']: ANCHOR_MARGIN,
  }
  const transformOriginCorner = `${isTop ? 'top' : 'bottom'} ${isLeft ? 'left' : 'right'}`

  // Resize grip lives at the corner OPPOSITE the anchor and uses the matching
  // diagonal cursor (NW-SE or NE-SW) so the visual affordance matches the
  // drag direction the user can move it in.
  const gripStyle: CSSProperties = {
    position: 'absolute',
    [isTop ? 'bottom' : 'top']: 0,
    [isLeft ? 'right' : 'left']: 0,
    width: 16,
    height: 16,
    cursor:
      geometry.corner === 'tl' || geometry.corner === 'br'
        ? 'nwse-resize'
        : 'nesw-resize',
    zIndex: 3,
    // Subtle visual hint — diagonal stripe via gradient. Hidden on hover so
    // it doesn't compete with the close button across from it.
    background:
      'linear-gradient(' +
      (geometry.corner === 'tl' || geometry.corner === 'br' ? '135deg' : '45deg') +
      ', transparent 65%, var(--ink-faint) 65%, var(--ink-faint) 70%, transparent 70%, transparent 80%, var(--ink-faint) 80%, var(--ink-faint) 85%, transparent 85%)',
    opacity: 0.6,
    touchAction: 'none',
  }

  return (
    <div
      ref={cardRef}
      className="hidden md:flex flex-col"
      style={{
        position: 'fixed',
        ...positionStyle,
        width: geometry.width,
        height: geometry.height,
        borderRadius: 8,
        border: '1px solid var(--line)',
        background: 'var(--bg-elev)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        zIndex: 50,
        opacity: mounted ? 1 : 0,
        // Mount animation only — drag/resize own transform via ref mutation,
        // so once mounted we DON'T set transform from React. That avoids
        // having React re-renders during a drag overwrite the live transform.
        transform: mounted ? undefined : 'scale(0.92)',
        transformOrigin: transformOriginCorner,
        transition: 'opacity 220ms ease-out, transform 220ms ease-out',
        overflow: 'hidden',
      }}
    >
      {/*
        Header: primary expand button (real <button>, keyboard-accessible) AND
        the drag handle. PointerEvents differentiate click from drag via a 5px
        threshold — taps still expand, drags move the dock.
      */}
      <button
        type="button"
        onPointerDown={onHeaderPointerDown}
        aria-label="Open chat (drag to move)"
        className="flex items-center gap-2 shrink-0"
        style={{
          padding: '8px 12px',
          paddingRight: 36,
          borderBottom: '1px solid var(--line)',
          background: 'transparent',
          border: 0,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          cursor: 'grab',
          textAlign: 'left',
          touchAction: 'none',
        }}
      >
        <span
          className="font-serif truncate"
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', letterSpacing: -0.2 }}
        >
          Chat
        </span>
        <span
          aria-hidden
          className={isConnected ? 'liminal-breathe' : undefined}
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: dotColor,
            boxShadow: isConnected ? `0 0 4px ${dotColor}` : 'none',
            flexShrink: 0,
          }}
        />
      </button>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close chat dock"
        className="hover:opacity-70"
        style={{
          position: 'absolute',
          top: 6,
          right: 10,
          color: 'var(--ink-muted)',
          background: 'transparent',
          border: 0,
          padding: 4,
          cursor: 'pointer',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={14} />
      </button>

      <div
        ref={messagesContainerRef}
        onClick={() => {
          if (window.getSelection()?.toString()) return
          onExpand()
        }}
        className="flex-1 flex flex-col gap-2 overflow-y-auto cursor-pointer"
        style={{ padding: '8px 12px', minHeight: 0 }}
      >
        {recentMessages.length === 0 && !isWaiting ? (
          <span
            className="font-mono"
            style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: 1 }}
          >
            --- --- ---
          </span>
        ) : (
          recentMessages.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-0.5 min-w-0"
              style={{ fontSize: 12, lineHeight: 1.5 }}
            >
              <span
                className="font-mono shrink-0"
                style={{ fontSize: 10, color: 'var(--ink-muted)', letterSpacing: 0.5 }}
              >
                {m.role === 'user' ? 'you' : m.role === 'assistant' ? 'daimon' : '·'}
              </span>
              <span
                className="font-serif min-w-0"
                style={{
                  color: 'var(--ink)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.content || '—'}
              </span>
            </div>
          ))
        )}
        {isWaiting &&
          (() => {
            const last = recentMessages[recentMessages.length - 1]
            const liveStream = last?.role === 'assistant' && last.isStreaming
            if (liveStream) return null
            return (
              <div
                className="flex flex-col gap-0.5 min-w-0"
                style={{ fontSize: 12, lineHeight: 1.5 }}
                aria-live="polite"
              >
                <span
                  className="font-mono shrink-0"
                  style={{ fontSize: 10, color: 'var(--ink-muted)', letterSpacing: 0.5 }}
                >
                  daimon
                </span>
                <span
                  className="font-mono liminal-breathe"
                  style={{ color: 'var(--ink-faint)', letterSpacing: 2 }}
                >
                  …
                </span>
              </div>
            )
          })()}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSend) onSend()
        }}
        className="shrink-0 flex items-end gap-2"
        style={{
          padding: '8px 10px 10px',
          borderTop: '1px solid var(--line)',
          background: 'var(--bg)',
        }}
      >
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isWaiting}
          placeholder="Reply…"
          rows={2}
          aria-label="Type a message"
          className="flex-1 font-serif resize-none focus:outline-none"
          style={{
            fontSize: 13,
            lineHeight: 1.4,
            color: 'var(--ink)',
            background: 'transparent',
            border: 0,
            padding: '4px 6px',
            minHeight: 36,
            maxHeight: 80,
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="shrink-0 disabled:cursor-not-allowed"
          style={{
            background: canSend ? 'var(--accent)' : 'var(--bg-elev)',
            color: canSend ? 'var(--bg-elev)' : 'var(--ink-faint)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            padding: '6px 8px',
            cursor: canSend ? 'pointer' : 'not-allowed',
            opacity: canSend ? 1 : 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Send size={14} />
        </button>
      </form>

      {/*
        Resize grip — anchored to the corner OPPOSITE the dock's viewport
        anchor so dragging it moves AWAY from the anchor (the natural "grow"
        direction). PointerEvents-based for mouse + touch in one path.
      */}
      <div
        onPointerDown={onResizePointerDown}
        aria-label="Resize chat dock"
        role="separator"
        style={gripStyle}
      />
    </div>
  )
}

export const ChatDockView = memo(ChatDockViewImpl)
