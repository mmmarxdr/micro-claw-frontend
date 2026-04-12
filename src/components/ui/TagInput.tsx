import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export function TagInput({ value: rawValue, onChange, placeholder = 'Type and press Enter', disabled }: TagInputProps) {
  const value = rawValue ?? []
  const [inputVal, setInputVal] = useState('')

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputVal('')
  }

  const removeTag = (tag: string) => onChange(value.filter(t => t !== tag))

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputVal)
    }
    if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className={cn(
      'flex flex-wrap gap-1.5 border border-border rounded-md px-3 py-2 min-h-[40px] bg-surface',
      'focus-within:ring-1 focus-within:ring-border-strong focus-within:border-border-strong',
      disabled && 'opacity-50 pointer-events-none'
    )}>
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 bg-accent-light text-accent text-xs font-medium px-2 py-0.5 rounded-sm">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="hover:text-accent-hover">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => inputVal && addTag(inputVal)}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-sm outline-none text-text-primary placeholder:text-text-disabled bg-transparent"
        disabled={disabled}
      />
    </div>
  )
}
