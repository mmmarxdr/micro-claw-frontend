import { z } from 'zod'
import { MASKED_REGEX } from '../lib/mask'

export { MASKED_REGEX }

export const PROVIDER_NAMES = ['anthropic', 'openai', 'gemini', 'openrouter', 'ollama'] as const
export type ProviderName = typeof PROVIDER_NAMES[number]

const providerCredsSchema = z.object({
  api_key: z.string().default(''),
  base_url: z.string().default(''),
})

export const configSchema = z.object({
  agent: z.object({
    name: z.string().min(1, 'Name is required'),
    personality: z.string(),
    max_iterations: z.number().int().min(1).max(50),
    max_tokens_per_turn: z.number().int().min(1),
    history_length: z.number().int().min(1).max(100),
    memory_results: z.number().int().min(0).optional(),
  }),
  providers: z.object({
    anthropic:  providerCredsSchema,
    openai:     providerCredsSchema,
    gemini:     providerCredsSchema,
    openrouter: providerCredsSchema,
    ollama:     providerCredsSchema,
  }),
  models: z.object({
    default: z.object({
      provider: z.enum(PROVIDER_NAMES),
      model: z.string().min(1, 'Model is required'),
    }),
  }),
  // Flat channel config (not nested channels.telegram)
  channel: z.object({
    // Coerce empty/null to 'cli' so legacy/partial configs don't fail validation silently.
    type: z.preprocess(
      (v) => (v === '' || v == null ? 'cli' : v),
      z.enum(['cli', 'telegram', 'discord']),
    ),
    token: z.string().optional(),
    allowed_users: z.array(z.any()).optional(),
  }),
  tools: z.object({
    shell: z.object({
      enabled: z.boolean(),
      allow_all: z.boolean(),
      allowed_commands: z.array(z.string()),
      working_dir: z.string().optional(),
    }),
    file: z.object({
      enabled: z.boolean(),
      base_path: z.string(),
      max_file_size: z.string(),   // string like "1MB"
    }),
    http: z.object({
      enabled: z.boolean(),
      timeout: z.any().optional(),
      max_response_size: z.string().optional(),  // string like "1MB"
      blocked_domains: z.array(z.string()),
    }),
  }),
  store: z.object({
    type: z.string().optional(),
    path: z.string().optional(),
  }).optional(),
  limits: z.object({
    tool_timeout: z.any().optional(),   // nanoseconds int64 from backend
    total_timeout: z.any().optional(),  // nanoseconds int64 from backend
  }).optional(),
  web: z.object({
    enabled: z.boolean().optional(),
    port: z.number().int().min(1024).max(65535),
    host: z.string().optional(),
    auth_token: z.string().optional(),
  }),
  audit: z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['sqlite', 'file']).optional(),
    path: z.string().optional(),
  }).optional(),
  logging: z.object({
    level: z.string().optional(),
    format: z.string().optional(),
  }).optional(),
  cron: z.object({
    enabled: z.boolean().optional(),
    timezone: z.string().optional(),
    retention_days: z.number().int().optional(),
    max_results_per_job: z.number().int().optional(),
    max_concurrent: z.number().int().optional(),
  }).optional(),
  rag: z.object({
    enabled: z.boolean().optional(),
    embedding: z.object({
      enabled: z.boolean().default(false),
      provider: z.string().default(''), // 'openai' | 'gemini' | ''
      model: z.string().default(''),
      api_key: z.string().default(''),
      base_url: z.string().default(''),
    }).optional(),
  }).optional(),
})

export type ConfigFormData = z.infer<typeof configSchema>

export const DEFAULT_CONFIG: ConfigFormData = {
  agent: { name: 'Daimon', personality: '', max_iterations: 10, max_tokens_per_turn: 4096, history_length: 20, memory_results: 5 },
  providers: {
    anthropic:  { api_key: '', base_url: '' },
    openai:     { api_key: '', base_url: '' },
    gemini:     { api_key: '', base_url: '' },
    openrouter: { api_key: '', base_url: '' },
    ollama:     { api_key: '', base_url: 'http://localhost:11434' },
  },
  models: { default: { provider: 'openrouter', model: 'anthropic/claude-haiku-4.5' } },
  channel: { type: 'cli', token: '', allowed_users: [] },
  tools: {
    shell: { enabled: true, allow_all: false, allowed_commands: [], working_dir: '' },
    file:  { enabled: true, base_path: '~', max_file_size: '1MB' },
    http:  { enabled: true, timeout: 30, max_response_size: '1MB', blocked_domains: [] },
  },
  limits: { tool_timeout: 30_000_000_000, total_timeout: 300_000_000_000 },
  web: { enabled: true, port: 8080, host: '0.0.0.0', auth_token: '' },
  audit: { enabled: true, type: 'sqlite', path: '~/.daimon/audit' },
  rag: {
    enabled: false,
    embedding: { enabled: false, provider: '', model: '', api_key: '', base_url: '' },
  },
}
