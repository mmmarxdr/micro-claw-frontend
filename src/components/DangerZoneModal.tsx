import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/Button'

interface DangerZoneModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isPending: boolean
  error?: string | null
}

export function DangerZoneModal({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  error,
}: DangerZoneModalProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleClose = () => {
    setInputValue('')
    onClose()
  }

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConfirm() {
    if (inputValue !== 'DELETE') return
    await onConfirm()
    // Only clear input if modal stays open (error case); parent controls isOpen
    if (!error) {
      setInputValue('')
    }
  }

  if (!isOpen) return null

  const confirmed = inputValue === 'DELETE'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="danger-zone-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#111111] border border-[#222222] rounded-md">
        {/* Red-bordered warning section */}
        <div className="border border-error/30 rounded-md m-4 p-4 bg-error/5">
          <div className="flex items-start gap-3">
            {/* Warning icon */}
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="w-5 h-5 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            <div>
              <h2
                id="danger-zone-modal-title"
                className="text-sm font-semibold text-error"
              >
                Reset Configuration
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                This will clear your provider settings and restart the setup
                wizard. All other settings will be preserved.
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation input */}
        <div className="px-4 pb-4 space-y-3">
          <div>
            <label
              htmlFor="danger-confirm-input"
              className="block text-sm text-text-secondary mb-1.5"
            >
              Type{' '}
              <span className="font-mono font-semibold text-text-primary">
                DELETE
              </span>{' '}
              to confirm
            </label>
            <input
              id="danger-confirm-input"
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              spellCheck={false}
              disabled={isPending}
              className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-error/10 border border-error/30 px-3 py-2">
              <p className="text-xs text-error">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={!confirmed || isPending}
            >
              {isPending ? 'Resetting...' : 'Confirm Reset'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
