export const MASKED_REGEX = /^.{0,4}\*{4}.{0,4}$/

type ProviderCredentials = { api_key?: string; base_url?: string }

export function stripMaskedKeys<T extends Record<string, ProviderCredentials>>(providers: T): T {
  const out = { ...providers }
  for (const k of Object.keys(out) as Array<keyof T>) {
    const entry = out[k]
    if (entry?.api_key && MASKED_REGEX.test(entry.api_key)) {
      const { api_key: _omit, ...rest } = entry
      out[k] = rest as T[keyof T]
    }
  }
  return out
}
