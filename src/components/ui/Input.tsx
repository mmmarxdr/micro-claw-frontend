import { cn } from '../../lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled',
        'focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}
