import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { ModelInfo } from '../api/client'
import { configSchema, DEFAULT_CONFIG, KNOWN_MODELS, MASKED_VALUE } from '../schemas/config'
import type { ConfigFormData } from '../schemas/config'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Toggle } from '../components/ui/Toggle'
import { FormField } from '../components/ui/FormField'
import { TagInput } from '../components/ui/TagInput'
import { Toast } from '../components/ui/Toast'
import { cn } from '../lib/utils'

type Tab = 'agent' | 'provider' | 'channels' | 'tools' | 'limits' | 'dashboard'

type TabDef = { id: Tab; label: ReactNode }

const TABS: TabDef[] = [
  { id: 'agent',     label: 'Agent' },
  { id: 'provider',  label: 'Provider' },
  { id: 'channels',  label: 'Channels' },
  { id: 'tools',     label: 'Tools' },
  { id: 'limits',    label: <><span className="hidden sm:inline">Limits & </span>Budget</> },
  { id: 'dashboard', label: 'Dashboard' },
]

// Shared section styles
const sectionClass = 'border-b border-border pb-6 mb-6 last:border-0 last:pb-0 last:mb-0'
const sectionTitleClass = 'text-sm font-semibold text-text-primary mb-4'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('agent')
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)
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
    resolver: zodResolver(configSchema),
    defaultValues: DEFAULT_CONFIG,
  })

  useEffect(() => {
    if (configData) reset(configData as ConfigFormData)
  }, [configData, reset])

  const { mutate: saveConfig, isPending } = useMutation({
    mutationFn: (data: ConfigFormData) => {
      // Strip masked fields — if value is still masked, omit from payload
      const payload = JSON.parse(JSON.stringify(data)) as Record<string, unknown>
      const p = payload as {
        provider?: { api_key?: string }
        dashboard?: { auth_token?: string }
        channels?: { telegram?: { token?: string } }
      }
      if (p.provider?.api_key === MASKED_VALUE) delete p.provider.api_key
      if (p.dashboard?.auth_token === MASKED_VALUE) delete p.dashboard.auth_token
      if (p.channels?.telegram?.token === MASKED_VALUE) delete p.channels.telegram.token
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

  const selectedProvider = watch('provider.type')
  const activeChannel = watch('channels.active')
  const shellAllowAll = watch('tools.shell.allow_all')

  // Dynamic model list from API (OpenRouter returns 350+ models).
  const { data: remoteModels } = useQuery<ModelInfo[]>({
    queryKey: ['models'],
    queryFn: api.models,
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const [modelFilter, setModelFilter] = useState('')

  const modelOptions = useMemo(() => {
    // If we have remote models and provider is openrouter, use them.
    if (remoteModels && remoteModels.length > 0 && selectedProvider === 'openrouter') {
      const lowerFilter = modelFilter.toLowerCase()
      return remoteModels
        .filter(m => !lowerFilter || m.id.toLowerCase().includes(lowerFilter) || m.name.toLowerCase().includes(lowerFilter))
        .slice(0, 50) // cap for performance
    }
    // Static fallback for other providers.
    return (KNOWN_MODELS[selectedProvider] ?? []).map(id => ({ id, name: id, context_length: 0, prompt_cost: 0, completion_cost: 0, free: false }))
  }, [remoteModels, selectedProvider, modelFilter])

  if (isLoading) {
    return (
      <div className="px-6 md:px-8 py-6 md:py-8 max-w-3xl">
        <div className="h-7 w-32 animate-pulse bg-hover-surface rounded mb-6" />
        <div className="space-y-4">
          {['a', 'b', 'c', 'd', 'e'].map(k => <div key={k} className="h-12 animate-pulse bg-surface rounded-md border border-border" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 py-6 md:py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
          <p className="text-sm text-text-secondary mt-1">Configure the agent without editing YAML files.</p>
        </div>
        <Button
          onClick={handleSubmit(d => saveConfig(d))}
          disabled={isPending || !isDirty}
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border flex gap-0 mb-6 overflow-x-auto whitespace-nowrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-accent border-b-2 border-accent -mb-px'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <form onSubmit={handleSubmit(d => saveConfig(d))}>

        {/* ── Agent ── */}
        {activeTab === 'agent' && (
          <div className="space-y-0">
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Identity</h3>
              <div className="space-y-5">
                <FormField label="Agent name" error={errors.agent?.name?.message} required>
                  <Input {...register('agent.name')} placeholder="MicroAgent" />
                </FormField>
                <FormField label="System prompt" hint="Personality and instructions for the agent.">
                  <textarea
                    {...register('agent.system_prompt')}
                    rows={6}
                    className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong resize-y"
                    placeholder="You are a helpful assistant…"
                  />
                </FormField>
              </div>
            </div>
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Limits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Max iterations" hint="1–50" error={errors.agent?.max_iterations?.message}>
                  <Input type="number" min={1} max={50} {...register('agent.max_iterations', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Max tokens" error={errors.agent?.max_tokens?.message}>
                  <Input type="number" min={1} {...register('agent.max_tokens', { valueAsNumber: true })} />
                </FormField>
                <FormField label="History length" hint="1–100" error={errors.agent?.history_length?.message}>
                  <Input type="number" min={1} max={100} {...register('agent.history_length', { valueAsNumber: true })} />
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* ── Provider ── */}
        {activeTab === 'provider' && (
          <div className="space-y-5">
            <FormField label="Provider" error={errors.provider?.type?.message}>
              <Select {...register('provider.type')}>
                <option value="openrouter">OpenRouter</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="ollama">Ollama</option>
                <option value="gemini">Gemini</option>
              </Select>
            </FormField>
            <FormField label="Model" error={errors.provider?.model?.message} required>
              {selectedProvider === 'openrouter' && remoteModels && remoteModels.length > 0 ? (
                <div className="space-y-2">
                  <Input
                    value={modelFilter}
                    onChange={e => setModelFilter(e.target.value)}
                    placeholder="Filter models…"
                  />
                  <Select {...register('provider.model')}>
                    {modelOptions.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}{m.free ? ' (free)' : m.prompt_cost > 0 ? ` ($${m.prompt_cost}/M)` : ''}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-text-disabled">
                    {remoteModels.length} models available{modelFilter ? `, showing ${modelOptions.length}` : ''}
                  </p>
                </div>
              ) : (
                <Select {...register('provider.model')}>
                  {modelOptions.map(m => (
                    <option key={m.id} value={m.id}>{m.id}</option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label="API key" hint="Leave unchanged to keep existing key.">
              <Input type="password" {...register('provider.api_key')} placeholder="sk-…" autoComplete="off" />
            </FormField>
            <FormField label="Base URL" hint="Override API base URL (optional).">
              <Input {...register('provider.base_url')} placeholder="https://api.example.com" />
            </FormField>
            <FormField label="Timeout" hint="seconds" error={errors.provider?.timeout?.message}>
              <Input type="number" min={1} {...register('provider.timeout', { valueAsNumber: true })} className="w-32" />
            </FormField>
          </div>
        )}

        {/* ── Channels ── */}
        {activeTab === 'channels' && (
          <div className="space-y-0">
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Active Channel</h3>
              <FormField label="Channel">
                <Select {...register('channels.active')}>
                  <option value="cli">CLI</option>
                  <option value="telegram">Telegram</option>
                  <option value="discord">Discord</option>
                </Select>
              </FormField>
            </div>

            {activeChannel === 'telegram' && (
              <div className={sectionClass}>
                <h3 className={sectionTitleClass}>Telegram</h3>
                <div className="space-y-5">
                  <FormField label="Bot token" hint="Leave unchanged to keep existing token.">
                    <Input type="password" {...register('channels.telegram.token')} placeholder="1234567890:ABC…" autoComplete="off" />
                  </FormField>
                  <FormField label="Allowed user IDs" hint="Press Enter or comma to add. Leave empty to allow all.">
                    <Controller
                      name="channels.telegram.allowed_user_ids"
                      control={control}
                      defaultValue={[]}
                      render={({ field }) => (
                        <TagInput value={field.value ?? []} onChange={field.onChange} placeholder="123456789" />
                      )}
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tools ── */}
        {activeTab === 'tools' && (
          <div className="space-y-0">
            {/* Shell */}
            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={sectionTitleClass} style={{ marginBottom: 0 }}>Shell</h3>
                <Controller
                  name="tools.shell.enabled"
                  control={control}
                  render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} />}
                />
              </div>
              <div className="space-y-4">
                <Controller
                  name="tools.shell.allow_all"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      checked={field.value}
                      onChange={field.onChange}
                      label="Allow all commands"
                      description="Allows any shell command — use with caution"
                    />
                  )}
                />
                <FormField label="Allowed commands" hint="Press Enter to add. Ignored when 'Allow all' is on.">
                  <Controller
                    name="tools.shell.allowed_commands"
                    control={control}
                    render={({ field }) => (
                      <TagInput value={field.value} onChange={field.onChange} disabled={shellAllowAll} placeholder="ls, cat, grep…" />
                    )}
                  />
                </FormField>
              </div>
            </div>

            {/* File */}
            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={sectionTitleClass} style={{ marginBottom: 0 }}>File</h3>
                <Controller
                  name="tools.file.enabled"
                  control={control}
                  render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} />}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Base path">
                  <Input {...register('tools.file.base_path')} placeholder="~" />
                </FormField>
                <FormField label="Max file size" hint="bytes">
                  <Input type="number" min={1} {...register('tools.file.max_file_size', { valueAsNumber: true })} />
                </FormField>
              </div>
            </div>

            {/* HTTP */}
            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={sectionTitleClass} style={{ marginBottom: 0 }}>HTTP</h3>
                <Controller
                  name="tools.http.enabled"
                  control={control}
                  render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} />}
                />
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Timeout" hint="seconds">
                    <Input type="number" min={1} {...register('tools.http.timeout', { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Max response size" hint="bytes">
                    <Input type="number" min={1} {...register('tools.http.max_response_size', { valueAsNumber: true })} />
                  </FormField>
                </div>
                <FormField label="Blocked domains" hint="Press Enter to add.">
                  <Controller
                    name="tools.http.blocked_domains"
                    control={control}
                    render={({ field }) => (
                      <TagInput value={field.value} onChange={field.onChange} placeholder="example.com" />
                    )}
                  />
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* ── Limits & Budget ── */}
        {activeTab === 'limits' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tool timeout" hint="seconds per tool call" error={errors.limits?.tool_timeout?.message}>
                <Input type="number" min={1} {...register('limits.tool_timeout', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Total timeout" hint="seconds per conversation turn" error={errors.limits?.total_timeout?.message}>
                <Input type="number" min={1} {...register('limits.total_timeout', { valueAsNumber: true })} />
              </FormField>
            </div>
            <FormField label="Monthly cost budget" hint="USD — used for quota progress bar. 0 = no limit." error={errors.limits?.monthly_budget_usd?.message}>
              <Input type="number" min={0} step={0.01} {...register('limits.monthly_budget_usd', { valueAsNumber: true })} className="w-40" />
            </FormField>
          </div>
        )}

        {/* ── Dashboard ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            <FormField label="Port" hint="1024–65535" error={errors.dashboard?.port?.message}>
              <Input type="number" min={1024} max={65535} {...register('dashboard.port', { valueAsNumber: true })} className="w-32" />
            </FormField>
            <FormField label="Auth token" hint="Optional — leave blank to disable authentication.">
              <Input type="password" {...register('dashboard.auth_token')} autoComplete="off" />
            </FormField>
          </div>
        )}

      </form>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
