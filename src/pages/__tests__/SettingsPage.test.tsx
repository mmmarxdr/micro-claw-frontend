import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SetupProvider } from '../../contexts/SetupContext'
import { SettingsPage } from '../SettingsPage'

// Mock the api module
vi.mock('../../api/client', () => ({
  api: {
    config: vi.fn(),
    models: vi.fn(),
    updateConfig: vi.fn(),
  },
  getAuthToken: vi.fn(() => 'test-token'),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}))

// Mock setupApi
vi.mock('../../api/setup', () => ({
  setupApi: {
    deleteConfig: vi.fn(),
  },
}))

import { api } from '../../api/client'

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    agent: { name: 'TestAgent', personality: '', max_iterations: 10, max_tokens_per_turn: 4096, history_length: 20, memory_results: 5 },
    providers: {
      anthropic:  { api_key: '', base_url: '' },
      openai:     { api_key: '', base_url: '' },
      gemini:     { api_key: '', base_url: '' },
      openrouter: { api_key: 'sk-or-real', base_url: '' },
      ollama:     { api_key: '', base_url: 'http://localhost:11434' },
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
  ;(api.models as ReturnType<typeof vi.fn>).mockResolvedValue([])
})

// AS-22: current model always visible in dropdown even if not in top-50
describe('SettingsPage.currentModelInjected', () => {
  it('injects current model into dropdown even when not in remote list', async () => {
    const currentModel = 'anthropic/claude-haiku-4.5'
    const configVal = makeConfig({
      models: { default: { provider: 'openrouter', model: currentModel } },
    })
    ;(api.config as ReturnType<typeof vi.fn>).mockResolvedValue(configVal)

    // 100 models NOT including haiku-4.5
    const remoteModels = Array.from({ length: 100 }, (_, i) => ({
      id: `model-${i}`,
      name: `Model ${i}`,
      context_length: 128000,
      prompt_cost: 0.001,
      completion_cost: 0.002,
      free: false,
    }))
    ;(api.models as ReturnType<typeof vi.fn>).mockResolvedValue(remoteModels)

    renderSettings()

    // Navigate to Provider tab
    await waitFor(() => screen.getByRole('button', { name: /provider/i }))
    fireEvent.click(screen.getByRole('button', { name: /provider/i }))

    // Wait for config to load and form to populate
    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: /model/i }) as HTMLSelectElement
      // The current model must be present as an option
      const options = Array.from(select.options).map(o => o.value)
      expect(options).toContain(currentModel)
      // And it should be selected
      expect(select.value).toBe(currentModel)
    }, { timeout: 3000 })
  })
})

// AS-21: tab switch preserves unsaved edits
describe('SettingsPage.tabSwitch', () => {
  it('preserves unsaved api_key value when switching provider sub-tabs', async () => {
    ;(api.config as ReturnType<typeof vi.fn>).mockResolvedValue(makeConfig())

    renderSettings()

    await waitFor(() => screen.getByRole('button', { name: /provider/i }))
    fireEvent.click(screen.getByRole('button', { name: /provider/i }))

    // Navigate to Anthropic sub-tab
    await waitFor(() => screen.getByRole('button', { name: /anthropic/i }))
    fireEvent.click(screen.getByRole('button', { name: /anthropic/i }))

    // Type an unsaved value
    const apiKeyInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-unsaved' } })
    expect((apiKeyInput as HTMLInputElement).value).toBe('sk-ant-unsaved')

    // Switch to OpenRouter sub-tab
    fireEvent.click(screen.getByRole('button', { name: /openrouter/i }))

    // Switch back to Anthropic
    fireEvent.click(screen.getByRole('button', { name: /anthropic/i }))

    // Value should be preserved (hidden, not unmounted)
    const preserved = screen.getByPlaceholderText('sk-...')
    expect((preserved as HTMLInputElement).value).toBe('sk-ant-unsaved')
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

    await waitFor(() => screen.getByRole('button', { name: /save/i }))

    // Click save WITHOUT modifying the masked api_key
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    })

    await waitFor(() => expect(api.updateConfig).toHaveBeenCalled())

    const callArg = (api.updateConfig as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const providers = (callArg as any).providers
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

    await waitFor(() => screen.getByRole('button', { name: /provider/i }))
    fireEvent.click(screen.getByRole('button', { name: /provider/i }))

    // Change active provider to anthropic (which has no credentials)
    await waitFor(() => screen.getByRole('combobox', { name: /active provider/i }))
    fireEvent.change(screen.getByRole('combobox', { name: /active provider/i }), {
      target: { value: 'anthropic' },
    })

    // Click Save — should trigger warning
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    })

    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/credentials/i)).toBeInTheDocument()
    })

    // PUT should NOT have been called yet
    expect(api.updateConfig).not.toHaveBeenCalled()

    // Confirm — now PUT should fire
    const confirmBtn = screen.getByRole('button', { name: /confirm|save anyway/i })
    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    await waitFor(() => expect(api.updateConfig).toHaveBeenCalled())
  })
})
