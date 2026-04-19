/**
 * Global Vitest mock for @tanstack/react-virtual.
 *
 * jsdom has no layout engine, so useVirtualizer always measures zero scroll height
 * and returns 0 visible items. This mock returns up to 12 items (simulating a
 * visible window) so component tests can assert on list contents.
 *
 * Usage: this file is auto-discovered by Vitest when placed at
 *   src/__mocks__/@tanstack/react-virtual.ts
 * and modules are auto-mocked if vitest.config.ts sets `server.deps.inline`
 * or tests call `vi.mock('@tanstack/react-virtual')` explicitly.
 *
 * NOTE: Per Vitest conventions, this file provides the factory for
 * `vi.mock('@tanstack/react-virtual')` calls. Individual test files still need
 * to call `vi.mock('@tanstack/react-virtual')` — but they can omit the factory
 * argument and this file will be used automatically.
 *
 * Pattern note (ESM binding quirk):
 *   When asserting spy calls on functions imported from mocked modules, prefer
 *   asserting DOM effects (e.g. expect(listbox).toBeInTheDocument()) rather than
 *   spy call counts. ESM live bindings can cause the mock vi.fn() instance to differ
 *   between import sites if the module is resolved via different relative paths.
 */

export const useVirtualizer = (opts: { count: number; estimateSize: () => number }) => {
  const visibleCount = Math.min(opts.count, 12)
  const items = Array.from({ length: visibleCount }, (_, i) => ({
    key: i,
    index: i,
    start: i * opts.estimateSize(),
    size: opts.estimateSize(),
  }))
  return {
    getVirtualItems: () => items,
    getTotalSize: () => opts.count * opts.estimateSize(),
  }
}
