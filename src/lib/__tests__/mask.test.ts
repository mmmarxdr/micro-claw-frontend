import { describe, it, expect } from 'vitest'
import { MASKED_REGEX, stripMaskedKeys } from '../mask'

describe('MASKED_REGEX', () => {
  it('matches backend masked output format', () => {
    expect(MASKED_REGEX.test('sk-o****a68c')).toBe(true)
    expect(MASKED_REGEX.test('sk-a****1234')).toBe(true)
    expect(MASKED_REGEX.test('****')).toBe(true)
  })
  it('does not match real keys', () => {
    expect(MASKED_REGEX.test('sk-or-v1-abc123def456ghi789')).toBe(false)
    expect(MASKED_REGEX.test('sk-ant-api03-realkey')).toBe(false)
    expect(MASKED_REGEX.test('')).toBe(false)
  })
})

describe('stripMaskedKeys', () => {
  it('removes api_key when it matches MASKED_REGEX', () => {
    const input = {
      anthropic: { api_key: 'sk-a****1234', base_url: '' },
      openrouter: { api_key: 'sk-or-real-key', base_url: '' },
    }
    const out = stripMaskedKeys(input)
    expect(out.anthropic.api_key).toBeUndefined()
    expect(out.openrouter.api_key).toBe('sk-or-real-key')
  })
  it('preserves base_url even when api_key is masked', () => {
    const input = { ollama: { api_key: '', base_url: 'http://localhost:11434' } }
    const out = stripMaskedKeys(input)
    expect(out.ollama.base_url).toBe('http://localhost:11434')
  })
  it('handles all 5 provider names', () => {
    const providers = ['anthropic','openai','gemini','openrouter','ollama'] as const
    const input = Object.fromEntries(providers.map(p => [p, { api_key: 'xx****yy', base_url: '' }]))
    const out = stripMaskedKeys(input as any)
    for (const p of providers) {
      expect((out as any)[p].api_key).toBeUndefined()
    }
  })
})
