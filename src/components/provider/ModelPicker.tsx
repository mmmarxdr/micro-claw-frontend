import { useRef, useState, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ModelInfo } from '../../api/client'

export interface ModelPickerProps {
  value: string
  onChange: (id: string) => void
  modelList: ModelInfo[]
  isLoading: boolean
  error: Error | null
  disabled?: boolean
}

function isCustomModel(id: string, options: ModelInfo[]): boolean {
  if (!id) return false
  return !options.find(m => m.id === id)
}

export function ModelPicker({ value, onChange, modelList, isLoading, error, disabled }: ModelPickerProps) {
  const [search, setSearch] = useState('')
  const parentRef = useRef<HTMLDivElement>(null)

  const filteredModels = useMemo(() => {
    const lf = search.toLowerCase()
    if (!lf) return modelList
    return modelList.filter(m =>
      m.id.toLowerCase().includes(lf) || m.name.toLowerCase().includes(lf)
    )
  }, [modelList, search])

  const virtualizer = useVirtualizer({
    count: filteredModels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 5,
  })

  const isCustom = isCustomModel(value, modelList)

  if (isLoading) {
    return (
      <div className="text-sm text-text-secondary py-2">Loading models...</div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-error py-2">
        {error.message || 'Failed to load models'}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search models..."
        disabled={disabled}
        className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong"
      />

      {/* Virtualized list */}
      <div
        ref={parentRef}
        role="listbox"
        aria-label="Model list"
        className="relative border border-border rounded-md overflow-auto bg-surface"
        style={{ height: 216 }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map(virtualRow => {
            const model = filteredModels[virtualRow.index]
            const isSelected = model.id === value
            return (
              <div
                key={virtualRow.key}
                role="option"
                aria-selected={isSelected}
                onClick={() => !disabled && onChange(model.id)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`flex items-center px-3 text-sm cursor-pointer transition-colors select-none ${
                  isSelected
                    ? 'bg-accent/10 text-text-primary font-medium'
                    : 'text-text-secondary hover:bg-hover-surface hover:text-text-primary'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="truncate">{model.name}</span>
                {model.free && (
                  <span className="ml-auto text-xs text-accent shrink-0">free</span>
                )}
                {model.prompt_cost > 0 && !model.free && (
                  <span className="ml-auto text-xs text-text-disabled shrink-0">
                    ${model.prompt_cost}/M
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Custom model hint */}
      {isCustom && value && (
        <p className="text-xs text-text-disabled">
          Custom model ID — not validated against provider list
        </p>
      )}

      {/* Custom model input (always present but only shown when value is custom) */}
      {isCustom && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter custom model ID..."
          className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong"
        />
      )}

      {filteredModels.length === 0 && search && (
        <p className="text-xs text-text-disabled px-1">
          No models match "{search}". Type to use as a custom model ID.
        </p>
      )}
    </div>
  )
}
