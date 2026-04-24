import { useCallback, useEffect, useRef, useState } from 'react'
import { createWebSocket } from '../api/client'

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketOptions {
  path: string
  onMessage: (data: unknown) => void
  enabled?: boolean
  /**
   * Optional query params appended to the WS URL. Preserved across
   * auto-reconnects — Resume relies on this to keep the same
   * conversation_id after a network blip.
   */
  searchParams?: Record<string, string>
}

export function useWebSocket({ path, onMessage, enabled = true, searchParams }: UseWebSocketOptions) {
  const [status, setStatus] = useState<WsStatus>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  const retryCount = useRef(0)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  // Capture the searchParams in a ref so the connect closure always reads
  // the latest value without re-creating the callback (and re-triggering
  // the effect) on every render.
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  const connect = useCallback(() => {
    if (!enabled) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    const ws = createWebSocket(path, searchParamsRef.current)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      retryCount.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessageRef.current(data)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onerror = () => {
      setStatus('error')
    }

    ws.onclose = () => {
      setStatus('disconnected')
      wsRef.current = null
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30_000)
      retryCount.current += 1
      retryTimer.current = setTimeout(connect, delay)
    }
  }, [path, enabled])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
      return true
    }
    return false
  }, [])

  const disconnect = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current)
    wsRef.current?.close()
    wsRef.current = null
    setStatus('disconnected')
  }, [])

  useEffect(() => {
    if (enabled) connect()
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
      wsRef.current?.close()
    }
  }, [connect, enabled])

  return { status, send, disconnect, connect }
}
