import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SetupProvider } from '../../contexts/SetupContext'
import { SettingsPage } from '../SettingsPage'

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

// Mock the api module
vi.mock('../../api/client', () => ({
  api: {
    config: vi.fn(),
    updateConfig: vi.fn(),
  },
  getProviderModels: vi.fn(),
}))

// Mock setupApi
vi.mock('../../api/setup', () => ({
  setupApi: {
    deleteConfig: vi.fn(),
  },
}))

import { api, getProviderModels } from '../../api/client'

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    agent: { name: 'TestAgent', personality: '', max_iterations: 10, max_tokens_per_turn: 4096, history_length: 20, memory_results: 5 },
    providers: {
      anthropic:  { api_key: '', base_url: '' },
      openai:     { api_key: '', base_url: '' },
      gemini:     { api_key: '', base_url: '' },
      openrouter: { api_key: 'sk-or-real', base_url: '' },
      ollama:     { api_key: '', base_url: '' },
    },
    models: { default: { provider: 'openrouter', model: 'openrouter/auto' } },
    channel: { type: 'cli', token: '', allowed_users: [] },
    tools: {
      shell: { enabled: true, allow_all: false, allowed_commands: [], working_dir: '' },
      file:  { enabled: true, base_path: '~', max_file_size: '1MB' },
      http:  { enabled: true, timeout: 30, max_response_size: '1MB', blocked_domains: [] },
    },
    limits: { tool_timeout: 30_000_000_000, total_timeout: 300_000_000_000 },
    web: { enabled: true, port: 8080, host: '0.0.0.0', auth_token: '' },
    ...overrides,
  }
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderSettings(queryClient?: QueryClient) {
  const qc = queryClient ?? makeQueryClient()
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
  ;(getProviderModels as ReturnType<typeof vi.fn>).mockResolvedValue({ models: [], source: 'live', cached_at: null })
})

// AS-22: current model value preserved in ModelPicker when it's not in the remote list
// The Controller injects it as the first item so it stays selected
describe('SettingsPage.currentModelInjected', () => {
  it('renders ModelPicker without crashing when current model not in provider list', async () => {
    const currentModel = 'anthropic/claude-haiku-4.5'
    const configVal = makeConfig({
      providers: {
        anthropic:  { api_key: '', base_url: '' },
        openai:     { api_key: '', base_url: '' },
        gemini:     { api_key: '', base_url: '' },
        openrouter: { api_key: 'sk-or-real', base_url: '' },
        ollama:     { api_key: '', base_url: '' },
      },
      models: { default: { provider: 'openrouter', model: currentModel } },
    })
    ;(api.config as ReturnType<typeof vi.fn>).mockResolvedValue(configVal)

    // 100 models NOT including the current model
    const remoteModels = Array.from({ length: 100 }, (_, i) => ({
      id: `model-${i}`,
      name: `Model ${i}`,
      context_length: 128000,
      prompt_cost: 0.001,
      completion_cost: 0.002,
      free: false,
    }))
    ;(getProviderModels as ReturnType<typeof vi.fn>).mockResolvedValue({ models: remoteModels, source: 'live', cached_at: null })

    renderSettings()

    // Navigate to Provider tab
    await waitFor(() => screen.getByRole('button', { name: /^provider$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^provider$/i }))

    // Wait for ModelPicker to render (no crash + listbox visible)
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    }, { timeout: 3000 })
    // The current model is injected so the first option is haiku — verify listbox rendered
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })
})

// AS-21: tab switch preserves unsaved edits
describe('SettingsPage.tabSwitch', () => {
  it('preserves unsaved api_key value when switching provider sub-tabs', async () => {
    ;(api.config as ReturnType<typeof vi.fn>).mockResolvedValue(makeConfig())

    renderSettings()

    await waitFor(() => screen.getByRole('button', { name: /^provider$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^provider$/i }))

    // Navigate to Anthropic sub-tab
    await waitFor(() => screen.getByRole('button', { name: /^anthropic$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^anthropic$/i }))

    // Find anthropic api_key by name attribute (since all tabs are mounted)
    await waitFor(() => {
      const input = document.querySelector('input[name="providers.anthropic.api_key"]') as HTMLInputElement
      expect(input).toBeTruthy()
    })

    const apiKeyInput = document.querySelector('input[name="providers.anthropic.api_key"]') as HTMLInputElement
    fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-unsaved' } })
    expect(apiKeyInput.value).toBe('sk-ant-unsaved')

    // Switch to OpenRouter sub-tab
    fireEvent.click(screen.getByRole('button', { name: /^openrouter$/i }))

    // Switch back to Anthropic
    fireEvent.click(screen.getByRole('button', { name: /^anthropic$/i }))

    // Value should be preserved (hidden, not unmounted)
    const preserved = document.querySelector('input[name="providers.anthropic.api_key"]') as HTMLInputElement
    expect(preserved.value).toBe('sk-ant-unsaved')
  })
})

// AS-23: masked value stripped before PUT
describe('SettingsPage.maskedStrip', () => {
  it('does not include masked api_key in PUT body', async () => {
    const configVal = makeConfig({
      providers: {
        anthropic:  { api_key: 'sk-a****1234', base_url: '' },
        openai:     { api_key: '', base_url: '' },
        gemini:     { api_key: '', base_url: '' },
        openrouter: { api_key: '', base_url: '' },
        ollama:     { api_key: '', base_url: '' },
      },
      models: { default: { provider: 'anthropic', model: 'claude-haiku-4-5' } },
    })
    ;(api.config as ReturnType<typeof vi.fn>).mockResolvedValue(configVal)
    ;(api.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ message: 'ok' })

    renderSettings()

    await waitFor(() => screen.getByRole('button', { name: /^save$/i }))

    // Make form dirty by changing a field so Save is enabled
    fireEvent.click(screen.getByRole('button', { name: /^agent$/i }))
    await waitFor(() => {
      const nameInput = document.querySelector('input[name="agent.name"]') as HTMLInputElement
      expect(nameInput).toBeTruthy()
    })
    const nameInput = document.querySelector('input[name="agent.name"]') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'TestAgent-dirty' } })

    // Click save
    await act(async () => {
      const saveBtn = screen.getByRole('button', { name: /^save$/i })
      fireEvent.click(saveBtn)
    })

    await waitFor(() => expect(api.updateConfig).toHaveBeenCalled())

    const callArg = (api.updateConfig as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>
    const providers = (callArg as { providers: Record<string, Record<string, unknown>> }).providers
    // anthropic api_key should be absent (stripped) since it was masked
    expect(providers?.anthropic?.api_key).toBeUndefined()
  })
})

// AS-24: provider switch warning when provider has no credentials
describe('SettingsPage.providerSwitchWarning', () => {
  it('shows warning modal when switching to provider with no credentials and prevents PUT until confirmed', async () => {
    const configVal = makeConfig({
      providers: {
        anthropic:  { api_key: '', base_url: '' },
        openai:     { api_key: '', base_url: '' },
        gemini:     { api_key: '', base_url: '' },
        openrouter: { api_key: 'sk-or-real', base_url: '' },
        ollama:     { api_key: '', base_url: '' },
      },
      models: { default: { provider: 'openrouter', model: 'openrouter/auto' } },
    })
    ;(api.config as ReturnType<typeof vi.fn>).mockResolvedValue(configVal)
    ;(api.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ message: 'ok' })

    renderSettings()

    await waitFor(() => screen.getByRole('button', { name: /^provider$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^provider$/i }))

    // Change active provider to anthropic (which has no credentials) using aria-label
    await waitFor(() => {
      const sel = document.querySelector('select[name="models.default.provider"]') as HTMLSelectElement
      expect(sel).toBeTruthy()
    })

    const providerSelect = document.querySelector('select[name="models.default.provider"]') as HTMLSelectElement
    fireEvent.change(providerSelect, { target: { value: 'anthropic' } })

    // Make form dirty so Save is enabled (the provider change should already do it)
    // Click Save — should trigger warning
    await act(async () => {
      const saveBtn = screen.getByRole('button', { name: /^save$/i })
      fireEvent.click(saveBtn)
    })

    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      // Look for the warning modal heading specifically
      expect(screen.getByRole('heading', { name: /no credentials configured/i })).toBeInTheDocument()
    })

    // PUT should NOT have been called yet
    expect(api.updateConfig).not.toHaveBeenCalled()

    // Confirm — now PUT should fire
    const confirmBtn = screen.getByRole('button', { name: /save anyway/i })
    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    await waitFor(() => expect(api.updateConfig).toHaveBeenCalled())
  })
})
