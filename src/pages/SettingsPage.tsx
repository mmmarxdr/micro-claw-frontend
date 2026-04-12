import { useEffect, useMemo, useState } from 'react'
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

type Tab = 'agent' | 'provider' | 'channel' | 'tools' | 'web'

const TABS: { id: Tab; label: string }[] = [
  { id: 'agent',    label: 'Agent' },
  { id: 'provider', label: 'Provider' },
  { id: 'channel',  label: 'Channel' },
  { id: 'tools',    label: 'Tools' },
  { id: 'web',      label: 'Web' },
]

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
      const payload = JSON.parse(JSON.stringify(data)) as Record<string, unknown>
      const p = payload as {
        provider?: { api_key?: string }
        web?: { auth_token?: string }
        channel?: { token?: string }
      }
      if (p.provider?.api_key === MASKED_VALUE) delete p.provider.api_key
      if (p.web?.auth_token === MASKED_VALUE) delete p.web.auth_token
      if (p.channel?.token === MASKED_VALUE) delete p.channel.token
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
  const activeChannel = watch('channel.type')
  const shellAllowAll = watch('tools.shell.allow_all')

  const { data: remoteModels } = useQuery<ModelInfo[]>({
    queryKey: ['models'],
    queryFn: api.models,
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const [modelFilter, setModelFilter] = useState('')

  const modelOptions = useMemo(() => {
    if (remoteModels && remoteModels.length > 0 && selectedProvider === 'openrouter') {
      const lf = modelFilter.toLowerCase()
      return remoteModels
        .filter(m => !lf || m.id.toLowerCase().includes(lf) || m.name.toLowerCase().includes(lf))
        .slice(0, 50)
    }
    return (KNOWN_MODELS[selectedProvider] ?? []).map(id => ({
      id, name: id, context_length: 0, prompt_cost: 0, completion_cost: 0, free: false,
    }))
  }, [remoteModels, selectedProvider, modelFilter])

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
          onClick={handleSubmit(d => saveConfig(d))}
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
      <form onSubmit={handleSubmit(d => saveConfig(d))} className="space-y-5">

        {/* ── Agent ── */}
        {activeTab === 'agent' && (
          <>
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
          </>
        )}

        {/* ── Provider ── */}
        {activeTab === 'provider' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Provider" error={errors.provider?.type?.message}>
                <Select {...register('provider.type')}>
                  <option value="openrouter">OpenRouter</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="ollama">Ollama</option>
                  <option value="gemini">Gemini</option>
                </Select>
              </FormField>
              <FormField label="Max retries">
                <Input type="number" min={0} {...register('provider.max_retries', { valueAsNumber: true })} />
              </FormField>
            </div>
            <FormField label="Model" error={errors.provider?.model?.message} required>
              {selectedProvider === 'openrouter' && remoteModels && remoteModels.length > 0 ? (
                <div className="space-y-2">
                  <Input
                    value={modelFilter}
                    onChange={e => setModelFilter(e.target.value)}
                    placeholder="Search models..."
                  />
                  <Select {...register('provider.model')}>
                    {modelOptions.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}{m.free ? ' (free)' : m.prompt_cost > 0 ? ` ($${m.prompt_cost}/M)` : ''}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-text-disabled">
                    {remoteModels.length} models{modelFilter ? ` / ${modelOptions.length} shown` : ''}
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
            <FormField label="API key" hint="Leave unchanged to keep existing.">
              <Input type="password" {...register('provider.api_key')} placeholder="sk-..." autoComplete="off" />
            </FormField>
            <FormField label="Base URL" hint="Override endpoint (optional).">
              <Input {...register('provider.base_url')} placeholder="https://api.example.com" />
            </FormField>
            <Controller
              name="provider.stream"
              control={control}
              render={({ field }) => (
                <Toggle checked={field.value ?? true} onChange={field.onChange} label="Streaming" description="Stream tokens as they arrive" />
              )}
            />
          </>
        )}

        {/* ── Channel ── */}
        {activeTab === 'channel' && (
          <>
            <FormField label="Channel type">
              <Select {...register('channel.type')}>
                <option value="cli">CLI</option>
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
              </Select>
            </FormField>
            {activeChannel === 'telegram' && (
              <>
                <FormField label="Bot token" hint="Leave unchanged to keep existing.">
                  <Input type="password" {...register('channel.token')} placeholder="1234567890:ABC..." autoComplete="off" />
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
                        placeholder="123456789"
                      />
                    )}
                  />
                </FormField>
              </>
            )}
            {activeChannel === 'discord' && (
              <>
                <FormField label="Bot token" hint="Leave unchanged to keep existing.">
                  <Input type="password" {...register('channel.token')} placeholder="Bot token..." autoComplete="off" />
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
                        placeholder="User ID"
                      />
                    )}
                  />
                </FormField>
              </>
            )}
          </>
        )}

        {/* ── Tools ── */}
        {activeTab === 'tools' && (
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
        )}

        {/* ── Web ── */}
        {activeTab === 'web' && (
          <>
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
          </>
        )}

      </form>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
