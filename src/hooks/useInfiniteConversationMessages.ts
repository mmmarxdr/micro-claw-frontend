import { useInfiniteQuery } from '@tanstack/react-query'

import { api, MessagesPage } from '../api/client'

const PAGE_SIZE = 50

/**
 * Load a conversation's messages in cursor-based pages (newest → oldest).
 *
 * The backend returns a window of the most recent `limit` messages when
 * `before` is unset. Subsequent pages pass the previous page's
 * `oldest_index` as `before` to fetch older messages.
 *
 * Pass `null` for convID to disable the query (e.g., when the user is not
 * resuming a specific conversation).
 */
export function useInfiniteConversationMessages(convID: string | null) {
  return useInfiniteQuery<MessagesPage>({
    queryKey: ['conversation-messages', convID],
    enabled: !!convID,
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) => {
      if (!convID) throw new Error('useInfiniteConversationMessages: convID is null')
      const params: { before?: number; limit: number } = { limit: PAGE_SIZE }
      if (typeof pageParam === 'number') params.before = pageParam
      return api.conversationMessages(convID, params)
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.oldest_index : undefined,
  })
}
