import { useMemo } from 'react'

import { useInfiniteConversationMessages } from './useInfiniteConversationMessages'

/**
 * Return shape for consumers of useResumeSession.
 *
 * - `canContinue`: true when the most recent message in the loaded history
 *   is from the user (no assistant reply yet). Surfaces the "Continuar"
 *   button in the UI. Rare in practice — backend keeps processMessage
 *   running under the server-level ctx so turns survive WS disconnects —
 *   but the button is cheap and covers agent crashes / provider outages.
 * - `continueTurn()`: sends a `continue_turn` WS frame via the provided
 *   `send` function from useWebSocket.
 */
export interface ResumeSession {
  canContinue: boolean
  isLoading: boolean
  hasOlder: boolean
  loadOlder: () => Promise<unknown>
  continueTurn: () => boolean
}

/**
 * Derive the Resume UX state for a specific conversation. Pass `null` for
 * convID when the user is not resuming — all flags return falsy / no-op.
 *
 * @param convID        The conversation being resumed, or null.
 * @param send          The WS `send` function from useWebSocket.
 */
export function useResumeSession(
  convID: string | null,
  send: (data: unknown) => boolean,
): ResumeSession {
  const query = useInfiniteConversationMessages(convID)

  const canContinue = useMemo(() => {
    if (!convID) return false
    if (!query.data || query.data.pages.length === 0) return false
    // Pages arrive newest-first; the first page holds the latest window.
    const firstPage = query.data.pages[0]
    if (firstPage.messages.length === 0) return false
    const last = firstPage.messages[firstPage.messages.length - 1]
    return last.role === 'user'
  }, [convID, query.data])

  return {
    canContinue,
    isLoading: query.isLoading,
    hasOlder: query.hasNextPage ?? false,
    loadOlder: () => query.fetchNextPage(),
    continueTurn: () => send({ type: 'continue_turn' }),
  }
}
