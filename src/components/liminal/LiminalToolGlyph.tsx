interface LiminalToolGlyphProps {
  name: string
  color: string
  size?: number
}

/** Tiny SVG glyph keyed by tool name. Falls back to a circle. */
export function LiminalToolGlyph({ name, color, size = 11 }: LiminalToolGlyphProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'read_file':
    case 'view':
    case 'cat':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )
    case 'grep':
    case 'search':
    case 'find':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-5-5" />
        </svg>
      )
    case 'git_log':
    case 'git_diff':
    case 'git':
      return (
        <svg {...props}>
          <circle cx="5" cy="6" r="2" />
          <circle cx="5" cy="18" r="2" />
          <circle cx="19" cy="18" r="2" />
          <path d="M5 8v8M7 18h7a4 4 0 0 0 4-4v-2" />
        </svg>
      )
    case 'web_fetch':
    case 'fetch':
    case 'http':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      )
    case 'shell':
    case 'bash':
    case 'exec':
    case 'run':
      return (
        <svg {...props}>
          <polyline points="4 7 9 12 4 17" />
          <line x1="12" y1="17" x2="20" y2="17" />
        </svg>
      )
    case 'write':
    case 'edit':
    case 'patch':
      return (
        <svg {...props}>
          <path d="M11 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      )
  }
}
