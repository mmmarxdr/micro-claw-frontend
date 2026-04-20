import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { configSchema, DEFAULT_CONFIG, MASKED_REGEX, PROVIDER_NAMES } from '../schemas/config'
import type { ConfigFormData, ProviderName } from '../schemas/config'
import { useProviderModels } from '../hooks/useProviderModels'
import { ModelPicker } from '../components/provider/ModelPicker'
import { stripMaskedKeys } from '../lib/mask'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Toggle } from '../components/ui/Toggle'
import { FormField } from '../components/ui/FormField'
import { TagInput } from '../components/ui/TagInput'
import { Toast } from '../components/ui/Toast'
import { DangerZoneModal } from '../components/DangerZoneModal'
import { setupApi } from '../api/setup'
import { useSetup } from '../contexts/SetupContext'
import { cn } from '../lib/utils'

type Tab = 'agent' | 'provider' | 'channel' | 'tools' | 'web'

const TABS: { id: Tab; label: string }[] = [
  { id: 'agent',    label: 'Agent' },
  { id: 'provider', label: 'Provider' },
  { id: 'channel',  label: 'Channel' },
  { id: 'tools',    label: 'Tools' },
  { id: 'web',      label: 'Web' },
]

const PROVIDER_LABELS: Record<ProviderName, string> = {
  anthropic:  'Anthropic',
  openai:     'OpenAI',
  gemini:     'Gemini',
  openrouter: 'OpenRouter',
  ollama:     'Ollama',
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('agent')
  const [activeProviderTab, setActiveProviderTab] = useState<ProviderName>('openrouter')
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)
  const [dangerModalOpen, setDangerModalOpen] = useState(false)
  const [dangerError, setDangerError] = useState<string | null>(null)
  const [dangerPending, setDangerPending] = useState(false)
  const [warnModalOpen, setWarnModalOpen] = useState(false)
  const [pendingSubmitData, setPendingSubmitData] = useState<ConfigFormData | null>(null)
  const { setNeedsSetup } = useSetup()
  const qc = useQueryClient()

  const { data: configData, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: api.config,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ConfigFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: DEFAULT_CONFIG,
  })

  useEffect(() => {
    if (configData) reset(configData as ConfigFormData)
  }, [configData, reset])

  const { mutate: saveConfig, isPending } = useMutation({
    mutationFn: (data: ConfigFormData) => {
      const payload = JSON.parse(JSON.stringify(data)) as Record<string, unknown>
      const p = payload as {
        providers?: Record<string, { api_key?: string; base_url?: string }>
        web?: { auth_token?: string }
        channel?: { token?: string }
      }
      if (p.providers) p.providers = stripMaskedKeys(p.providers)
      if (p.web?.auth_token && MASKED_REGEX.test(p.web.auth_token)) delete p.web.auth_token
      if (p.channel?.token && MASKED_REGEX.test(p.channel.token)) delete p.channel.token
      return api.updateConfig(payload)
    },
    onSuccess: () => {
      setToast({ message: 'Settings saved successfully.', variant: 'success' })
      qc.invalidateQueries({ queryKey: ['config'] })
    },
    onError: (err: Error) => {
      setToast({ message: err.message ?? 'Failed to save settings.', variant: 'error' })
    },
  })

  const activeProvider = watch('models.default.provider')
  const activeProviderKey = watch(`providers.${activeProvider}.api_key`)
  const activeChannel = watch('channel.type')
  const shellAllowAll = watch('tools.shell.allow_all')

  const { data: providerModelsData, isLoading: modelsLoading, error: modelsError } = useProviderModels(activeProvider)

  function needsProviderWarning(): boolean {
    if (activeProvider === 'ollama') return false
    // If there's a real (non-masked, non-empty) key being entered, no warning
    if (activeProviderKey && !MASKED_REGEX.test(activeProviderKey)) return false
    // Check stored config — if stored config has a masked key, that IS a real key on the server
    const stored = configData as ConfigFormData | undefined
    const storedKey = stored?.providers?.[activeProvider]?.api_key
    if (storedKey && storedKey !== '') return false
    return true
  }

  function onSubmit(data: ConfigFormData) {
    if (needsProviderWarning()) {
      setPendingSubmitData(data)
      setWarnModalOpen(true)
      return
    }
    saveConfig(data)
  }

  function handleWarnConfirm() {
    setWarnModalOpen(false)
    if (pendingSubmitData) {
      saveConfig(pendingSubmitData)
      setPendingSubmitData(null)
    }
  }

  function handleWarnCancel() {
    setWarnModalOpen(false)
    setPendingSubmitData(null)
  }

  async function handleReset() {
    setDangerError(null)
    setDangerPending(true)
    try {
      await setupApi.deleteConfig('DELETE')
      setDangerModalOpen(false)
      setNeedsSetup(true)
    } catch (err) {
      setDangerError(err instanceof Error ? err.message : 'Reset failed. Please try again.')
    } finally {
      setDangerPending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="px-6 md:px-10 py-8 max-w-2xl mx-auto">
        <div className="h-7 w-32 animate-pulse bg-hover-surface rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map(k => <div key={k} className="h-14 animate-pulse bg-surface rounded-md border border-border" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
          <p className="text-sm text-text-secondary mt-0.5">Configure the agent without editing YAML.</p>
        </div>
        <Button
          onClick={handleSubmit(onSubmit, (errs) => {
            // Surface the first validation error so save failures aren't silent.
            const firstPath = Object.keys(errs)[0]
            const firstMsg = (() => {
              const node = errs as Record<string, unknown>
              const stack: Array<unknown> = [node[firstPath]]
              while (stack.length) {
                const cur = stack.pop()
                if (cur && typeof cur === 'object') {
                  const m = (cur as { message?: unknown }).message
                  if (typeof m === 'string') return m
                  Object.values(cur as Record<string, unknown>).forEach((v) => stack.push(v))
                }
              }
              return 'invalid value'
            })()
            setToast({
              message: `Cannot save — ${firstPath}: ${firstMsg}`,
              variant: 'error',
            })
          })}
          disabled={isPending || !isDirty}
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface rounded-lg p-1 border border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === tab.id
                ? 'bg-hover-surface text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Agent ── */}
        <div className={cn(activeTab !== 'agent' && 'hidden')}>
          <div className="space-y-5">
            <FormField label="Agent name" error={errors.agent?.name?.message} required>
              <Input {...register('agent.name')} placeholder="MicroAgent" />
            </FormField>
            <FormField label="Personality" hint="System prompt injected at every turn.">
              <textarea
                {...register('agent.personality')}
                rows={5}
                className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong resize-y"
                placeholder="You are a helpful assistant..."
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Max iterations" hint="1-50" error={errors.agent?.max_iterations?.message}>
                <Input type="number" min={1} max={50} {...register('agent.max_iterations', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Max tokens / turn" error={errors.agent?.max_tokens_per_turn?.message}>
                <Input type="number" min={1} {...register('agent.max_tokens_per_turn', { valueAsNumber: true })} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="History length" hint="1-100">
                <Input type="number" min={1} max={100} {...register('agent.history_length', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Memory results">
                <Input type="number" min={0} {...register('agent.memory_results', { valueAsNumber: true })} />
              </FormField>
            </div>
          </div>
        </div>

        {/* ── Provider ── */}
        <div className={cn(activeTab !== 'provider' && 'hidden')}>
          <div className="space-y-5">
            {/* Active provider + model selectors */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Active provider" error={errors.models?.default?.provider?.message}>
                <Select aria-label="Active provider" {...register('models.default.provider')}>
                  {PROVIDER_NAMES.map(p => (
                    <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                  ))}
                </Select>
              </FormField>
            </div>

            <FormField label="Model" error={errors.models?.default?.model?.message} required>
              <Controller
                name="models.default.model"
                control={control}
                render={({ field }) => {
                  // Inject current model into list if not present (AS-22)
                  const rawModels = providerModelsData?.models ?? []
                  const modelList = field.value && !rawModels.find(m => m.id === field.value)
                    ? [{ id: field.value, name: field.value, context_length: 0, prompt_cost: 0, completion_cost: 0, free: false }, ...rawModels]
                    : rawModels
                  return (
                    <ModelPicker
                      value={field.value}
                      onChange={field.onChange}
                      modelList={modelList}
                      isLoading={modelsLoading}
                      error={modelsError instanceof Error ? modelsError : null}
                    />
                  )
                }}
              />
              {providerModelsData && (
                <p className="text-xs text-text-disabled mt-1">
                  {providerModelsData.models.length} models · source: {providerModelsData.source}
                </p>
              )}
            </FormField>

            {/* Provider credentials sub-tabs */}
            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">Provider Credentials</p>
              {/* Sub-tab strip */}
              <div className="flex gap-1 mb-4 bg-surface rounded-lg p-1 border border-border">
                {PROVIDER_NAMES.map(p => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setActiveProviderTab(p)}
                    className={cn(
                      'flex-1 px-2 py-1 text-xs font-medium rounded-md transition-colors',
                      activeProviderTab === p
                        ? 'bg-hover-surface text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {PROVIDER_LABELS[p]}
                  </button>
                ))}
              </div>

              {/* All provider panes — CSS hidden for inactive tabs (NOT conditional render) */}
              {PROVIDER_NAMES.map(providerName => (
                <div key={providerName} className={cn('space-y-4', activeProviderTab !== providerName && 'hidden')}>
                  <FormField label="API key" hint="Leave unchanged to keep existing.">
                    <Input
                      type="password"
                      {...register(`providers.${providerName}.api_key`)}
                      placeholder="sk-..."
                      autoComplete="off"
                    />
                  </FormField>
                  <FormField label="Base URL" hint="Override endpoint (optional).">
                    <Input
                      {...register(`providers.${providerName}.base_url`)}
                      placeholder={providerName === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com'}
                    />
                  </FormField>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Channel ── */}
        <div className={cn(activeTab !== 'channel' && 'hidden')}>
          <div className="space-y-5">
            <FormField label="Channel type">
              <Select {...register('channel.type')}>
                <option value="cli">CLI</option>
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
              </Select>
            </FormField>
            {(activeChannel === 'telegram' || activeChannel === 'discord') && (
              <>
                <FormField label="Bot token" hint="Leave unchanged to keep existing.">
                  <Input type="password" {...register('channel.token')} placeholder={activeChannel === 'telegram' ? '1234567890:ABC...' : 'Bot token...'} autoComplete="off" />
                </FormField>
                <FormField label="Allowed user IDs" hint="Press Enter to add.">
                  <Controller
                    name="channel.allowed_users"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <TagInput
                        value={(field.value ?? []).map(String)}
                        onChange={vals => field.onChange(vals.map(Number))}
                        placeholder={activeChannel === 'telegram' ? '123456789' : 'User ID'}
                      />
                    )}
                  />
                </FormField>
              </>
            )}
          </div>
        </div>

        {/* ── Tools ── */}
        <div className={cn(activeTab !== 'tools' && 'hidden')}>
          <div className="space-y-6">
            {/* Shell */}
            <div className="border border-border rounded-md p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Shell</h3>
                <Controller
                  name="tools.shell.enabled"
                  control={control}
                  render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} />}
                />
              </div>
              <Controller
                name="tools.shell.allow_all"
                control={control}
                render={({ field }) => (
                  <Toggle checked={field.value} onChange={field.onChange} label="Allow all commands" description="Bypass command whitelist" />
                )}
              />
              <FormField label="Working directory">
                <Input {...register('tools.shell.working_dir')} placeholder="~" />
              </FormField>
              {!shellAllowAll && (
                <FormField label="Allowed commands" hint="Press Enter to add.">
                  <Controller
                    name="tools.shell.allowed_commands"
                    control={control}
                    render={({ field }) => (
                      <TagInput value={field.value ?? []} onChange={field.onChange} placeholder="ls, cat, grep..." />
                    )}
                  />
                </FormField>
              )}
            </div>

            {/* File */}
            <div className="border border-border rounded-md p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">File</h3>
                <Controller
                  name="tools.file.enabled"
                  control={control}
                  render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} />}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Base path">
                  <Input {...register('tools.file.base_path')} placeholder="~/workspace" />
                </FormField>
                <FormField label="Max file size">
                  <Input {...register('tools.file.max_file_size')} placeholder="1MB" />
                </FormField>
              </div>
            </div>

            {/* HTTP */}
            <div className="border border-border rounded-md p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">HTTP</h3>
                <Controller
                  name="tools.http.enabled"
                  control={control}
                  render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} />}
                />
              </div>
              <FormField label="Max response size">
                <Input {...register('tools.http.max_response_size')} placeholder="512KB" />
              </FormField>
              <FormField label="Blocked domains" hint="Press Enter to add.">
                <Controller
                  name="tools.http.blocked_domains"
                  control={control}
                  render={({ field }) => (
                    <TagInput value={field.value ?? []} onChange={field.onChange} placeholder="example.com" />
                  )}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* ── Web ── */}
        <div className={cn(activeTab !== 'web' && 'hidden')}>
          <div className="space-y-5">
            <Controller
              name="web.enabled"
              control={control}
              render={({ field }) => (
                <Toggle checked={field.value ?? true} onChange={field.onChange} label="Enable web dashboard" />
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Host">
                <Input {...register('web.host')} placeholder="0.0.0.0" />
              </FormField>
              <FormField label="Port" error={errors.web?.port?.message}>
                <Input type="number" min={1024} max={65535} {...register('web.port', { valueAsNumber: true })} />
              </FormField>
            </div>
            <FormField label="Auth token" hint="Leave blank to auto-generate on startup.">
              <Input type="password" {...register('web.auth_token')} autoComplete="off" />
            </FormField>
          </div>
        </div>

      </form>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}

      {/* ── Provider-switch warning modal ── */}
      {warnModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="provider-warn-title"
        >
          <div className="absolute inset-0 bg-black/70" onClick={handleWarnCancel} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-md mx-4 bg-[#111111] border border-[#222222] rounded-md p-6 space-y-4">
            <h2 id="provider-warn-title" className="text-sm font-semibold text-text-primary">
              No credentials configured
            </h2>
            <p className="text-sm text-text-secondary">
              The selected provider (<strong>{activeProvider}</strong>) has no API key configured.
              The agent will fail to call this provider until you add credentials.
              Save anyway?
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleWarnCancel}>
                Cancel
              </Button>
              <Button type="button" onClick={handleWarnConfirm}>
                Save anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Danger Zone ── */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="rounded-md border border-error/30 bg-error/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-error">Danger Zone</h2>
              <p className="text-sm text-text-secondary mt-1">
                Irreversible actions that affect your agent configuration.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-md border border-error/20 bg-[#0a0a0a] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-text-primary">Reset Configuration</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Clear provider settings and restart the setup wizard.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setDangerError(null)
                setDangerModalOpen(true)
              }}
            >
              Reset Configuration
            </Button>
          </div>
        </div>
      </div>

      <DangerZoneModal
        isOpen={dangerModalOpen}
        onClose={() => {
          setDangerModalOpen(false)
          setDangerError(null)
        }}
        onConfirm={handleReset}
        isPending={dangerPending}
        error={dangerError}
      />
    </div>
  )
}
