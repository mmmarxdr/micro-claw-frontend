import { useEffect } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastVariant = 'success' | 'error'

interface ToastProps {
  message: string
  variant?: ToastVariant
  onDismiss: () => void
  duration?: number
}

export function Toast({ message, variant = 'success', onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium',
      'bg-surface border border-border',
      variant === 'success'
        ? 'border-l-2 border-l-success text-text-primary'
        : 'border-l-2 border-l-error text-text-primary'
    )}>
      {variant === 'success'
        ? <CheckCircle size={16} className="text-success shrink-0" />
        : <XCircle size={16} className="text-error shrink-0" />
      }
      {message}
      <button onClick={onDismiss} className="ml-2 hover:opacity-70 shrink-0 text-text-secondary">
        <X size={14} />
      </button>
    </div>
  )
}
