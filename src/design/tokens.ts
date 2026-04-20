export type ThemeMode = 'light' | 'dark'

export interface LiminalPalette {
  bg: string
  bgElev: string
  bgDeep: string
  bgSidebar: string
  bgCode: string
  ink: string
  inkSoft: string
  inkMuted: string
  inkFaint: string
  line: string
  lineStrong: string
  accent: string
  accentSoft: string
  accentStrong: string
  green: string
  amber: string
  red: string
  user: string
}

export const LIMINAL_TOKENS: Record<ThemeMode, LiminalPalette> = {
  light: {
    bg: '#f8f6f1',
    bgElev: '#ffffff',
    bgDeep: '#efece5',
    bgSidebar: '#f3f0e9',
    bgCode: '#1a1813',
    ink: '#1a1813',
    inkSoft: '#3d3a32',
    inkMuted: '#8a8275',
    inkFaint: '#b5ad9d',
    line: 'rgba(26,24,19,0.08)',
    lineStrong: 'rgba(26,24,19,0.15)',
    accent: '#2d8573',
    accentSoft: 'rgba(45,133,115,0.08)',
    accentStrong: '#1f6357',
    green: '#4a8a5a',
    amber: '#b87a2e',
    red: '#b0432e',
    user: '#3d3a32',
  },
  dark: {
    bg: '#141210',
    bgElev: '#1c1a17',
    bgDeep: '#0e0d0b',
    bgSidebar: '#100f0d',
    bgCode: '#0a0908',
    ink: '#eae5d8',
    inkSoft: '#c2bca9',
    inkMuted: '#7a7465',
    inkFaint: '#443e33',
    line: 'rgba(234,229,216,0.08)',
    lineStrong: 'rgba(234,229,216,0.16)',
    accent: '#5dbfa7',
    accentSoft: 'rgba(93,191,167,0.10)',
    accentStrong: '#8ed9c3',
    green: '#7aba8a',
    amber: '#e3b67a',
    red: '#e38775',
    user: '#c2bca9',
  },
}

export const FONT_STACKS = {
  sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "'Fraunces', Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', 'Fira Code', monospace",
}

export const CODE_PALETTE = {
  keyword: '#d67b9e',
  type: '#d4a85a',
  fn: '#5dbfa7',
  string: '#b8c97a',
  number: '#e3a96b',
  comment: '#6b6457',
  ident: '#e5dfd0',
  punct: '#a8a092',
}
