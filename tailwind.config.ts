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

        // ── Legacy palette (for non-redesigned pages) ────────────
        background: 'var(--color-background)',
        accent: {
          DEFAULT: '#10b981',
          hover:   '#059669',
          light:   'var(--color-accent-light)',
          muted:   '#6ee7b7',
          'light-border': 'var(--color-accent-light-border)',
        },
        surface:  'var(--color-surface)',
        'hover-surface': 'var(--color-hover-surface)',
        'logs-alt-row':  'var(--color-logs-alt-row)',
        border: {
          DEFAULT: 'var(--color-border)',
          strong:  'var(--color-border-strong)',
        },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          disabled:  'var(--color-text-disabled)',
        },
        success: { DEFAULT: '#10b981', light: 'rgba(16, 185, 129, 0.1)' },
        warning: { DEFAULT: '#f59e0b', light: 'rgba(245, 158, 11, 0.1)' },
        error:   { DEFAULT: '#ef4444', light: 'rgba(239, 68, 68, 0.1)' },
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
