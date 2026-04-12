import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemory } from '../hooks/useApi'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { FormField } from '../components/ui/FormField'
import { TagInput } from '../components/ui/TagInput'
import { Brain, ExternalLink, Plus, Trash2 } from 'lucide-react'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function SkeletonEntry() {
  return (
    <div className="border-b border-border py-4 space-y-2">
      <div className="h-4 w-3/4 animate-pulse bg-hover-surface rounded" />
      <div className="h-4 w-full animate-pulse bg-hover-surface rounded" />
      <div className="flex gap-2 pt-1">
        <div className="h-5 w-14 animate-pulse bg-hover-surface rounded-sm" />
        <div className="h-5 w-10 animate-pulse bg-hover-surface rounded-sm" />
      </div>
    </div>
  )
}

export function MemoryPage() {
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const qc = useQueryClient()

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  const { data, isLoading, isError } = useMemory(debouncedQuery)

  const items = data?.items ?? []

  const { mutate: clearMemory, isPending: isClearing } = useMutation({
    mutationFn: api.deleteMemory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory'] })
      setToast({ message: 'Memory cleared.', variant: 'success' })
    },
    onError: () => setToast({ message: 'Failed to clear memory.', variant: 'error' }),
  })

  const { mutate: addEntry, isPending: isSubmitting } = useMutation({
    mutationFn: () => api.postMemory(newContent.trim(), newTags),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory'] })
      setNewContent('')
      setNewTags([])
      setIsAdding(false)
      setToast({ message: 'Memory entry added.', variant: 'success' })
    },
    onError: () => setToast({ message: 'Failed to add entry.', variant: 'error' }),
  })

  const { mutate: deleteEntry } = useMutation({
    mutationFn: (id: string) => api.deleteMemoryEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory'] })
      setToast({ message: 'Entry deleted.', variant: 'success' })
    },
    onError: () => setToast({ message: 'Failed to delete entry.', variant: 'error' }),
  })

  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Delete this memory entry?')) {
      deleteEntry(id)
    }
  }

  const handleClearAll = () => {
    if (window.confirm('Clear all memory entries? This cannot be undone.')) {
      clearMemory()
    }
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setNewContent('')
    setNewTags([])
  }

  return (
    <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1200px] mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Memory</h1>
          <p className="text-sm text-text-secondary mt-1">Search and manage agent long-term memory entries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
          >
            <Plus size={14} />
            New entry
          </Button>
          {items.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              disabled={isClearing}
            >
              {isClearing ? 'Clearing…' : 'Clear All'}
            </Button>
          )}
        </div>
      </div>

      {/* Add entry form */}
      {isAdding && (
        <div className="mb-6 border border-border rounded-md p-5 bg-surface">
          <div className="space-y-3">
            <FormField label="Content" required>
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                rows={3}
                placeholder="What should the agent remember?"
                className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong resize-none"
              />
            </FormField>
            <FormField label="Tags" hint="Optional — press Enter to add.">
              <TagInput value={newTags} onChange={setNewTags} placeholder="tag1, tag2…" />
            </FormField>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={handleCancelAdd}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => addEntry()}
                disabled={!newContent.trim() || isSubmitting}
              >
                {isSubmitting ? 'Adding…' : 'Add entry'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search input — underline style */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search memory…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full max-w-md bg-transparent border-b border-border px-0 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong transition-colors"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonEntry key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <p className="text-sm text-error">Failed to load memory entries.</p>
      )}

      {/* Empty state */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="text-center py-16">
          <Brain size={36} className="mx-auto mb-3 text-text-disabled" />
          <p className="text-sm text-text-secondary">
            {debouncedQuery
              ? `No results for "${debouncedQuery}".`
              : 'No memory entries yet.'}
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !isError && items.length > 0 && (
        <div>
          {items.map((entry) => (
            <div
              key={entry.id}
              className="border-b border-border py-4"
            >
              {/* Content */}
              <p className="text-sm text-text-primary leading-relaxed mb-3">
                {entry.content}
              </p>

              {/* Tags */}
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {entry.tags.map((tag) => (
                    <Badge key={tag} variant="accent">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-text-disabled font-mono">
                  {relativeTime(entry.created_at)}
                </span>
                <div className="flex items-center gap-3">
                  {entry.source_conversation_id && (
                    <Link
                      to={`/conversations/${entry.source_conversation_id}`}
                      className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-medium"
                    >
                      <ExternalLink size={11} />
                      Conversation
                    </Link>
                  )}
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="inline-flex items-center gap-1 text-xs text-text-disabled hover:text-error transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
