import { useQuery } from '@tanstack/react-query'
import { useState, type CSSProperties } from 'react'
import { Terminal, FileText, Globe, Wrench, ChevronDown } from 'lucide-react'
import { api } from '../api/client'
import type { ToolInfo } from '../api/client'
import { LiminalGlyph } from '../components/liminal/LiminalGlyph'

// ─── Categorization ─────────────────────────────────────────────────────────

const TOOL_ICONS: Record<string, typeof Terminal> = {
  shell_exec: Terminal,
  read_file: FileText,
  write_file: FileText,
  list_files: FileText,
  http_fetch: Globe,
  batch_exec: Terminal,
}

const TOOL_CATEGORIES: Record<string, string> = {
  shell_exec: 'shell',
  read_file: 'file',
  write_file: 'file',
  list_files: 'file',
  http_fetch: 'http',
  batch_exec: 'shell',
  search_output: 'search',
  schedule_task: 'cron',
  list_crons: 'cron',
  delete_cron: 'cron',
  load_skill: 'skills',
}

// ─── Liminal primitives ─────────────────────────────────────────────────────

const cardBaseStyle: CSSProperties = {
  background: 'var(--bg-elev)',
  border: '1px solid var(--line)',
  borderRadius: 6,
}

const labelStyle: CSSProperties = {
  fontSize: 10.5,
  letterSpacing: 0.8,
  color: 'var(--ink-muted)',
  textTransform: 'uppercase',
}

// ─── ToolCard ────────────────────────────────────────────────────────────────

function ToolCard({ tool }: { tool: ToolInfo }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICONS[tool.name] ?? Wrench
  const category = TOOL_CATEGORIES[tool.name] ?? 'plugin'

  const schema = tool.schema as { properties?: Record<string, { type?: string; description?: string }>; required?: string[] }
  const params = schema?.properties ?? {}
  const required = schema?.required ?? []

  return (
    <div style={{ ...cardBaseStyle, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center"
        style={{
          width: '100%',
          gap: 14,
          padding: '14px 18px',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 4%, transparent)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 20%, var(--line))',
            flexShrink: 0,
          }}
        >
          <Icon size={15} style={{ color: 'var(--accent)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-baseline" style={{ gap: 10 }}>
            <span
              className="font-mono"
              style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}
            >
              {tool.name}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 9.5,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
                padding: '2px 7px',
                borderRadius: 3,
                border: '1px solid var(--line)',
                background: 'transparent',
              }}
            >
              {category}
            </span>
          </div>
          <p
            className="font-serif italic"
            style={{
              fontSize: 12.5,
              color: 'var(--ink-soft)',
              margin: 0,
              marginTop: 3,
              lineHeight: 1.45,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tool.description}
          </p>
        </div>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--ink-faint)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 160ms ease',
            flexShrink: 0,
          }}
        />
      </button>

      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--line)',
            padding: '14px 18px 16px',
            background: 'color-mix(in srgb, var(--accent) 2%, var(--bg-elev))',
          }}
        >
          {Object.keys(params).length > 0 ? (
            <>
              <div className="font-mono" style={{ ...labelStyle, marginBottom: 10 }}>
                parameters
              </div>
              <div className="flex flex-col" style={{ gap: 7 }}>
                {Object.entries(params).map(([name, def]) => (
                  <div
                    key={name}
                    className="flex items-baseline"
                    style={{ gap: 8, flexWrap: 'wrap' }}
                  >
                    <code
                      className="font-mono"
                      style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}
                    >
                      {name}
                    </code>
                    <span
                      className="font-mono"
                      style={{ fontSize: 11, color: 'var(--ink-faint)' }}
                    >
                      {def.type ?? 'string'}
                    </span>
                    {required.includes(name) && (
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 9.5,
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                          color: 'var(--accent)',
                          padding: '1px 6px',
                          borderRadius: 3,
                          border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                          background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                        }}
                      >
                        required
                      </span>
                    )}
                    {def.description && (
                      <span
                        className="font-serif italic"
                        style={{ fontSize: 12, color: 'var(--ink-soft)' }}
                      >
                        — {def.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p
              className="font-serif italic"
              style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: 0 }}
            >
              no parameters.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ToolsPage() {
  const { data: tools, isLoading, isError } = useQuery<ToolInfo[]>({
    queryKey: ['tools'],
    queryFn: api.tools,
    staleTime: 60_000,
  })

  const sorted = tools ? [...tools].sort((a, b) => a.name.localeCompare(b.name)) : []

  return (
    <div
      style={{
        padding: '28px 32px 40px',
        maxWidth: 760,
        margin: '0 auto',
      }}
    >
      {/* Preamble */}
      <div style={{ marginBottom: 28 }}>
        <div className="flex items-baseline" style={{ gap: 14, marginBottom: 6 }}>
          <LiminalGlyph size={20} animate />
          <h1
            className="font-serif"
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 500,
              color: 'var(--ink)',
              letterSpacing: -0.6,
            }}
          >
            <span className="italic" style={{ color: 'var(--accent)', fontWeight: 400 }}>
              what I can do
            </span>
            <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>&nbsp;·&nbsp;</span>
            <span>tools</span>
          </h1>
        </div>
        <p
          className="font-serif italic"
          style={{
            fontSize: 14.5,
            color: 'var(--ink-soft)',
            maxWidth: 560,
            lineHeight: 1.55,
            marginLeft: 34,
            marginTop: 0,
          }}
        >
          every capability the agent has at its disposal during a conversation —
          click any tool to inspect its parameters.
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex flex-col" style={{ gap: 8 }}>
          {[1, 2, 3, 4].map((k) => (
            <div
              key={k}
              style={{
                ...cardBaseStyle,
                height: 64,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div
          style={{
            ...cardBaseStyle,
            padding: '20px 22px',
            borderColor: 'color-mix(in srgb, var(--red) 35%, var(--line))',
          }}
        >
          <p
            className="font-serif italic"
            style={{ fontSize: 13.5, color: 'var(--red)', margin: 0 }}
          >
            failed to load tools.
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && !isError && tools && (
        <>
          <p
            className="font-mono"
            style={{
              fontSize: 10.5,
              letterSpacing: 0.6,
              color: 'var(--ink-faint)',
              marginBottom: 14,
              textTransform: 'uppercase',
            }}
          >
            {tools.length} {tools.length === 1 ? 'tool' : 'tools'} registered
          </p>
          <div className="flex flex-col" style={{ gap: 8 }}>
            {sorted.map((tool) => (
              <ToolCard key={tool.name} tool={tool} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
