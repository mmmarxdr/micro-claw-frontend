import type { Config } from 'tailwindcss'

export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Liminal palette (theme-aware via CSS vars) ──────────
        paper:        'var(--bg)',
        'paper-elev': 'var(--bg-elev)',
        'paper-deep': 'var(--bg-deep)',
        'paper-side': 'var(--bg-sidebar)',
        'paper-code': 'var(--bg-code)',
        ink: {
          DEFAULT: 'var(--ink)',
          soft:    'var(--ink-soft)',
          muted:   'var(--ink-muted)',
          faint:   'var(--ink-faint)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong:  'var(--line-strong)',
        },
        teal: {
          DEFAULT: 'var(--accent)',
          soft:    'var(--accent-soft)',
          strong:  'var(--accent-strong)',
        },
        signal: {
          green: 'var(--green)',
          amber: 'var(--amber)',
          red:   'var(--red)',
        },
        user: 'var(--user)',

        // ── Legacy palette ─────────────────────────────────────────
        // Tokens kept for backwards compat with non-Liminal pages
        // (Settings, MCP, Logs). They now point to Liminal CSS vars so
        // the visual language is unified everywhere — zero per-page edits
        // required for the colour swap.
        background: 'var(--bg)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover:   'var(--accent-strong)',
          light:   'var(--accent-soft)',
          muted:   'var(--accent-soft)',
          'light-border': 'color-mix(in srgb, var(--accent) 25%, transparent)',
        },
        surface:        'var(--bg-elev)',
        'hover-surface':'var(--bg-deep)',
        'logs-alt-row': 'var(--bg-deep)',
        border: {
          DEFAULT: 'var(--line)',
          strong:  'var(--line-strong)',
        },
        text: {
          primary:   'var(--ink)',
          secondary: 'var(--ink-soft)',
          disabled:  'var(--ink-muted)',
        },
        success: { DEFAULT: 'var(--green)', light: 'color-mix(in srgb, var(--green) 12%, transparent)' },
        warning: { DEFAULT: 'var(--amber)', light: 'color-mix(in srgb, var(--amber) 12%, transparent)' },
        error:   { DEFAULT: 'var(--red)',   light: 'color-mix(in srgb, var(--red) 12%, transparent)' },
      },
      fontFamily: {
        sans:  ["'Inter'", 'system-ui', '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
        serif: ["'Fraunces'", 'Georgia', "'Times New Roman'", 'serif'],
        mono:  ["'JetBrains Mono'", 'ui-monospace', "'SF Mono'", "'Fira Code'", "'Cascadia Code'", 'monospace'],
      },
      borderRadius: {
        sm:  '3px',
        md:  '6px',
        lg:  '8px',
      },
      boxShadow: {},
    },
  },
  plugins: [],
} satisfies Config
