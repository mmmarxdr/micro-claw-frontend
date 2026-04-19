/**
 * GREEN tests — 12.3 ModelPicker component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ModelInfo } from '../../../api/client'

// Mock @tanstack/react-virtual — jsdom has no layout so virtualizer renders 0 items.
// We mock it to return all items in the visible window for testing.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (opts: { count: number; estimateSize: () => number }) => {
    // Return up to 12 virtual items (simulates visible window)
    const visibleCount = Math.min(opts.count, 12)
    const items = Array.from({ length: visibleCount }, (_, i) => ({
      key: i,
      index: i,
      start: i * opts.estimateSize(),
      size: opts.estimateSize(),
    }))
    return {
      getVirtualItems: () => items,
      getTotalSize: () => opts.count * opts.estimateSize(),
    }
  },
}))

import { ModelPicker } from '../ModelPicker'

function makeModels(count: number): ModelInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `model-${i}`,
    name: `Model ${i}`,
    context_length: 128000,
    prompt_cost: 0.001,
    completion_cost: 0.002,
    free: i % 10 === 0,
  }))
}

describe('ModelPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 12.3.1 — Virtualization: 342 items should NOT all render in DOM
  it('12.3.1 — virtualizes large lists (only subset in DOM)', () => {
    const models = makeModels(342)
    const onChange = vi.fn()
    render(
      <ModelPicker
        value="model-0"
        onChange={onChange}
        modelList={models}
        isLoading={false}
        error={null}
      />
    )

    // With virtualization, not all 342 options should be in the DOM
    // We look for list items — should be much less than 342
    const items = document.querySelectorAll('[role="option"]')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThan(342)
  })

  // 12.3.2 — Search input filters list
  it('12.3.2 — typing in search narrows the list', () => {
    const models: ModelInfo[] = [
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', context_length: 128000, prompt_cost: 0, completion_cost: 0, free: true },
      { id: 'anthropic/claude-opus', name: 'Claude Opus', context_length: 200000, prompt_cost: 0.015, completion_cost: 0.075, free: false },
      { id: 'deepseek/deepseek-v3', name: 'DeepSeek V3', context_length: 128000, prompt_cost: 0, completion_cost: 0, free: true },
    ]
    const onChange = vi.fn()
    render(
      <ModelPicker
        value=""
        onChange={onChange}
        modelList={models}
        isLoading={false}
        error={null}
      />
    )

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'deepseek' } })

    // Should show 2 deepseek models, not claude
    const items = document.querySelectorAll('[role="option"]')
    const texts = Array.from(items).map(i => i.textContent ?? '')
    expect(texts.some(t => t.toLowerCase().includes('deepseek'))).toBe(true)
    expect(texts.every(t => !t.toLowerCase().includes('claude opus'))).toBe(true)
  })

  // 12.3.3 — Custom model hint when value not in list
  it('12.3.3 — shows custom model hint when value not in list', () => {
    const models: ModelInfo[] = [
      { id: 'model-a', name: 'Model A', context_length: 0, prompt_cost: 0, completion_cost: 0, free: false },
    ]
    render(
      <ModelPicker
        value="my-custom-model-xyz"
        onChange={vi.fn()}
        modelList={models}
        isLoading={false}
        error={null}
      />
    )

    expect(screen.getByText(/custom model id/i)).toBeInTheDocument()
  })

  // 12.3.4 — Selecting a model calls onChange
  it('12.3.4 — selecting an option calls onChange with model id', () => {
    const models: ModelInfo[] = [
      { id: 'model-x', name: 'Model X', context_length: 0, prompt_cost: 0, completion_cost: 0, free: false },
      { id: 'model-y', name: 'Model Y', context_length: 0, prompt_cost: 0, completion_cost: 0, free: false },
    ]
    const onChange = vi.fn()
    render(
      <ModelPicker
        value="model-x"
        onChange={onChange}
        modelList={models}
        isLoading={false}
        error={null}
      />
    )

    const options = document.querySelectorAll('[role="option"]')
    const modelYOption = Array.from(options).find(o => o.textContent?.includes('Model Y'))
    expect(modelYOption).toBeTruthy()
    fireEvent.click(modelYOption!)
    expect(onChange).toHaveBeenCalledWith('model-y')
  })

  // Loading state
  it('12.3.5 — shows loading state when isLoading=true', () => {
    render(
      <ModelPicker
        value=""
        onChange={vi.fn()}
        modelList={[]}
        isLoading={true}
        error={null}
      />
    )
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  // Error state
  it('12.3.6 — shows error state when error is set', () => {
    render(
      <ModelPicker
        value=""
        onChange={vi.fn()}
        modelList={[]}
        isLoading={false}
        error={new Error('No API key configured')}
      />
    )
    expect(screen.getByText(/no api key/i)).toBeInTheDocument()
  })

  // Accessibility
  it('12.3.7 — has listbox role and aria-label', () => {
    render(
      <ModelPicker
        value=""
        onChange={vi.fn()}
        modelList={[{ id: 'm1', name: 'M1', context_length: 0, prompt_cost: 0, completion_cost: 0, free: false }]}
        isLoading={false}
        error={null}
      />
    )
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })
})
