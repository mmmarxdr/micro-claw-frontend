import { z } from 'zod'

const MASKED = '••••••••'

export const configSchema = z.object({
  agent: z.object({
    name: z.string().min(1, 'Name is required'),
    system_prompt: z.string(),
    max_iterations: z.number().int().min(1).max(50),
    max_tokens: z.number().int().min(1),
    history_length: z.number().int().min(1).max(100),
  }),
  provider: z.object({
    type: z.enum(['openrouter', 'anthropic', 'openai', 'ollama', 'gemini']),
    model: z.string().min(1, 'Model is required'),
    api_key: z.string(),    // may be masked — handled on submit
    base_url: z.string().optional(),
    timeout: z.number().int().min(1),
  }),
  channels: z.object({
    active: z.enum(['cli', 'telegram', 'discord']),
    telegram: z.object({
      token: z.string(),
      allowed_user_ids: z.array(z.string()),
    }).optional(),
  }),
  tools: z.object({
    shell: z.object({
      enabled: z.boolean(),
      allow_all: z.boolean(),
      allowed_commands: z.array(z.string()),
    }),
    file: z.object({
      enabled: z.boolean(),
      base_path: z.string(),
      max_file_size: z.number().int().min(1),
    }),
    http: z.object({
      enabled: z.boolean(),
      timeout: z.number().int().min(1),
      max_response_size: z.number().int().min(1),
      blocked_domains: z.array(z.string()),
    }),
  }),
  limits: z.object({
    tool_timeout: z.number().int().min(1),
    total_timeout: z.number().int().min(1),
    monthly_budget_usd: z.number().min(0).optional(),
  }),
  dashboard: z.object({
    port: z.number().int().min(1024).max(65535),
    auth_token: z.string().optional(),
  }),
})

export type ConfigFormData = z.infer<typeof configSchema>

export const MASKED_VALUE = MASKED

// Static fallback when /api/models is unavailable.
export const KNOWN_MODELS: Record<string, string[]> = {
  openrouter: ['openrouter/auto', 'google/gemini-2.0-flash-001', 'anthropic/claude-sonnet-4'],
  anthropic:  ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'],
  openai:     ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  ollama:     ['llama3.2', 'mistral', 'qwen2.5-coder'],
  gemini:     ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
}

export const DEFAULT_CONFIG: ConfigFormData = {
  agent: { name: 'MicroAgent', system_prompt: '', max_iterations: 10, max_tokens: 4096, history_length: 20 },
  provider: { type: 'openrouter', model: 'openrouter/auto', api_key: '', base_url: '', timeout: 60 },
  channels: { active: 'cli', telegram: { token: '', allowed_user_ids: [] } },
  tools: {
    shell: { enabled: true, allow_all: false, allowed_commands: [] },
    file:  { enabled: true, base_path: '~', max_file_size: 1048576 },
    http:  { enabled: true, timeout: 30, max_response_size: 1048576, blocked_domains: [] },
  },
  limits: { tool_timeout: 30, total_timeout: 300, monthly_budget_usd: 0 },
  dashboard: { port: 8080, auth_token: '' },
}
