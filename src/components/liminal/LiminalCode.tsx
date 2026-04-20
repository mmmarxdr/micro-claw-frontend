import { useMemo, useState } from 'react'
import { CODE_PALETTE } from '../../design/tokens'

interface LiminalCodeProps {
  code: string
  lang?: string
  showDiff?: boolean
  compact?: boolean
  highlightLine?: number | null
  /** Hide the chrome bar (lang label, copy/apply buttons). Default false. */
  hideChrome?: boolean
  /** Show "apply" button (used when code is a proposed edit). Default false. */
  applicable?: boolean
}

type TokenKind = keyof typeof CODE_PALETTE
type Token = { t: TokenKind | 'plain'; v: string }

interface LangConfig {
  keywords: Set<string>
  /** Line comment marker (e.g. "//", "#"). Undefined → no line comments. */
  lineComment?: string
}

const TS_KW = new Set([
  'const', 'let', 'var', 'function', 'async', 'await', 'return',
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'class', 'extends', 'new', 'this', 'super',
  'import', 'export', 'from', 'default', 'as',
  'try', 'catch', 'throw', 'finally',
  'type', 'interface', 'enum', 'void', 'boolean', 'number', 'string', 'any',
  'true', 'false', 'null', 'undefined', 'never', 'unknown',
])

const GO_KW = new Set([
  // keywords
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
  'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
  'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var',
  // predeclared
  'true', 'false', 'nil', 'iota',
  'bool', 'byte', 'complex64', 'complex128', 'error',
  'float32', 'float64',
  'int', 'int8', 'int16', 'int32', 'int64',
  'rune', 'string',
  'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uintptr',
  'any',
])

const PY_KW = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
  'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
  'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
  'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
  'try', 'while', 'with', 'yield',
  'self', 'cls',
])

const RUST_KW = new Set([
  'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn',
  'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in',
  'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return',
  'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type',
  'unsafe', 'use', 'where', 'while', 'box',
  'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
  'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
  'f32', 'f64', 'bool', 'char', 'str',
])

const BASH_KW = new Set([
  'if', 'then', 'else', 'elif', 'fi', 'case', 'esac',
  'for', 'while', 'until', 'do', 'done', 'function',
  'in', 'return', 'exit', 'break', 'continue',
  'local', 'export', 'declare', 'readonly', 'source', 'unset',
  'true', 'false',
])

const JSON_KW = new Set(['true', 'false', 'null'])

const SQL_KW = new Set([
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'AND', 'OR', 'NOT',
  'NULL', 'IS', 'IN', 'BETWEEN', 'LIKE', 'ORDER', 'BY', 'GROUP', 'HAVING',
  'LIMIT', 'OFFSET', 'DISTINCT', 'UNION', 'ALL',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'DEFAULT', 'UNIQUE',
])

const LANGS: Record<string, LangConfig> = {
  ts:         { keywords: TS_KW,  lineComment: '//' },
  typescript: { keywords: TS_KW,  lineComment: '//' },
  tsx:        { keywords: TS_KW,  lineComment: '//' },
  js:         { keywords: TS_KW,  lineComment: '//' },
  javascript: { keywords: TS_KW,  lineComment: '//' },
  jsx:        { keywords: TS_KW,  lineComment: '//' },
  go:         { keywords: GO_KW,  lineComment: '//' },
  golang:     { keywords: GO_KW,  lineComment: '//' },
  rust:       { keywords: RUST_KW, lineComment: '//' },
  rs:         { keywords: RUST_KW, lineComment: '//' },
  python:     { keywords: PY_KW,  lineComment: '#' },
  py:         { keywords: PY_KW,  lineComment: '#' },
  bash:       { keywords: BASH_KW, lineComment: '#' },
  sh:         { keywords: BASH_KW, lineComment: '#' },
  shell:      { keywords: BASH_KW, lineComment: '#' },
  zsh:        { keywords: BASH_KW, lineComment: '#' },
  json:       { keywords: JSON_KW },
  sql:        { keywords: SQL_KW, lineComment: '--' },
}

function highlightCode(code: string, cfg: LangConfig): Token[] {
  const tokens: Token[] = []
  const lc = cfg.lineComment
  let i = 0
  while (i < code.length) {
    // Line comment
    if (lc && code.startsWith(lc, i)) {
      const e = code.indexOf('\n', i)
      const end = e === -1 ? code.length : e
      tokens.push({ t: 'comment', v: code.slice(i, end) })
      i = end
      continue
    }
    // String literal — ", ', or `
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const q = code[i]
      let j = i + 1
      while (j < code.length && code[j] !== q) {
        if (code[j] === '\\') j++
        j++
      }
      tokens.push({ t: 'string', v: code.slice(i, j + 1) })
      i = j + 1
      continue
    }
    // Number
    if (/[0-9]/.test(code[i])) {
      let j = i
      while (j < code.length && /[0-9_.]/.test(code[j])) j++
      tokens.push({ t: 'number', v: code.slice(i, j) })
      i = j
      continue
    }
    // Identifier or keyword
    if (/[A-Za-z_$]/.test(code[i])) {
      let j = i
      while (j < code.length && /[A-Za-z0-9_$]/.test(code[j])) j++
      const v = code.slice(i, j)
      const isKeyword = cfg.keywords.has(v)
      if (isKeyword) tokens.push({ t: 'keyword', v })
      else if (/^[A-Z]/.test(v)) tokens.push({ t: 'type', v })
      else if (code[j] === '(') tokens.push({ t: 'fn', v })
      else tokens.push({ t: 'ident', v })
      i = j
      continue
    }
    tokens.push({ t: 'punct', v: code[i] })
    i++
  }
  return tokens
}

function tokenize(code: string, lang: string): Token[] {
  const cfg = LANGS[lang.toLowerCase()]
  if (cfg) return highlightCode(code, cfg)
  return [{ t: 'plain', v: code }]
}

function tokensToLines(tokens: Token[]) {
  const lines: Array<Array<{ color: string; text: string }>> = []
  let cur: Array<{ color: string; text: string }> = []
  tokens.forEach((tk) => {
    const color = tk.t === 'plain' ? CODE_PALETTE.ident : CODE_PALETTE[tk.t]
    const parts = tk.v.split('\n')
    parts.forEach((p, pi) => {
      if (p.length) cur.push({ color, text: p })
      if (pi < parts.length - 1) {
        lines.push(cur)
        cur = []
      }
    })
  })
  if (cur.length) lines.push(cur)
  if (lines.length === 0) lines.push([])
  return lines
}

export function LiminalCode({
  code,
  lang = 'text',
  showDiff = false,
  compact = false,
  highlightLine = null,
  hideChrome = false,
  applicable = false,
}: LiminalCodeProps) {
  const [copied, setCopied] = useState(false)
  const lines = useMemo(() => tokensToLines(tokenize(code, lang)), [code, lang])
  const rawLines = useMemo(() => code.split('\n'), [code])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch { /* clipboard blocked — silent */ }
  }

  return (
    <div
      className="font-mono overflow-hidden rounded-md"
      style={{
        background: 'var(--bg-code)',
        border: '1px solid rgba(234,229,216,0.12)',
        margin: compact ? '4px 0' : '10px 0',
      }}
    >
      {!hideChrome && (
        <div
          className="flex items-center gap-2.5 px-3"
          style={{
            padding: '7px 12px',
            borderBottom: '1px solid rgba(234,229,216,0.08)',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.025), transparent)',
          }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: 2,
              background: '#5dbfa7', boxShadow: '0 0 6px rgba(93,191,167,0.5)',
            }}
          />
          <span
            className="font-mono"
            style={{ fontSize: 10.5, color: '#8a8275', letterSpacing: 0.5 }}
          >
            {lang}
          </span>
          {showDiff && (
            <span
              className="font-mono"
              style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 2,
                background: 'rgba(93,191,167,0.12)', color: '#5dbfa7',
                border: '1px solid rgba(93,191,167,0.25)',
              }}
            >
              diff
            </span>
          )}
          <span style={{ flex: 1 }} />
          <button
            onClick={onCopy}
            className="font-mono"
            style={{
              fontSize: 10.5, color: '#8a8275', cursor: 'pointer', background: 'transparent',
              padding: '2px 8px', border: '1px solid rgba(234,229,216,0.12)', borderRadius: 3,
            }}
          >
            {copied ? 'copied' : 'copy'}
          </button>
          {applicable && (
            <button
              className="font-mono"
              style={{
                fontSize: 10.5, color: '#5dbfa7', cursor: 'pointer',
                padding: '2px 8px', border: '1px solid rgba(93,191,167,0.3)', borderRadius: 3,
                background: 'rgba(93,191,167,0.08)',
              }}
            >
              apply
            </button>
          )}
        </div>
      )}
      <div className="flex" style={{ fontSize: 11.5, lineHeight: 1.7 }}>
        <div
          className="font-mono select-none"
          style={{
            padding: '10px 6px 10px 14px', color: '#4a4438', textAlign: 'right',
            borderRight: '1px solid rgba(234,229,216,0.05)', fontSize: 10.5,
          }}
        >
          {lines.map((_, i) => (
            <div key={i} style={{ lineHeight: 1.7 }}>{i + 1}</div>
          ))}
        </div>
        <pre
          style={{
            margin: 0, padding: '10px 14px', flex: 1, overflow: 'auto',
            whiteSpace: 'pre', color: '#e5dfd0',
          }}
        >
          {lines.map((spans, i) => {
            const raw = rawLines[i] || ''
            const isPlus = showDiff && raw.trimStart().startsWith('+')
            const isMinus = showDiff && raw.trimStart().startsWith('-')
            const isHi = highlightLine != null && i + 1 === highlightLine
            return (
              <div
                key={i}
                style={{
                  background: isPlus ? 'rgba(122,186,138,0.10)'
                    : isMinus ? 'rgba(227,135,117,0.10)'
                    : isHi ? 'rgba(93,191,167,0.06)'
                    : 'transparent',
                  marginLeft: -14, paddingLeft: 12, marginRight: -14, paddingRight: 14,
                  borderLeft: isPlus ? '2px solid rgba(122,186,138,0.6)'
                    : isMinus ? '2px solid rgba(227,135,117,0.6)'
                    : isHi ? '2px solid rgba(93,191,167,0.5)'
                    : '2px solid transparent',
                }}
              >
                {spans.length
                  ? spans.map((s, k) => (
                      <span key={k} style={{ color: s.color }}>{s.text}</span>
                    ))
                  : '\u00a0'}
              </div>
            )
          })}
        </pre>
      </div>
    </div>
  )
}
