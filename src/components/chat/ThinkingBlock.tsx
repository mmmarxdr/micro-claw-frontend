export interface ThinkingBlockProps {
  reasoning?: string
  isStreaming: boolean
  hasTextStarted: boolean
  thinkingStartedAt?: Date
  textStartedAt?: Date
}

function formatDuration(start?: Date, end?: Date): string {
  if (!start || !end) return '?'
  const ms = end.getTime() - start.getTime()
  return `${Math.round(ms / 1000)}s`
}

export function ThinkingBlock({
  reasoning,
  isStreaming,
  hasTextStarted,
  thinkingStartedAt,
  textStartedAt,
}: ThinkingBlockProps) {
  // Render nothing if no reasoning content
  if (!reasoning) return null

  const duration = formatDuration(thinkingStartedAt, textStartedAt)

  if (isStreaming && !hasTextStarted) {
    // Streaming state: expanded, show live content
    return (
      <details open className="mb-2 rounded-md bg-surface border border-border overflow-hidden">
        <summary className="px-3 py-2 text-xs font-medium text-text-secondary cursor-pointer select-none list-none flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
          Thinking...
        </summary>
        <pre className="px-3 py-2 text-xs text-text-disabled whitespace-pre-wrap overflow-auto max-h-48 font-mono">
          {reasoning}
        </pre>
      </details>
    )
  }

  if (hasTextStarted || (!isStreaming && reasoning)) {
    // Auto-collapsed state after text began
    return (
      <details className="mb-2 rounded-md bg-surface border border-border overflow-hidden">
        <summary className="px-3 py-2 text-xs font-medium text-text-secondary cursor-pointer select-none list-none flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-text-disabled" />
          Thought for {duration}
        </summary>
        <pre className="px-3 py-2 text-xs text-text-disabled whitespace-pre-wrap overflow-auto max-h-48 font-mono">
          {reasoning}
        </pre>
      </details>
    )
  }

  return null
}
