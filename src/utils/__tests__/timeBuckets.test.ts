import { describe, it, expect } from 'vitest'

import { bucketForTimestamp, TIME_BUCKET_ORDER, BUCKET_LABELS } from '../timeBuckets'

describe('bucketForTimestamp', () => {
  const now = new Date('2026-04-24T12:00:00Z')
  const HOUR = 1000 * 60 * 60

  it('today — within 24h', () => {
    expect(bucketForTimestamp(new Date(now.getTime() - 1 * HOUR), now)).toBe('today')
    expect(bucketForTimestamp(new Date(now.getTime() - 23 * HOUR), now)).toBe('today')
  })

  it('today — exactly 24h', () => {
    expect(bucketForTimestamp(new Date(now.getTime() - 24 * HOUR), now)).toBe('today')
  })

  it('thisWeek — 24h + 1ms up to 7d', () => {
    expect(bucketForTimestamp(new Date(now.getTime() - 24 * HOUR - 1), now)).toBe('thisWeek')
    expect(bucketForTimestamp(new Date(now.getTime() - 3 * 24 * HOUR), now)).toBe('thisWeek')
    expect(bucketForTimestamp(new Date(now.getTime() - 7 * 24 * HOUR), now)).toBe('thisWeek')
  })

  it('thisMonth — 7d + 1ms up to 30d', () => {
    expect(bucketForTimestamp(new Date(now.getTime() - 8 * 24 * HOUR), now)).toBe('thisMonth')
    expect(bucketForTimestamp(new Date(now.getTime() - 30 * 24 * HOUR), now)).toBe('thisMonth')
  })

  it('lastMonths — 30d + 1ms up to 90d', () => {
    expect(bucketForTimestamp(new Date(now.getTime() - 31 * 24 * HOUR), now)).toBe('lastMonths')
    expect(bucketForTimestamp(new Date(now.getTime() - 90 * 24 * HOUR), now)).toBe('lastMonths')
  })

  it('older — beyond 90d', () => {
    expect(bucketForTimestamp(new Date(now.getTime() - 91 * 24 * HOUR), now)).toBe('older')
    expect(bucketForTimestamp(new Date(now.getTime() - 365 * 24 * HOUR), now)).toBe('older')
  })

  it('future timestamp collapses to today (clock skew tolerance)', () => {
    expect(bucketForTimestamp(new Date(now.getTime() + 10 * 60 * 1000), now)).toBe('today')
  })
})

describe('TIME_BUCKET_ORDER + BUCKET_LABELS', () => {
  it('covers every bucket', () => {
    expect(TIME_BUCKET_ORDER).toHaveLength(5)
    for (const b of TIME_BUCKET_ORDER) {
      expect(BUCKET_LABELS[b]).toBeTruthy()
    }
  })

  it('orders buckets from freshest to oldest', () => {
    expect(TIME_BUCKET_ORDER).toEqual(['today', 'thisWeek', 'thisMonth', 'lastMonths', 'older'])
  })
})
