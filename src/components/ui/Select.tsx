import { cn } from '../../lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'w-full appearance-none bg-surface border border-border rounded-md px-3 py-2 pr-8 text-sm text-text-primary',
          'focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          '[&>option]:bg-surface [&>option]:text-text-primary',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
    </div>
  )
}
