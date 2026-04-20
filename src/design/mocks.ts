import type { ToolCall } from '../types/chat'
import type { TimelineEvent } from '../components/liminal/LiminalTimeline'

/**
 * Mock conversation ported from the Anthropic Claude Design "Liminal" handoff
 * (chat-mocks.jsx). Used by the /design preview page to validate the visual
 * system end-to-end before wiring real WebSocket data.
 */

export interface MockUserTurn {
  id: string
  role: 'user'
  time: string
  content: string
}

export type MockBlock =
  | { kind: 'text'; content: string; streaming?: boolean }
  | { kind: 'tool'; tool: ToolCall }
  | { kind: 'timeline'; events: TimelineEvent[] }

export interface MockAssistantTurn {
  id: string
  role: 'assistant'
  time: string
  reasoning?: string
  reasoningDuration?: string
  reasoningStreaming?: boolean
  streaming?: boolean
  blocks: MockBlock[]
}

export type MockTurn = MockUserTurn | MockAssistantTurn

function tool(input: {
  id: string
  name: string
  status: 'done' | 'running' | 'error'
  durationMs?: number
  args: Record<string, unknown>
  output?: string
}): ToolCall {
  return {
    name: input.name,
    input: JSON.stringify(input.args),
    output: input.output,
    tool_call_id: input.id,
    done: input.status !== 'running',
    duration_ms: input.durationMs,
    isError: input.status === 'error',
  }
}

export const MOCK_CONVO: MockTurn[] = [
  // ── Turn 1
  {
    id: 'u1',
    role: 'user',
    time: '14:32',
    content: "Analyze yesterday's payment service logs, find the cause of the anomalies, and propose a fix.",
  },
  {
    id: 'a1',
    role: 'assistant',
    time: '14:32',
    reasoning: `The user wants a full root-cause analysis of yesterday's payment logs.

Plan:
1. Read the raw log file to get a sense of volume and error patterns.
2. Grep for explicit error markers: timeouts, retries, exhausted.
3. Cross-reference with recent deploys — something probably changed.
4. Propose a minimal, conservative patch.

The webhook timeouts feel suspicious — that pattern usually comes from an external provider under load, OR a timeout setting that's too tight for the new async code path. I should check both.`,
    reasoningDuration: '6s',
    blocks: [
      {
        kind: 'text',
        content: `Looking into this. Let me pull the log first and see what we're dealing with.`,
      },
      {
        kind: 'tool',
        tool: tool({
          id: 't1',
          name: 'read_file',
          status: 'done',
          durationMs: 142,
          args: { path: '/var/log/payments/2026-04-18.log', lines: 'last 500' },
          output: `2026-04-18 03:14:22 INFO  svc=payments msg="tx accepted" id=tx_8f3a2
2026-04-18 03:14:23 ERROR svc=payments msg="stripe webhook timeout" id=tx_8f3a2
2026-04-18 03:14:24 WARN  svc=payments msg="retry 1/3" id=tx_8f3a2
2026-04-18 03:14:26 ERROR svc=payments msg="retry exhausted" id=tx_8f3a2
... (487 more lines)`,
        }),
      },
      {
        kind: 'text',
        content: `**42 error lines** clustered in two time windows (03:14 and 07:22 UTC). Let me isolate the pattern:`,
      },
      {
        kind: 'tool',
        tool: tool({
          id: 't2',
          name: 'grep',
          status: 'done',
          durationMs: 89,
          args: { pattern: 'webhook timeout|retry exhausted', path: '/var/log/payments/' },
          output: `2026-04-18.log:314: ERROR svc=payments msg="stripe webhook timeout"
2026-04-18.log:315: ERROR svc=payments msg="retry exhausted"
2026-04-18.log:412: ERROR svc=payments msg="stripe webhook timeout"
2026-04-18.log:417: ERROR svc=payments msg="retry exhausted"
... 19 more matches`,
        }),
      },
      {
        kind: 'tool',
        tool: tool({
          id: 't3',
          name: 'git_log',
          status: 'done',
          durationMs: 54,
          args: { since: '2026-04-17', path: 'services/payments/' },
          output: `a8f21b3  chore: bump stripe SDK to 14.2.0   (2026-04-17 18:02)
2c1d9e7  feat: switch webhook handler to async  (2026-04-17 17:44)`,
        }),
      },
      {
        kind: 'text',
        content: `Found the window. Two recent deploys touched this path — the async refactor is the likely culprit. Let me inspect the handler:`,
      },
      {
        kind: 'tool',
        tool: tool({
          id: 't4',
          name: 'read_file',
          status: 'error',
          durationMs: 12,
          args: { path: 'services/payments/webhook.ts' },
          output: 'Error: permission denied — path outside workspace root',
        }),
      },
      {
        kind: 'text',
        content: `The tool hit a permissions error — trying again with the correct root-relative path:`,
      },
      {
        kind: 'tool',
        tool: tool({
          id: 't5',
          name: 'read_file',
          status: 'done',
          durationMs: 38,
          args: { path: './services/payments/webhook.ts' },
          output: '// ... (file contents shown in workspace)',
        }),
      },
      {
        kind: 'text',
        content: `## What I found

Two correlated issues, both traceable to commit \`2c1d9e7\`:

### 1. Webhook timeout is too tight for the new async path
The handler was refactored to \`async\` but the 2s timeout was kept from the sync version. Under load, the event loop lag pushes Stripe's response past the ceiling.

### 2. Retry context is lost after exhaustion
The new \`withRetry\` wrapper doesn't carry the original request ID, so retries show up as new transactions in the retry queue — and are dropped.

| Metric | Before deploy | After deploy |
| :-- | --: | --: |
| p50 webhook latency | 340ms | 410ms |
| p99 webhook latency | 1.8s | **4.2s** |
| Timeout rate | 0.04% | **2.1%** |
| Tx success rate | 99.97% | 98.12% |

### Proposed patch

\`\`\`typescript
 // services/payments/webhook.ts
-const WEBHOOK_TIMEOUT_MS = 2000
+const WEBHOOK_TIMEOUT_MS = 8000
+const MAX_RETRIES = 5

 export async function handleStripeWebhook(event: StripeEvent) {
-  return await withTimeout(processEvent(event), WEBHOOK_TIMEOUT_MS)
+  return await withRetry(
+    () => withTimeout(processEvent(event), WEBHOOK_TIMEOUT_MS),
+    { maxAttempts: MAX_RETRIES, backoff: 'exponential', idKey: event.id }
+  )
 }
\`\`\`

Conservative — raises the ceiling without introducing new behavior. The \`idKey\` keeps retries deduplicated. Want me to open a PR against \`main\`?`,
      },
    ],
  },

  // ── Turn 2
  {
    id: 'u2',
    role: 'user',
    time: '14:41',
    content: "Before the PR — check if Stripe's own status page had anything yesterday. I want to rule out their side.",
  },
  {
    id: 'a2',
    role: 'assistant',
    time: '14:41',
    reasoning: `Good instinct. Stripe occasionally has degraded webhook delivery during EU business hours. Let me check their status history API.`,
    reasoningDuration: '3s',
    blocks: [
      {
        kind: 'tool',
        tool: tool({
          id: 't6',
          name: 'web_fetch',
          status: 'done',
          durationMs: 1200,
          args: { url: 'https://status.stripe.com/history', range: '2026-04-18' },
          output: `[{"date":"2026-04-18","incidents":[{"time":"14:00-15:30 UTC","component":"webhook delivery","severity":"degraded","region":"EU"}]}]`,
        }),
      },
      {
        kind: 'text',
        content: `Confirmed — Stripe **did** have a degraded webhook delivery incident in EU between 14:00–15:30 UTC. But our anomalies were at **03:14** and **07:22** UTC, outside that window. Stripe's side was healthy during our incidents. The issue is on our side.

So: go ahead with the patch. Here's a summary of the timeline:`,
      },
      {
        kind: 'timeline',
        events: [
          { t: '17:44', lvl: 'info',  msg: 'async webhook handler deployed (2c1d9e7)' },
          { t: '18:02', lvl: 'info',  msg: 'stripe SDK bump (a8f21b3)' },
          { t: '03:14', lvl: 'error', msg: 'first timeout cluster — 11 events' },
          { t: '07:22', lvl: 'error', msg: 'second timeout cluster — 10 events' },
          { t: '14:00', lvl: 'warn',  msg: 'stripe EU degraded (unrelated)' },
        ],
      },
    ],
  },

  // ── Turn 3 (streaming)
  {
    id: 'u3',
    role: 'user',
    time: '14:44',
    content: 'Open the PR.',
  },
  {
    id: 'a3',
    role: 'assistant',
    time: '14:44',
    reasoning: `Opening a PR against main with the patch. Title should reference the commit that introduced the regression.`,
    reasoningStreaming: true,
    streaming: true,
    blocks: [
      {
        kind: 'tool',
        tool: tool({
          id: 't7',
          name: 'shell',
          status: 'running',
          args: { cmd: 'git checkout -b fix/webhook-timeout && git add -p services/payments/webhook.ts' },
          output: `Switched to a new branch 'fix/webhook-timeout'
diff --git a/services/payments/webhook.ts b/services/payments/webhook.ts
Stage this hunk [y,n,q,a,d,e,?]? `,
        }),
      },
      {
        kind: 'text',
        content: `Staging the hunk. I'll push once the test suite passes locally…`,
        streaming: true,
      },
    ],
  },
]
