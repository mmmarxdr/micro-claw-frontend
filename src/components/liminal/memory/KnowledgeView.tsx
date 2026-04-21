import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import type { KnowledgeDoc } from '../../../design/memoryMocks'
import { KnowledgeCard } from './KnowledgeCard'
import type { Density } from './MemoryCard'

interface KnowledgeViewProps {
  density: Density
  editorial: boolean
  docs: KnowledgeDoc[]
  loading: boolean
  error: string | null
  onUpload: (file: File) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function KnowledgeView({
  density,
  editorial,
  docs,
  loading,
  error,
  onUpload,
  onDelete,
}: KnowledgeViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const totalChunks = docs.reduce((a, k) => a + k.chunks, 0)
  const totalInjections = docs.reduce((a, k) => a + k.injections, 0)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError(null)
    try {
      // Sequential to keep ordering + server-side queue pressure sane. One file
      // at a time is fine for a human-driven UI.
      for (const file of Array.from(files)) {
        await onUpload(file)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'upload failed')
    } finally {
      setUploading(false)
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    void handleFiles(e.target.files)
    e.target.value = ''
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    void handleFiles(e.dataTransfer.files)
  }

  return (
    <>
      {editorial && (
        <div
          className="font-serif italic"
          style={{
            padding: '4px 0 20px',
            fontSize: 14,
            color: 'var(--ink-soft)',
            maxWidth: 640,
            lineHeight: 1.55,
          }}
        >
          You have handed me{' '}
          <span style={{ color: 'var(--ink)' }}>
            {docs.length} {docs.length === 1 ? 'document' : 'documents'}
          </span>
          . I've chunked them into{' '}
          <span style={{ color: 'var(--ink)' }}>{totalChunks} pieces</span>, and
          injected them into our conversations{' '}
          <span style={{ color: 'var(--accent)' }}>{totalInjections} times</span>.
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={onInputChange}
        aria-hidden
      />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="flex items-center"
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--line)'}`,
          borderRadius: 6,
          padding: '20px 24px',
          marginBottom: 16,
          gap: 14,
          background: dragOver
            ? 'color-mix(in srgb, var(--accent) 6%, transparent)'
            : 'var(--bg-elev)',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <div
          className="flex items-center justify-center font-mono"
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            fontSize: 20,
          }}
          aria-hidden
        >
          +
        </div>
        <div className="flex-1">
          <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
            Drop files here, or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="cursor-pointer underline"
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: 'var(--accent)',
                font: 'inherit',
                cursor: uploading ? 'wait' : 'pointer',
              }}
            >
              {uploading ? 'uploading…' : 'choose'}
            </button>
          </div>
          <div
            className="font-serif italic"
            style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}
          >
            I accept Markdown, plain text, PDF, Word, HTML, and zip archives.
          </div>
        </div>
      </div>

      {uploadError && (
        <div
          className="font-serif italic"
          role="alert"
          style={{
            fontSize: 12.5,
            color: 'var(--red)',
            padding: '6px 12px',
            marginBottom: 12,
          }}
        >
          {uploadError}
        </div>
      )}

      {loading ? (
        <KnowledgeStatus text="Reading what you've given me…" />
      ) : error ? (
        <KnowledgeStatus
          text={`Something went wrong reaching the knowledge base — ${error}`}
          tone="error"
        />
      ) : docs.length === 0 ? (
        <KnowledgeStatus text="Nothing indexed yet — drop a file above to start." />
      ) : (
        <div className="grid" style={{ gap: density === 'dense' ? 8 : 12 }}>
          {docs.map((k) => (
            <KnowledgeCard
              key={k.id}
              kn={k}
              density={density}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface KnowledgeStatusProps {
  text: string
  tone?: 'neutral' | 'error'
}

function KnowledgeStatus({ text, tone = 'neutral' }: KnowledgeStatusProps) {
  return (
    <div
      className="font-serif italic"
      role={tone === 'error' ? 'alert' : 'status'}
      style={{
        padding: '28px 12px',
        textAlign: 'center',
        fontSize: 13.5,
        color: tone === 'error' ? 'var(--red)' : 'var(--ink-muted)',
      }}
    >
      {text}
    </div>
  )
}
