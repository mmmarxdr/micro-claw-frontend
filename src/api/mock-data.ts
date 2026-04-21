// ─── Mock Seed Data ───────────────────────────────────────────────────────────
// Pure data module — no logic, exported constants only.
// All values conform to the TypeScript interfaces in client.ts.

import type { AgentStatus, MetricsSnapshot, Conversation, MemoryEntry } from './client'

// ── Task 1.1: Agent status ────────────────────────────────────────────────────

export const seedStatus: AgentStatus = {
  status: 'running',
  uptime_seconds: 3_600,
  version: '0.4.2',
}

// ── Task 1.2 & 1.3: Metrics today / month ────────────────────────────────────

export const seedMetricsToday = {
  input_tokens:  12_450,
  output_tokens:  8_320,
  cost_usd:       0.4218,
  conversations:  7,
  messages:       34,
}

export const seedMetricsMonth = {
  input_tokens:  287_000,
  output_tokens: 198_000,
  cost_usd:       11.20,
}

// ── Task 1.4: 30-day metrics history ─────────────────────────────────────────

function buildHistory(): MetricsSnapshot['history'] {
  const days = 30
  const history: MetricsSnapshot['history'] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    // Vary usage realistically
    const base = 0.7 + Math.sin(i * 0.4) * 0.3
    history.push({
      date:          dateStr,
      input_tokens:  Math.round(8_000 * base + i * 120),
      output_tokens: Math.round(5_500 * base + i * 80),
      cost_usd:      parseFloat((0.28 * base + i * 0.004).toFixed(6)),
    })
  }
  return history
}

export const seedMetricsHistory: MetricsSnapshot['history'] = buildHistory()

export const seedMetrics: MetricsSnapshot = {
  today:   seedMetricsToday,
  month:   seedMetricsMonth,
  history: seedMetricsHistory,
}

// ── Task 1.5: Conversations ───────────────────────────────────────────────────

export const seedConversations: Conversation[] = [
  {
    id:         'conv-001',
    channel_id: 'cli',
    created_at: '2026-03-19T08:00:00Z',
    updated_at: '2026-03-19T08:12:00Z',
    messages: [
      {
        role:      'user',
        content:   'List all files in the current directory.',
        timestamp: '2026-03-19T08:00:10Z',
      },
      {
        role:      'tool',
        content:   '{"tool":"shell","command":"ls -la","output":"total 48\\ndrwxr-xr-x  8 user user 4096 Mar 19 08:00 .\\ndrwxr-xr-x 12 user user 4096 Mar 18 14:22 ..\\n-rw-r--r--  1 user user  512 Mar 19 07:55 README.md\\n-rw-r--r--  1 user user 1234 Mar 19 07:58 main.go"}',
        timestamp: '2026-03-19T08:00:12Z',
      },
      {
        role:      'assistant',
        content:   'Here are the files in your current directory:\n\n- **README.md** — documentation file\n- **main.go** — main Go source file\n\nWould you like me to inspect any of these?',
        timestamp: '2026-03-19T08:00:15Z',
      },
      {
        role:      'user',
        content:   'Show me the content of README.md.',
        timestamp: '2026-03-19T08:01:00Z',
      },
      {
        role:      'tool',
        content:   '{"tool":"file","operation":"read","path":"README.md","output":"# My Project\\n\\nA Go microservice for processing tasks."}',
        timestamp: '2026-03-19T08:01:01Z',
      },
      {
        role:      'assistant',
        content:   'The README.md contains:\n\n```\n# My Project\n\nA Go microservice for processing tasks.\n```',
        timestamp: '2026-03-19T08:01:05Z',
      },
    ],
  },
  {
    id:         'conv-002',
    channel_id: 'telegram',
    created_at: '2026-03-19T09:30:00Z',
    updated_at: '2026-03-19T09:45:00Z',
    messages: [
      {
        role:      'user',
        content:   'What is the current Bitcoin price?',
        timestamp: '2026-03-19T09:30:05Z',
      },
      {
        role:      'tool',
        content:   '{"tool":"http","url":"https://api.example.com/price/btc","output":"{\\"price\\":68420.50,\\"currency\\":\\"USD\\",\\"timestamp\\":\\"2026-03-19T09:30:00Z\\"}"}',
        timestamp: '2026-03-19T09:30:07Z',
      },
      {
        role:      'assistant',
        content:   'The current Bitcoin price is **$68,420.50 USD** as of 09:30 UTC.',
        timestamp: '2026-03-19T09:30:10Z',
      },
    ],
  },
  {
    id:         'conv-003',
    channel_id: 'cli',
    created_at: '2026-03-18T14:00:00Z',
    updated_at: '2026-03-18T14:22:00Z',
    messages: [
      {
        role:      'user',
        content:   'Write a Python script that sorts a list of numbers.',
        timestamp: '2026-03-18T14:00:20Z',
      },
      {
        role:      'assistant',
        content:   'Here is a simple Python script that sorts a list of numbers:\n\n```python\nnumbers = [5, 2, 8, 1, 9, 3]\nsorted_numbers = sorted(numbers)\nprint(sorted_numbers)  # [1, 2, 3, 5, 8, 9]\n```\n\nWould you like me to save this to a file?',
        timestamp: '2026-03-18T14:00:35Z',
      },
      {
        role:      'user',
        content:   'Yes, save it as sort.py.',
        timestamp: '2026-03-18T14:01:00Z',
      },
      {
        role:      'tool',
        content:   '{"tool":"file","operation":"write","path":"sort.py","status":"success"}',
        timestamp: '2026-03-18T14:01:02Z',
      },
      {
        role:      'assistant',
        content:   'Saved! The file `sort.py` has been created in your current directory.',
        timestamp: '2026-03-18T14:01:05Z',
      },
    ],
  },
  {
    id:         'conv-004',
    channel_id: 'telegram',
    created_at: '2026-03-18T11:00:00Z',
    updated_at: '2026-03-18T11:15:00Z',
    messages: [
      {
        role:      'user',
        content:   'Translate "Hello, how are you?" into Spanish, French, and German.',
        timestamp: '2026-03-18T11:00:10Z',
      },
      {
        role:      'assistant',
        content:   'Here are the translations:\n\n- **Spanish:** Hola, ¿cómo estás?\n- **French:** Bonjour, comment allez-vous?\n- **German:** Hallo, wie geht es Ihnen?',
        timestamp: '2026-03-18T11:00:20Z',
      },
    ],
  },
  {
    id:         'conv-005',
    channel_id: 'cli',
    created_at: '2026-03-17T16:00:00Z',
    updated_at: '2026-03-17T16:30:00Z',
    messages: [
      {
        role:      'user',
        content:   'Check the disk usage on this machine.',
        timestamp: '2026-03-17T16:00:05Z',
      },
      {
        role:      'tool',
        content:   '{"tool":"shell","command":"df -h","output":"Filesystem      Size  Used Avail Use% Mounted on\\n/dev/sda1       100G   42G   58G  42% /"}',
        timestamp: '2026-03-17T16:00:07Z',
      },
      {
        role:      'assistant',
        content:   'Your main disk (`/dev/sda1`) has:\n\n- **Total:** 100 GB\n- **Used:** 42 GB (42%)\n- **Available:** 58 GB\n\nDisk usage looks healthy.',
        timestamp: '2026-03-17T16:00:12Z',
      },
    ],
  },
  {
    id:         'conv-006',
    channel_id: 'cli',
    created_at: '2026-03-17T10:00:00Z',
    updated_at: '2026-03-17T10:20:00Z',
    messages: [
      {
        role:      'user',
        content:   'Explain the difference between TCP and UDP.',
        timestamp: '2026-03-17T10:00:15Z',
      },
      {
        role:      'assistant',
        content:   '**TCP (Transmission Control Protocol)**\n- Connection-oriented — establishes a connection before sending data\n- Reliable — guarantees delivery and ordering of packets\n- Slower due to overhead\n- Used for: HTTP, email, file transfers\n\n**UDP (User Datagram Protocol)**\n- Connectionless — sends packets without establishing a connection\n- Unreliable — no guarantee of delivery or ordering\n- Faster, lower overhead\n- Used for: video streaming, online gaming, DNS',
        timestamp: '2026-03-17T10:00:30Z',
      },
    ],
  },
  {
    id:         'conv-007',
    channel_id: 'telegram',
    created_at: '2026-03-16T20:00:00Z',
    updated_at: '2026-03-16T20:10:00Z',
    messages: [
      {
        role:      'user',
        content:   'What is 2 + 2?',
        timestamp: '2026-03-16T20:00:02Z',
      },
      {
        role:      'assistant',
        content:   '2 + 2 = 4',
        timestamp: '2026-03-16T20:00:03Z',
      },
    ],
  },
  {
    id:         'conv-008',
    channel_id: 'cli',
    created_at: '2026-03-15T09:00:00Z',
    updated_at: '2026-03-15T09:45:00Z',
    messages: [
      {
        role:      'user',
        content:   'Search the web for the latest news about AI.',
        timestamp: '2026-03-15T09:00:10Z',
      },
      {
        role:      'tool',
        content:   '{"tool":"http","url":"https://news.example.com/api?q=AI","output":"{\\"articles\\":[{\\"title\\":\\"OpenAI Releases GPT-5\\",\\"date\\":\\"2026-03-15\\"},{\\"title\\":\\"Google DeepMind Breakthrough in Protein Folding\\",\\"date\\":\\"2026-03-14\\"}]}"}',
        timestamp: '2026-03-15T09:00:15Z',
      },
      {
        role:      'assistant',
        content:   'Here are the latest AI news headlines:\n\n1. **OpenAI Releases GPT-5** — March 15, 2026\n2. **Google DeepMind Breakthrough in Protein Folding** — March 14, 2026\n\nWould you like me to fetch more details on any of these?',
        timestamp: '2026-03-15T09:00:22Z',
      },
      {
        role:      'user',
        content:   'Tell me more about the GPT-5 release.',
        timestamp: '2026-03-15T09:01:00Z',
      },
      {
        role:      'tool',
        content:   '{"tool":"http","url":"https://news.example.com/api?id=openai-gpt5","output":"{\\"title\\":\\"OpenAI Releases GPT-5\\",\\"summary\\":\\"OpenAI has announced the release of GPT-5, featuring improved reasoning and multimodal capabilities.\\"}"}',
        timestamp: '2026-03-15T09:01:03Z',
      },
      {
        role:      'assistant',
        content:   'According to the article: OpenAI has announced the release of **GPT-5**, featuring improved reasoning and multimodal capabilities. The new model reportedly shows significant improvements in complex problem-solving tasks.',
        timestamp: '2026-03-15T09:01:10Z',
      },
    ],
  },
]

// ── Task 1.6: Memory entries ──────────────────────────────────────────────────

export const seedMemory: MemoryEntry[] = [
  {
    id:                     'mem-001',
    content:                'User prefers Python for scripting tasks over Bash.',
    tags:                   ['preference', 'python', 'scripting'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: 'conv-003',
    created_at:             '2026-03-18T14:05:00Z',
  },
  {
    id:                     'mem-002',
    content:                'User\'s main machine runs Ubuntu 22.04 with a 100GB disk.',
    tags:                   ['system', 'environment'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: 'conv-005',
    created_at:             '2026-03-17T16:05:00Z',
  },
  {
    id:                     'mem-003',
    content:                'User communicates via Telegram bot with username @myagent_bot.',
    tags:                   ['contact', 'telegram'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: 'conv-002',
    created_at:             '2026-03-19T09:32:00Z',
  },
  {
    id:                     'mem-004',
    content:                'Project is a Go microservice hosted at ~/projects/myservice.',
    tags:                   ['project', 'go', 'path'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: 'conv-001',
    created_at:             '2026-03-19T08:05:00Z',
  },
  {
    id:                     'mem-005',
    content:                'User is interested in AI news, particularly OpenAI and DeepMind announcements.',
    tags:                   ['interest', 'ai', 'news'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: 'conv-008',
    created_at:             '2026-03-15T09:02:00Z',
  },
  {
    id:                     'mem-006',
    content:                'User prefers concise, bullet-point answers when explaining technical topics.',
    tags:                   ['preference', 'communication'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: 'conv-006',
    created_at:             '2026-03-17T10:05:00Z',
  },
  {
    id:                     'mem-007',
    content:                'Working directory for shell commands is ~/projects/myservice unless specified otherwise.',
    tags:                   ['environment', 'shell', 'path'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: 'conv-001',
    created_at:             '2026-03-19T08:10:00Z',
  },
  {
    id:                     'mem-008',
    content:                'User speaks English as primary language, but frequently asks for Spanish translations.',
    tags:                   ['language', 'preference'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: 'conv-004',
    created_at:             '2026-03-18T11:02:00Z',
  },
  {
    id:                     'mem-009',
    content:                'User monitors Bitcoin price regularly via the agent.',
    tags:                   ['crypto', 'interest', 'bitcoin'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: 'conv-002',
    created_at:             '2026-03-19T09:35:00Z',
  },
  {
    id:                     'mem-010',
    content:                'User prefers files saved in current working directory unless a path is specified.',
    tags:                   ['preference', 'file', 'shell'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: 'conv-003',
    created_at:             '2026-03-18T14:10:00Z',
  },
  {
    id:                     'mem-011',
    content:                'Monthly budget set to $20 USD for API usage.',
    tags:                   ['budget', 'config'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: '',
    created_at:             '2026-03-01T00:00:00Z',
  },
  {
    id:                     'mem-012',
    content:                'Agent should avoid executing destructive shell commands without explicit user confirmation.',
    tags:                   ['safety', 'shell', 'policy'],
    cluster: 'general', importance: 5, access_count: 0, source_conversation_id: '',
    created_at:             '2026-03-01T00:00:00Z',
  },
]

// ── Task 1.7: Config (matches ConfigFormData schema exactly) ──────────────────

export const seedConfig: Record<string, unknown> = {
  agent: {
    name:           'Daimon',
    system_prompt:  'You are a helpful AI assistant with access to shell, file, and HTTP tools. Always ask for confirmation before running destructive commands.',
    max_iterations: 10,
    max_tokens:     4096,
    history_length: 20,
  },
  provider: {
    type:     'anthropic',
    model:    'claude-opus-4-5',
    api_key:  '••••••••',
    base_url: '',
    timeout:  60,
  },
  channels: {
    active:   'telegram',
    telegram: {
      token:            '••••••••',
      allowed_user_ids: ['123456789'],
    },
  },
  tools: {
    shell: {
      enabled:          true,
      allow_all:        false,
      allowed_commands: ['ls', 'cat', 'grep', 'find', 'df', 'du', 'ps'],
    },
    file: {
      enabled:       true,
      base_path:     '~',
      max_file_size: 1_048_576,
    },
    http: {
      enabled:          true,
      timeout:          30,
      max_response_size: 1_048_576,
      blocked_domains:  [],
    },
  },
  limits: {
    tool_timeout:       30,
    total_timeout:      300,
    monthly_budget_usd: 20,
  },
  dashboard: {
    port:       8080,
    auth_token: '••••••••',
  },
}
