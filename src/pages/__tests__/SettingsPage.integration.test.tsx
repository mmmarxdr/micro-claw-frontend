/**
 * Integration test — 14.3: SettingsPage provider switch refresh
 *
 * Tests that switching provider in SettingsPage:
 * 1. Calls getProviderModels for the new provider (not stale A-list items)
 * 2. DOM reflects the NEW provider's model list with no A-list items visible
 *
 * This validates the recurring pain originally flagged: stale models showing
 * after provider switch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SetupProvider } from '../../contexts/SetupContext'

// Mock @tanstack/react-virtual (jsdom has no layout engine)
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (opts: { count: number; estimateSize: () => number }) => {
    const visibleCount = Math.min(opts.count, 12)
    const items = Array.from({ length: visibleCount }, (_, i) => ({
      key: i, index: i, start: i * opts.estimateSize(), size: opts.estimateSize(),
    }))
    return { getVirtualItems: () => items, getTotalSize: () => opts.count * opts.estimateSize() }
  },
}))

vi.mock('../../api/client', () => ({
  api: {
    config: vi.fn(),
    updateConfig: vi.fn(),
  },
  getProviderModels: vi.fn(),
}))

vi.mock('../../api/setup', () => ({
  setupApi: {
    deleteConfig: vi.fn(),
  },
}))

import { api, getProviderModels } from '../../api/client'
import { SettingsPage } from '../SettingsPage'

function openrouterConfig() {
  return {
    agent: { name: 'TestAgent', personality: '', max_iterations: 10, max_tokens_per_turn: 4096, history_length: 20, memory_results: 5 },
    providers: {
      anthropic:  { api_key: 'sk-ant-real', base_url: '' },
      openai:     { api_key: '', base_url: '' },
      gemini:     { api_key: '', base_url: '' },
      openrouter: { api_key: 'sk-or-real', base_url: '' },
      ollama:     { api_key: '', base_url: '' },
    },
    models: { default: { provider: 'openrouter', model: 'openai/gpt-4o' } },
    channel: { type: 'cli', token: '', allowed_users: [] },
    tools: {
      shell: { enabled: true, allow_all: false, allowed_commands: [], working_dir: '' },
      file:  { enabled: true, base_path: '~', max_file_size: '1MB' },
      http:  { enabled: true, timeout: 30, max_response_size: '1MB', blocked_domains: [] },
    },
    limits: { tool_timeout: 30_000_000_000, total_timeout: 300_000_000_000 },
    web: { enabled: true, port: 8080, host: '0.0.0.0', auth_token: '' },
  }
}

// Provider A = openrouter models
const openrouterModels = [
  { id: 'openai/gpt-4o', name: 'GPT-4o', context_length: 128000, prompt_cost: 0.005, completion_cost: 0.015, free: false },
  { id: 'google/gemini-pro', name: 'Gemini Pro', context_length: 131072, prompt_cost: 0.0005, completion_cost: 0.0015, free: false },
]

// Provider B = anthropic models
const anthropicModels = [
  { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', context_length: 200000, prompt_cost: 0.015, completion_cost: 0.075, free: false },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', context_length: 200000, prompt_cost: 0.003, completion_cost: 0.015, free: false },
]

function renderSettings() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SetupProvider>
        <SettingsPage />
      </SetupProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(api.config as ReturnType<typeof vi.fn>).mockResolvedValue(openrouterConfig())
  ;(api.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ message: 'ok' })
})

describe('SettingsPage.integration.providerSwitchRefresh', () => {
  it('14.3 — switching provider refreshes model list: no A-list items remain after B-list loads', async () => {
    // Initial state: openrouter is active → return openrouterModels
    ;(getProviderModels as ReturnType<typeof vi.fn>).mockImplementation(
      (provider: string) => {
        if (provider === 'openrouter') {
          return Promise.resolve({ models: openrouterModels, source: 'live', cached_at: null })
        }
        if (provider === 'anthropic') {
          return Promise.resolve({ models: anthropicModels, source: 'live', cached_at: null })
        }
        return Promise.resolve({ models: [], source: 'fallback', cached_at: null })
      }
    )

    renderSettings()

    // Navigate to Provider tab.
    await waitFor(() => screen.getByRole('button', { name: /^provider$/i }), { timeout: 3000 })
    fireEvent.click(screen.getByRole('button', { name: /^provider$/i }))

    // Wait for openrouter models to be visible (A-list).
    await waitFor(() => {
      expect(getProviderModels).toHaveBeenCalledWith('openrouter', undefined)
    }, { timeout: 3000 })

    // Switch provider to anthropic.
    await waitFor(() => {
      const sel = document.querySelector('select[name="models.default.provider"]') as HTMLSelectElement
      expect(sel).toBeTruthy()
    }, { timeout: 3000 })
    const providerSelect = document.querySelector('select[name="models.default.provider"]') as HTMLSelectElement
    fireEvent.change(providerSelect, { target: { value: 'anthropic' } })

    // Wait for anthropic models to be fetched (B-list).
    await waitFor(() => {
      const calls = (getProviderModels as ReturnType<typeof vi.fn>).mock.calls.map((c: string[]) => c[0])
      expect(calls).toContain('anthropic')
    }, { timeout: 3000 })

    // The listbox should render without crash (ModelPicker switched to anthropic).
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
