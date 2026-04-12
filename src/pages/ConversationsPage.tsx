import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useConversations } from '../hooks/useApi'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { MessageSquare, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'

const PAGE_SIZE = 20

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function channelVariant(channel: string): 'accent' | 'default' {
  const accentChannels = ['cli', 'telegram', 'discord', 'dashboard']
  return accentChannels.includes(channel.toLowerCase()) ? 'accent' : 'default'
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[120px_1fr_36px] lg:grid-cols-[120px_1fr_120px_60px_36px] gap-4 items-center px-4 py-3 border-b border-border last:border-0">
      <div className="h-5 w-16 animate-pulse bg-hover-surface rounded-sm" />
      <div className="flex-1 h-4 animate-pulse bg-hover-surface rounded" />
      <div className="h-4 w-20 animate-pulse bg-hover-surface rounded hidden lg:block" />
      <div className="h-4 w-10 animate-pulse bg-hover-surface rounded hidden lg:block" />
      <div className="h-6 w-6 animate-pulse bg-hover-surface rounded" />
    </div>
  )
}

export function ConversationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [channelFilter, setChannelFilter] = useState('')
  const qc = useQueryClient()

  const { data, isLoading, isError } = useConversations({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    channel: channelFilter || undefined,
  })

  const { mutate: deleteConv } = useMutation({
    mutationFn: (id: string) => api.deleteConversation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChannelFilter(e.target.value)
    setPage(0)
  }

  return (
    <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-text-primary">Conversations</h1>
        <p className="text-sm text-text-secondary mt-1">Browse and inspect conversation history.</p>
      </div>

      {/* Search / filter */}
      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Filter by channel (e.g. cli, telegram)…"
          value={channelFilter}
          onChange={handleSearch}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="border-t border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[120px_1fr_36px] lg:grid-cols-[120px_1fr_120px_60px_36px] gap-4 px-4 py-3 border-b border-border">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Channel</span>
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Preview</span>
            <span className={cn('text-xs font-medium text-text-secondary uppercase tracking-wide', 'hidden lg:block')}>Last activity</span>
            <span className={cn('text-xs font-medium text-text-secondary uppercase tracking-wide text-right', 'hidden lg:block')}>Msgs</span>
            <span />
          </div>

          {/* Loading */}
          {isLoading && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </>
          )}

          {/* Error */}
          {isError && (
            <div className="px-4 py-8 text-center text-sm text-error">
              Failed to load conversations.
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && data?.items.length === 0 && (
            <div className="px-4 py-12 text-center">
              <MessageSquare size={32} className="mx-auto mb-3 text-text-disabled" />
              <p className="text-sm text-text-secondary">No conversations yet.</p>
            </div>
          )}

          {/* Rows */}
          {!isLoading &&
            !isError &&
            data?.items.map((conv) => {
              const preview = conv.last_message
                ? conv.last_message.slice(0, 80) + (conv.last_message.length > 80 ? '…' : '')
                : '(no messages)'

              return (
                <div
                  key={conv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/conversations/${conv.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/conversations/${conv.id}`)
                  }}
                  className="group grid grid-cols-[120px_1fr_36px] lg:grid-cols-[120px_1fr_120px_60px_36px] gap-4 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-hover-surface cursor-pointer transition-colors focus:outline-none focus:bg-accent-light"
                >
                  <div>
                    <Badge variant={channelVariant(conv.channel_id)}>
                      {conv.channel_id}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-primary truncate">{preview}</p>
                  <p className="text-xs text-text-secondary font-mono hidden lg:block">
                    {relativeTime(conv.updated_at)}
                  </p>
                  <p className="text-xs text-text-secondary font-mono text-right hidden lg:block">
                    {conv.message_count}
                  </p>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-error hover:bg-error/10 p-1.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm('Delete this conversation?')) {
                          deleteConv(conv.id)
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && !isError && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-text-secondary font-mono">
            Page {page + 1} of {totalPages} &mdash; {data?.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft size={14} />
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
