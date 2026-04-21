// Memory mocks — long-term memories (what Daimon learned) + knowledge
// (files uploaded and markdown-ified). Mirror of the design-handoff fixture
// in memory-mocks.jsx. Used by the `/memory` screen until the backend
// exposes confidence / cluster / RAG knowledge fields; at that point a
// follow-up will swap these mocks for live data.

export type Confidence = 'certain' | 'inferred' | 'assumed'
export type MemoryKind = 'fact' | 'note'
export type Cluster =
  | 'identity'
  | 'preferences'
  | 'projects'
  | 'relationships'
  | 'technical'
  | 'general'

export interface MemorySource {
  conv: string
  date: string
}

export interface Memory {
  id: string
  kind: MemoryKind
  cluster: Cluster
  content: string
  tags: string[]
  confidence: Confidence
  source: MemorySource
  lastSeen: string
  confirmedCount: number
}

export type KnowledgeStatus = 'ready' | 'indexing' | 'empty'
export type KnowledgeType = 'pdf' | 'markdown' | 'docx' | 'html' | 'zip' | 'plain'

export interface KnowledgeDoc {
  id: string
  title: string
  originalName: string
  originalSize: string
  type: KnowledgeType
  ingestedAt: string
  lastUsed: string
  injections: number
  pages: number | null
  words: string
  chunks: number
  summary: string
  status: KnowledgeStatus
}

export const MEMORIES: Memory[] = [
  {
    id: 'm1',
    kind: 'fact',
    cluster: 'identity',
    content: 'Your name is Alex Rivera. You go by "Alex" professionally.',
    tags: ['name', 'identity'],
    confidence: 'certain',
    source: { conv: 'Onboarding', date: '2026-01-08' },
    lastSeen: '3 weeks ago',
    confirmedCount: 8,
  },
  {
    id: 'm2',
    kind: 'fact',
    cluster: 'identity',
    content:
      'Senior staff engineer at Helix Labs. Focus on platform and developer experience.',
    tags: ['role', 'employer'],
    confidence: 'certain',
    source: { conv: 'Onboarding', date: '2026-01-08' },
    lastSeen: '4 days ago',
    confirmedCount: 12,
  },
  {
    id: 'm3',
    kind: 'fact',
    cluster: 'preferences',
    content:
      'Strongly prefers TypeScript over Python for new services. Willing to use Python only for ML code.',
    tags: ['language', 'stack'],
    confidence: 'certain',
    source: { conv: 'Payment service anomalies', date: '2026-04-18' },
    lastSeen: 'yesterday',
    confirmedCount: 6,
  },
  {
    id: 'm4',
    kind: 'fact',
    cluster: 'preferences',
    content:
      'Dislikes em-dashes in written output. Prefers short parenthetical asides or a comma instead.',
    tags: ['writing', 'style'],
    confidence: 'certain',
    source: { conv: 'Draft: launch post', date: '2026-03-22' },
    lastSeen: '5 days ago',
    confirmedCount: 3,
  },
  {
    id: 'm5',
    kind: 'fact',
    cluster: 'preferences',
    content:
      'Reads in Spanish and English. Tends to code-switch to Spanish for emotional or creative work.',
    tags: ['language', 'communication'],
    confidence: 'inferred',
    source: { conv: '4 conversations', date: 'ongoing' },
    lastSeen: '2 days ago',
    confirmedCount: 14,
  },
  {
    id: 'm6',
    kind: 'note',
    cluster: 'projects',
    content:
      'Working on a redesign of an internal AI assistant called "Daimon". The project has been ongoing since early April. Alex is particularly protective of the voice — anything that drifts toward generic AI-product tropes triggers immediate pushback. Keywords that work well: "editorial", "liminal", "voz interior". Keywords that don\u2019t: "sleek", "powerful", anything gradient-heavy.',
    tags: ['daimon', 'design', 'active'],
    confidence: 'certain',
    source: { conv: 'Daimon redesign — v2', date: '2026-04-17' },
    lastSeen: 'today',
    confirmedCount: 22,
  },
  {
    id: 'm7',
    kind: 'note',
    cluster: 'projects',
    content:
      'Runs the payments service at Helix. Recent deploy (commit 2c1d9e7) refactored the Stripe webhook handler to async and kept the old 2s timeout. This caused a timeout cluster on 04-18 — Alex and I traced and patched it together. Outcome: conservative fix landed, no rollback needed.',
    tags: ['payments', 'resolved'],
    confidence: 'certain',
    source: { conv: 'Payment service anomalies', date: '2026-04-18' },
    lastSeen: 'yesterday',
    confirmedCount: 2,
  },
  {
    id: 'm8',
    kind: 'fact',
    cluster: 'relationships',
    content: 'Has a partner named Mariana. They live in Mexico City.',
    tags: ['family', 'location'],
    confidence: 'inferred',
    source: { conv: 'Weekend planning', date: '2026-02-14' },
    lastSeen: '3 weeks ago',
    confirmedCount: 2,
  },
  {
    id: 'm9',
    kind: 'fact',
    cluster: 'preferences',
    content:
      'Probably prefers dark mode for code editors but light mode for reading and design work.',
    tags: ['ui', 'preferences'],
    confidence: 'assumed',
    source: { conv: 'IDE theme chat', date: '2026-03-01' },
    lastSeen: '6 weeks ago',
    confirmedCount: 1,
  },
  {
    id: 'm10',
    kind: 'fact',
    cluster: 'technical',
    content:
      'Uses a 16" MacBook Pro M3 as primary machine. Occasionally tests on a Linux workstation for backend work.',
    tags: ['hardware', 'environment'],
    confidence: 'certain',
    source: { conv: 'Env setup', date: '2026-01-19' },
    lastSeen: '2 weeks ago',
    confirmedCount: 4,
  },
  {
    id: 'm11',
    kind: 'note',
    cluster: 'preferences',
    content:
      'Prefers I ask fewer clarifying questions when the task is narrow (a bug fix, a copy edit) and more when the task is generative (a new design direction, a PR spec). Gets frustrated when I ask about preferences I should have remembered.',
    tags: ['interaction', 'meta'],
    confidence: 'certain',
    source: { conv: '6 conversations', date: 'ongoing' },
    lastSeen: '2 days ago',
    confirmedCount: 9,
  },
  {
    id: 'm12',
    kind: 'fact',
    cluster: 'technical',
    content:
      'The Helix monorepo uses pnpm workspaces, Turborepo, and Changesets for release management. Main branch is protected.',
    tags: ['tooling', 'helix'],
    confidence: 'certain',
    source: { conv: 'Setup walkthrough', date: '2026-01-10' },
    lastSeen: 'last week',
    confirmedCount: 5,
  },
]

export const KNOWLEDGE: KnowledgeDoc[] = [
  {
    id: 'k1',
    title: 'Helix design system — tokens.md',
    originalName: 'helix-ds-v3.2.pdf',
    originalSize: '4.2 MB',
    type: 'pdf',
    ingestedAt: '2026-04-02',
    lastUsed: 'today',
    injections: 47,
    pages: 86,
    words: '24.3k',
    chunks: 142,
    summary:
      'Design tokens, component specs, accessibility guidelines for Helix v3.2. Covers color ramps (primary/semantic), spacing scale (4/8px base), typography (Söhne + JetBrains Mono), motion curves.',
    status: 'ready',
  },
  {
    id: 'k2',
    title: 'Payments service — architecture.md',
    originalName: 'payments-arch-v2.md',
    originalSize: '68 KB',
    type: 'markdown',
    ingestedAt: '2026-03-14',
    lastUsed: 'yesterday',
    injections: 23,
    pages: null,
    words: '8.1k',
    chunks: 31,
    summary:
      'Internal architecture doc for the payments service — describes the webhook pipeline, retry strategy, and the async refactor plan (commit 2c1d9e7).',
    status: 'ready',
  },
  {
    id: 'k3',
    title: 'Q2 planning — OKRs.md',
    originalName: 'Q2_2026_OKRs.docx',
    originalSize: '210 KB',
    type: 'docx',
    ingestedAt: '2026-04-05',
    lastUsed: '4 days ago',
    injections: 11,
    pages: 12,
    words: '3.4k',
    chunks: 14,
    summary:
      'Quarterly objectives for Platform team. Top 3: DX metrics program, Daimon GA, payments reliability (SLO 99.95%).',
    status: 'ready',
  },
  {
    id: 'k4',
    title: 'Stripe API reference — webhooks.md',
    originalName: 'stripe-webhook-ref-scrape.html',
    originalSize: '1.1 MB',
    type: 'html',
    ingestedAt: '2026-04-18',
    lastUsed: 'yesterday',
    injections: 4,
    pages: null,
    words: '18.9k',
    chunks: 87,
    summary:
      'Scraped reference for Stripe webhook events, signature verification, retry semantics. Used heavily during the 04-18 incident investigation.',
    status: 'ready',
  },
  {
    id: 'k5',
    title: 'Team retro — 2026-04.md',
    originalName: 'retro-apr.notion.export.zip',
    originalSize: '340 KB',
    type: 'zip',
    ingestedAt: '2026-04-19',
    lastUsed: 'never',
    injections: 0,
    pages: null,
    words: '2.1k',
    chunks: 8,
    summary:
      'Team retrospective notes. Themes: on-call fatigue, tooling debt, Daimon launch pressure.',
    status: 'indexing',
  },
]
