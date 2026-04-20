import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { LiminalCode } from './LiminalCode'

interface LiminalMdProps {
  content: string
  /** When true, render a streaming cursor at the end. */
  streaming?: boolean
}

const components: Components = {
  // ── Code (block + inline) ──────────────────────────────────────
  code({ className, children, ...rest }) {
    const isBlock = typeof className === 'string' && className.startsWith('language-')
    if (isBlock) {
      const lang = className.replace('language-', '') || 'text'
      const code = String(children).replace(/\n$/, '')
      const looksDiff = /^[-+ ]/m.test(code) && /\n[-+]/.test(code)
      return <LiminalCode code={code} lang={lang} showDiff={looksDiff} />
    }
    return (
      <code
        className="font-mono"
        style={{
          fontSize: 11.5,
          background: 'var(--bg-deep)',
          color: 'var(--accent)',
          border: '1px solid var(--line)',
          padding: '1px 5px',
          borderRadius: 3,
        }}
        {...rest}
      >
        {children}
      </code>
    )
  },
  // ── Paragraphs ─────────────────────────────────────────────────
  p({ children }) {
    return <p className="my-1 text-ink leading-[1.65]">{children}</p>
  },
  // ── Headings ───────────────────────────────────────────────────
  h1({ children }) {
    return (
      <h2
        className="font-serif text-ink"
        style={{ fontSize: 19, fontWeight: 500, margin: '16px 0 8px', letterSpacing: -0.3 }}
      >
        {children}
      </h2>
    )
  },
  h2({ children }) {
    return (
      <h3
        className="font-serif text-ink"
        style={{ fontSize: 17, fontWeight: 500, margin: '14px 0 6px', letterSpacing: -0.3 }}
      >
        {children}
      </h3>
    )
  },
  h3({ children }) {
    return (
      <h4
        className="font-sans"
        style={{
          fontSize: 11, fontWeight: 600, color: 'var(--accent)',
          margin: '10px 0 3px', textTransform: 'uppercase', letterSpacing: 0.8,
        }}
      >
        {children}
      </h4>
    )
  },
  h4({ children }) {
    return (
      <h5
        className="font-sans text-ink-soft"
        style={{ fontSize: 12, fontWeight: 600, margin: '8px 0 2px' }}
      >
        {children}
      </h5>
    )
  },
  // ── Lists ──────────────────────────────────────────────────────
  ul({ children }) {
    return <ul className="my-1 ml-4 list-disc text-ink space-y-0.5">{children}</ul>
  },
  ol({ children }) {
    return <ol className="my-1 ml-4 list-decimal text-ink space-y-0.5 marker:font-mono marker:text-teal marker:text-xs">{children}</ol>
  },
  li({ children }) {
    return <li className="text-ink leading-[1.6]">{children}</li>
  },
  // ── Blockquotes ────────────────────────────────────────────────
  blockquote({ children }) {
    return (
      <blockquote
        className="font-serif italic text-ink-soft my-2 pl-3"
        style={{ borderLeft: '2px solid var(--accent)' }}
      >
        {children}
      </blockquote>
    )
  },
  // ── Tables ─────────────────────────────────────────────────────
  table({ children }) {
    return (
      <div
        className="my-2 overflow-hidden rounded-md"
        style={{ border: '1px solid var(--line)', background: 'var(--bg-elev)' }}
      >
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          {children}
        </table>
      </div>
    )
  },
  thead({ children }) {
    return <thead style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--line)' }}>{children}</thead>
  },
  tr({ children }) {
    return <tr>{children}</tr>
  },
  th({ children, style }) {
    return (
      <th
        className="font-sans text-ink-muted"
        style={{
          padding: '7px 12px', textAlign: 'left',
          fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6,
          fontWeight: 600,
          ...style,
        }}
      >
        {children}
      </th>
    )
  },
  td({ children, style }) {
    return (
      <td
        className="text-ink"
        style={{
          padding: '6px 12px', textAlign: 'left',
          fontSize: 12.5, borderTop: '1px solid var(--line)',
          ...style,
        }}
      >
        {children}
      </td>
    )
  },
  // ── Links / hr / emphasis ──────────────────────────────────────
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-teal underline-offset-2 hover:underline"
      >
        {children}
      </a>
    )
  },
  hr() {
    return <hr className="my-3" style={{ border: 0, borderTop: '1px solid var(--line)' }} />
  },
  strong({ children }) {
    return <strong className="text-ink" style={{ fontWeight: 600 }}>{children}</strong>
  },
  em({ children }) {
    return <em className="font-serif italic text-ink-soft">{children}</em>
  },
}

export const LiminalMd = memo(function LiminalMd({ content, streaming = false }: LiminalMdProps) {
  return (
    <div
      className="font-sans text-ink"
      style={{ fontSize: 13.5, lineHeight: 1.65 }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
      {streaming && <span className="liminal-cursor" aria-hidden />}
    </div>
  )
})
