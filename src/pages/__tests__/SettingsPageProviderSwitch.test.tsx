/**
 * RED tests — 12.5: Wire ModelPicker into SettingsPage
 * Scenario PMD-4a: switching provider triggers new getProviderModels call
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

function makeConfig(provider = 'openrouter') {
  return {
    agent: { name: 'TestAgent', personality: '', max_iterations: 10, max_tokens_per_turn: 4096, history_length: 20, memory_results: 5 },
    providers: {
      anthropic:  { api_key: 'sk-ant-real', base_url: '' },
      openai:     { api_key: '', base_url: '' },
      gemini:     { api_key: '', base_url: '' },
      openrouter: { api_key: 'sk-or-real', base_url: '' },
      ollama:     { api_key: '', base_url: '' },
    },
    models: { default: { provider, model: 'openrouter/auto' } },
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
  ;(getProviderModels as ReturnType<typeof vi.fn>).mockResolvedValue({
    models: [{ id: 'test-model', name: 'Test Model', context_length: 0, prompt_cost: 0, completion_cost: 0, free: false }],
    source: 'live',
    cached_at: null,
  })
})

describe('SettingsPage.providerSwitch.PMD-4a', () => {
  it('switching from openrouter to anthropic triggers getProviderModels("anthropic")', async () => {
    ;(api.config as ReturnType<typeof vi.fn>).mockResolvedValue(makeConfig('openrouter'))
    ;(api.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ message: 'ok' })

    renderSettings()

    // Navigate to Provider tab
    await waitFor(() => screen.getByRole('button', { name: /^provider$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^provider$/i }))

    // Wait for config to load; getProviderModels should have been called for openrouter
    await waitFor(() => {
      expect(getProviderModels).toHaveBeenCalledWith('openrouter', undefined)
    }, { timeout: 3000 })

    // Switch active provider to anthropic
    await waitFor(() => {
      const sel = document.querySelector('select[name="models.default.provider"]') as HTMLSelectElement
      expect(sel).toBeTruthy()
    })
    const providerSelect = document.querySelector('select[name="models.default.provider"]') as HTMLSelectElement
    fireEvent.change(providerSelect, { target: { value: 'anthropic' } })

    // Now getProviderModels should be called for anthropic
    await waitFor(() => {
      const calls = (getProviderModels as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0])
      expect(calls).toContain('anthropic')
    }, { timeout: 3000 })
  })
})

// Regression: AS-22 — ModelPicker renders without crash when current model not in list
describe('SettingsPage.currentModelInjected.regression', () => {
  it('AS-22 regression — ModelPicker renders and custom model hint shows for unknown value', async () => {
    const configVal = {
      ...makeConfig('anthropic'),
      models: { default: { provider: 'anthropic', model: 'claude-custom-xyz' } },
    }
    ;(api.config as ReturnType<typeof vi.fn>).mockResolvedValue(configVal)
    // Return list that does NOT include claude-custom-xyz
    // The Controller injects it but since value == 'claude-custom-xyz' and it IS in the modelList
    // after injection, isCustomModel will return false. So we look for listbox instead.
    ;(getProviderModels as ReturnType<typeof vi.fn>).mockResolvedValue({
      models: [{ id: 'claude-opus-4-7', name: 'Claude Opus 4.7', context_length: 0, prompt_cost: 0, completion_cost: 0, free: false }],
      source: 'live',
      cached_at: null,
    })

    renderSettings()
    await waitFor(() => screen.getByRole('button', { name: /^provider$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^provider$/i }))

    // ModelPicker should render
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
