import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Zap,
} from 'lucide-react'
import { setupApi, type ProviderInfo, type ModelInfo } from '../api/setup'
import { useSetup } from '../contexts/SetupContext'

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['Welcome', 'Provider', 'Credentials', 'Done']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className="h-1 w-8 rounded-full transition-all duration-200"
          style={{
            background:
              i < current
                ? 'rgba(16,185,129,0.5)'
                : i === current
                ? '#10b981'
                : '#222222',
          }}
        />
      ))}
    </div>
  )
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#111111] border border-[#222222] mb-5">
        <Zap className="w-6 h-6 text-accent" />
      </div>
      <h1 className="text-xl font-semibold text-text-primary mb-2">Welcome to Microclaw</h1>
      <p className="text-sm text-text-secondary mb-8 max-w-xs mx-auto">
        Let's get your AI agent configured. This takes about 2 minutes.
      </p>
      <div className="bg-surface border border-border rounded-md p-5 text-left space-y-3 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-accent text-xs font-bold">1</span>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Choose a provider</p>
            <p className="text-xs text-text-secondary mt-0.5">Anthropic, OpenAI, Gemini, or local Ollama</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-accent text-xs font-bold">2</span>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Enter your API key</p>
            <p className="text-xs text-text-secondary mt-0.5">We validate it before saving</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-accent text-xs font-bold">3</span>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Start using the dashboard</p>
            <p className="text-xs text-text-secondary mt-0.5">Conversations, memory, tools — all ready</p>
          </div>
        </div>
      </div>
      <button
        onClick={onNext}
        className="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors"
      >
        Get Started
      </button>
    </div>
  )
}

// ─── Step 2: Provider ─────────────────────────────────────────────────────────

const PROVIDER_ICONS: Record<string, string> = {
  anthropic: '🟠',
  openai: '🟢',
  gemini: '🔵',
  openrouter: '🟣',
  ollama: '⚫',
}

interface ProviderStepProps {
  selected: string | null
  onSelect: (id: string) => void
  onNext: () => void
  onBack: () => void
}

function ProviderStep({ selected, onSelect, onNext, onBack }: ProviderStepProps) {
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setupApi
      .providers()
      .then((res) => {
        setProviders(res.providers)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load providers')
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <p className="text-sm font-semibold text-text-primary mb-1">Choose a provider</p>
      <p className="text-xs text-text-secondary mb-5">Select the AI provider you want to use.</p>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 text-text-secondary animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-xs text-error bg-error/10 border border-error/20 rounded-md px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-2 mb-5">
          {Object.entries(providers).map(([id, info]) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={[
                'text-left rounded-md px-3 py-3 border transition-all duration-150',
                selected === id
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-transparent hover:border-border-strong hover:bg-hover-surface',
              ].join(' ')}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{PROVIDER_ICONS[id] ?? '⚙️'}</span>
                <span className="text-sm font-medium text-text-primary">{info.display_name}</span>
              </div>
              <p className="text-xs text-text-secondary">
                {info.requires_api_key ? 'API key required' : 'No API key needed'}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-md hover:bg-hover-surface transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selected}
          className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Credentials ──────────────────────────────────────────────────────

interface CredentialsState {
  apiKey: string
  model: string
  baseUrl: string
  showKey: boolean
  validating: boolean
  validationStatus: 'idle' | 'success' | 'error'
  validationError: string
  skipped: boolean
}

interface CredentialsStepProps {
  providerId: string
  providerInfo: ProviderInfo | null
  onComplete: (apiKey: string, model: string, baseUrl: string) => void
  onBack: () => void
}

const OTHER_SENTINEL = '__other__'

function CredentialsStep({ providerId, providerInfo, onComplete, onBack }: CredentialsStepProps) {
  const isOllama = providerId === 'ollama'
  const models: ModelInfo[] = providerInfo?.models ?? []

  const [state, setState] = useState<CredentialsState>({
    apiKey: '',
    model: models[0]?.id ?? '',
    baseUrl: providerInfo?.default_base_url ?? 'http://localhost:11434',
    showKey: false,
    validating: false,
    validationStatus: 'idle',
    validationError: '',
    skipped: false,
  })
  const [modelDropdown, setModelDropdown] = useState(models[0]?.id ?? (isOllama ? '' : OTHER_SENTINEL))
  const [customModel, setCustomModel] = useState('')

  const effectiveModel = modelDropdown === OTHER_SENTINEL || isOllama
    ? customModel
    : modelDropdown

  const canContinue = state.validationStatus === 'success' || state.skipped

  const update = (patch: Partial<CredentialsState>) =>
    setState((s) => ({ ...s, ...patch }))

  const handleValidate = async () => {
    update({ validating: true, validationStatus: 'idle', validationError: '' })
    try {
      const res = await setupApi.validateKey({
        provider: providerId,
        api_key: state.apiKey,
        model: effectiveModel,
        base_url: state.baseUrl || undefined,
      })
      if (res.valid) {
        update({ validating: false, validationStatus: 'success' })
      } else {
        update({ validating: false, validationStatus: 'error', validationError: res.error ?? 'Validation failed' })
      }
    } catch (err) {
      update({
        validating: false,
        validationStatus: 'error',
        validationError: err instanceof Error ? err.message : 'Network error',
      })
    }
  }

  const handleContinue = () => {
    onComplete(state.apiKey, effectiveModel, state.baseUrl)
  }

  return (
    <div>
      <p className="text-sm font-semibold text-text-primary mb-1">Configure credentials</p>
      <p className="text-xs text-text-secondary mb-5">
        {isOllama ? 'Set your Ollama base URL and model.' : 'Enter your API key and select a model.'}
      </p>

      <div className="space-y-4">
        {/* API key — hidden for Ollama */}
        {!isOllama && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              API Key
            </label>
            <div className="relative">
              <input
                type={state.showKey ? 'text' : 'password'}
                value={state.apiKey}
                onChange={(e) => update({ apiKey: e.target.value, validationStatus: 'idle' })}
                placeholder="sk-ant-api..."
                className="w-full bg-transparent border border-border rounded-md px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong"
              />
              <button
                type="button"
                onClick={() => update({ showKey: !state.showKey })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                tabIndex={-1}
              >
                {state.showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Base URL — shown for Ollama */}
        {isOllama && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Base URL
            </label>
            <input
              type="text"
              value={state.baseUrl}
              onChange={(e) => update({ baseUrl: e.target.value, validationStatus: 'idle' })}
              placeholder="http://localhost:11434"
              className="w-full bg-transparent border border-border rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong"
            />
          </div>
        )}

        {/* Model selection */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Model
          </label>
          {isOllama ? (
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="llama3, mistral, codestral..."
              className="w-full bg-transparent border border-border rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong"
            />
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <select
                  value={modelDropdown}
                  onChange={(e) => {
                    setModelDropdown(e.target.value)
                    if (e.target.value !== OTHER_SENTINEL) setCustomModel('')
                  }}
                  className="w-full appearance-none bg-transparent border border-border rounded-md px-3 py-2.5 pr-8 text-sm text-text-primary focus:outline-none focus:border-border-strong [&>option]:bg-[#111111]"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name}
                    </option>
                  ))}
                  <option value={OTHER_SENTINEL}>Other...</option>
                </select>
              </div>
              {modelDropdown === OTHER_SENTINEL && (
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Enter model ID..."
                  autoFocus
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong"
                />
              )}
            </div>
          )}
        </div>

        {/* Validate button */}
        <button
          type="button"
          onClick={handleValidate}
          disabled={state.validating || (!isOllama && !state.apiKey) || !effectiveModel}
          className="w-full py-2.5 text-sm font-medium border border-border rounded-md text-text-primary hover:bg-hover-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {state.validating ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Validating...
            </>
          ) : (
            'Validate'
          )}
        </button>

        {/* Validation feedback */}
        {state.validationStatus === 'success' && (
          <div className="flex items-center gap-2 text-xs text-accent bg-accent/10 border border-accent/20 rounded-md px-3 py-2">
            <CheckCircle2 size={14} />
            Key validated successfully
          </div>
        )}
        {state.validationStatus === 'error' && (
          <div className="text-xs text-error bg-error/10 border border-error/20 rounded-md px-3 py-2">
            {state.validationError}
          </div>
        )}
      </div>

      {/* Skip link */}
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => update({ skipped: true, validationStatus: 'idle' })}
          className="text-xs text-text-disabled hover:text-text-secondary transition-colors"
        >
          Skip validation (advanced)
        </button>
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-md hover:bg-hover-surface transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

interface DoneStepProps {
  providerId: string
  model: string
  apiKey: string
  baseUrl: string
}

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? '••••••••' : 'none'
  return `${key.slice(0, 6)}...${key.slice(-4)}`
}

function DoneStep({ providerId, model, apiKey, baseUrl }: DoneStepProps) {
  const { setNeedsSetup } = useSetup()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Call complete on mount
  useEffect(() => {
    setLoading(true)
    setupApi
      .complete({
        provider: providerId,
        api_key: apiKey,
        model,
        base_url: baseUrl || undefined,
      })
      .then(() => {
        // Auth cookie is set automatically by the backend via Set-Cookie (HttpOnly).
        // No localStorage needed — cookie is sent on all subsequent requests.
        setLoading(false)
        setDone(true)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to save configuration')
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGoToDashboard = () => {
    queryClient.clear()
    setNeedsSetup(false)
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    setupApi
      .complete({ provider: providerId, api_key: apiKey, model, base_url: baseUrl || undefined })
      .then(() => {
        setLoading(false)
        setDone(true)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to save configuration')
        setLoading(false)
      })
  }

  if (loading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="w-6 h-6 text-text-secondary animate-spin mx-auto mb-3" />
        <p className="text-sm text-text-secondary">Saving configuration...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-error mb-2">Failed to save configuration</p>
        <p className="text-xs text-text-secondary mb-5">{error}</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!done) return null

  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-6 h-6 text-accent" />
      </div>
      <h2 className="text-base font-semibold text-text-primary mb-1">You're all set!</h2>
      <p className="text-xs text-text-secondary mb-5">
        Your agent is configured and ready to use.
      </p>

      {/* Summary card */}
      <div className="bg-hover-surface border border-border rounded-md p-4 mb-5 text-left space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Provider</span>
          <span className="text-text-primary font-medium capitalize">{providerId}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Model</span>
          <span className="text-text-primary font-medium font-mono text-xs">{model}</span>
        </div>
        {apiKey && (
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">API Key</span>
            <span className="text-text-primary font-medium font-mono text-xs">{maskApiKey(apiKey)}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleGoToDashboard}
        className="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors mb-3"
      >
        Go to Dashboard
      </button>

      <p className="text-xs text-text-disabled">
        You can change these settings anytime in Settings.
      </p>
    </div>
  )
}

// ─── Wizard shell ─────────────────────────────────────────────────────────────

interface WizardState {
  step: number
  selectedProvider: string | null
  apiKey: string
  model: string
  baseUrl: string
}

export function SetupWizardPage() {
  const [state, setState] = useState<WizardState>({
    step: 0,
    selectedProvider: null,
    apiKey: '',
    model: '',
    baseUrl: '',
  })
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({})

  // Pre-fetch providers when wizard loads so ProviderStep + CredentialsStep share the same data
  useEffect(() => {
    setupApi.providers().then((res) => setProviders(res.providers)).catch(() => {})
  }, [])

  const goTo = (step: number) => setState((s) => ({ ...s, step }))

  const selectedProviderInfo = state.selectedProvider ? (providers[state.selectedProvider] ?? null) : null

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-[480px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#111111] border border-[#222222] mb-3">
            <Zap className="w-5 h-5 text-accent" />
          </div>
          <p className="text-xs text-text-secondary uppercase tracking-widest font-medium">
            Microclaw Setup
          </p>
        </div>

        <StepIndicator current={state.step} />

        {/* Card */}
        <div className="bg-[#111111] border border-[#222222] rounded-md p-7">
          {state.step === 0 && (
            <WelcomeStep onNext={() => goTo(1)} />
          )}

          {state.step === 1 && (
            <ProviderStep
              selected={state.selectedProvider}
              onSelect={(id) => setState((s) => ({ ...s, selectedProvider: id }))}
              onNext={() => goTo(2)}
              onBack={() => goTo(0)}
            />
          )}

          {state.step === 2 && state.selectedProvider && (
            <CredentialsStep
              providerId={state.selectedProvider}
              providerInfo={selectedProviderInfo}
              onComplete={(apiKey, model, baseUrl) => {
                setState((s) => ({ ...s, apiKey, model, baseUrl }))
                goTo(3)
              }}
              onBack={() => goTo(1)}
            />
          )}

          {state.step === 3 && state.selectedProvider && (
            <DoneStep
              providerId={state.selectedProvider}
              model={state.model}
              apiKey={state.apiKey}
              baseUrl={state.baseUrl}
            />
          )}
        </div>

        <p className="text-center text-xs text-text-disabled mt-5">
          Step {state.step + 1} of {STEPS.length} — {STEPS[state.step]}
        </p>
      </div>
    </div>
  )
}
