import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { ToolInfo } from '../api/client'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Terminal, FileText, Globe, Wrench, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'

const TOOL_ICONS: Record<string, typeof Terminal> = {
  shell_exec: Terminal,
  read_file: FileText,
  write_file: FileText,
  list_files: FileText,
  http_fetch: Globe,
  batch_exec: Terminal,
}

const TOOL_CATEGORIES: Record<string, string> = {
  shell_exec: 'Shell',
  read_file: 'File',
  write_file: 'File',
  list_files: 'File',
  http_fetch: 'HTTP',
  batch_exec: 'Shell',
  search_output: 'Search',
  schedule_task: 'Cron',
  list_crons: 'Cron',
  delete_cron: 'Cron',
  load_skill: 'Skills',
}

function ToolCard({ tool }: { tool: ToolInfo }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICONS[tool.name] ?? Wrench
  const category = TOOL_CATEGORIES[tool.name] ?? 'Plugin'

  const schema = tool.schema as { properties?: Record<string, { type?: string; description?: string }>; required?: string[] }
  const params = schema?.properties ?? {}
  const required = schema?.required ?? []

  return (
    <Card className="p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-hover-surface transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-hover-surface shrink-0">
          <Icon size={15} className="text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary font-mono">{tool.name}</span>
            <Badge variant="default">{category}</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 truncate">{tool.description}</p>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            'text-text-disabled transition-transform shrink-0',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-surface">
          {Object.keys(params).length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Parameters</p>
              {Object.entries(params).map(([name, def]) => (
                <div key={name} className="flex items-baseline gap-2">
                  <code className="text-xs font-mono text-accent">{name}</code>
                  <span className="text-xs text-text-disabled">{def.type ?? 'string'}</span>
                  {required.includes(name) && (
                    <Badge variant="accent">required</Badge>
                  )}
                  {def.description && (
                    <span className="text-xs text-text-secondary">— {def.description}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-disabled">No parameters.</p>
          )}
        </div>
      )}
    </Card>
  )
}

export function ToolsPage() {
  const { data: tools, isLoading, isError } = useQuery<ToolInfo[]>({
    queryKey: ['tools'],
    queryFn: api.tools,
    staleTime: 60_000,
  })

  return (
    <div className="px-6 md:px-10 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">Tools</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Tools available to the agent during conversations.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(k => (
            <div key={k} className="h-16 animate-pulse bg-surface rounded-md border border-border" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-error">Failed to load tools.</p>
      )}

      {!isLoading && !isError && tools && (
        <>
          <p className="text-xs text-text-disabled mb-4">{tools.length} tools registered</p>
          <div className="space-y-2">
            {tools
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(tool => (
                <ToolCard key={tool.name} tool={tool} />
              ))}
          </div>
        </>
      )}
    </div>
  )
}
