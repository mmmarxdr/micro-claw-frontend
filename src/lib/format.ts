/**
 * Centralised formatters for currency, tokens, and other numeric values
 * surfaced in the dashboard. The goal: never show ugly artefacts like
 * "$0.79999" or "$0.0000" — always pick the smallest precision that keeps
 * the value meaningful.
 */

/**
 * Format a USD cost adaptively:
 *  - 0 → "$0.00"
 *  - 0 < x < 0.01 → 4 decimals (small per-call costs stay readable, e.g. "$0.0023")
 *  - x ≥ 0.01 → 2 decimals (real money, e.g. "$0.79", "$12.40")
 *
 * Pass `minDigits` to force a floor (e.g. 2 to always show at least cents).
 */
export function formatUSD(amount: number, minDigits = 2): string {
  if (!Number.isFinite(amount)) return '$0.00'
  if (amount === 0) return `$${(0).toFixed(minDigits)}`
  const abs = Math.abs(amount)
  // Sub-cent → 4 decimals so e.g. 0.0023 doesn't render as 0.00.
  if (abs < 0.01) return `$${amount.toFixed(4)}`
  // Cent and above → 2 decimals (covers 99% of real bills).
  return `$${amount.toFixed(Math.max(2, minDigits))}`
}

/**
 * Format a per-1M-token price as displayed in pricing rows / model pickers.
 * Always 2 decimals and strips trailing zeros so 0.79999 → "$0.80",
 * 1.50000 → "$1.50", 12 → "$12".
 */
export function formatPricePerM(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '$0'
  // Round to 2 decimals first so 0.79999 → 0.80 → "0.8".
  const rounded = Math.round(amount * 100) / 100
  // Trim trailing zeros: 1.50 → "1.5", 12.00 → "12".
  const s = rounded.toFixed(2).replace(/\.?0+$/, '')
  return `$${s}`
}

/**
 * Format a token count adaptively:
 *  - < 1k    → exact integer
 *  - 1k–999k → "1.2k" (1 decimal)
 *  - ≥ 1M    → "1.2M" (1 decimal)
 */
export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n))
}
