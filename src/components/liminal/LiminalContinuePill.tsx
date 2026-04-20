export type PauseReason =
  | { kind: 'iteration_limit'; iterations: number }
  | { kind: 'token_budget'; consumedTokens: number; budget: number }

interface LiminalContinuePillProps {
  /** Why the turn paused — drives the editorial copy shown to the user. */
  reason: PauseReason
  /** Called when the user wants another round with the same cap. */
  onContinue: () => void
  /** Called when the user wants to lift the cap for the rest of the turn. */
  onContinueUnlimited: () => void
  /** Disabled while the continuation is in flight. */
  disabled?: boolean
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

interface Copy {
  headPrefix: string
  accent: string
  headSuffix: string
  sub: string
  primaryLabel: string
}

function copyFor(reason: PauseReason): Copy {
  switch (reason.kind) {
    case 'iteration_limit':
      return {
        headPrefix: 'I stopped at ',
        accent: String(reason.iterations),
        headSuffix: ' iterations.',
        sub: `Keep going with another ${reason.iterations}, or run without a cap until I'm done?`,
        primaryLabel: `Continue (+${reason.iterations})`,
      }
    case 'token_budget':
      return {
        headPrefix: 'I used ',
        accent: `${formatTokens(reason.consumedTokens)} / ${formatTokens(reason.budget)}`,
        headSuffix: ' tokens.',
        sub: 'Resume within the same budget, or lift the cap for the rest of the turn?',
        primaryLabel: `Continue (+${formatTokens(reason.budget)})`,
      }
  }
}

/**
 * Inline prompt that appears when an agent turn paused on a configured
 * safety valve — iteration cap or cumulative-token budget. Two resume
 * choices: same cap again, or no cap for the rest of the turn.
 */
export function LiminalContinuePill({
  reason,
  onContinue,
  onContinueUnlimited,
  disabled = false,
}: LiminalContinuePillProps) {
  const copy = copyFor(reason)
  return (
    <div
      className="font-sans"
      style={{
        margin: '8px 0 18px',
        padding: '14px 18px',
        background: 'var(--bg-elev)',
        border: '1px solid color-mix(in srgb, var(--amber) 30%, transparent)',
        borderLeft: '3px solid var(--amber)',
        borderRadius: 6,
        color: 'var(--ink)',
      }}
      role="group"
      aria-label={reason.kind === 'iteration_limit' ? 'Iteration limit reached' : 'Token budget reached'}
    >
      <div className="flex items-start" style={{ gap: 12 }}>
        <span
          className="inline-flex items-center justify-center"
          aria-hidden
          style={{
            width: 18,
            height: 18,
            fontSize: 13,
            color: 'var(--amber)',
            lineHeight: 1,
          }}
        >
          ◐
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="font-serif italic"
            style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink)' }}
          >
            {copy.headPrefix}
            <span
              className="font-mono not-italic"
              style={{ fontSize: 12.5, color: 'var(--amber)' }}
            >
              {copy.accent}
            </span>
            {copy.headSuffix}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--ink-muted)',
              marginTop: 3,
              lineHeight: 1.5,
            }}
          >
            {copy.sub}
          </div>
          <div className="flex" style={{ gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={onContinue}
              disabled={disabled}
              className="font-sans cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: '5px 12px',
                background: 'var(--accent)',
                color: 'var(--bg-elev)',
                border: 'none',
                borderRadius: 4,
              }}
            >
              {copy.primaryLabel}
            </button>
            <button
              type="button"
              onClick={onContinueUnlimited}
              disabled={disabled}
              className="font-sans cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: '5px 12px',
                background: 'transparent',
                color: 'var(--ink-soft)',
                border: '1px solid var(--line-strong)',
                borderRadius: 4,
              }}
            >
              No limit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
