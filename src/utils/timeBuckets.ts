/**
 * Relative-time clustering for the Conversations list. Buckets are fixed
 * windows anchored to the caller's `now` timestamp so the grouping stays
 * consistent across renders within a single fetch cycle.
 */
export type TimeBucket = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonths' | 'older'

const HOUR = 1000 * 60 * 60
const DAY = 24 * HOUR

/**
 * Classify a conversation's `updated_at` into a relative-time bucket.
 *
 * Rules:
 * - Future timestamps (clock skew, bad server time) collapse to `today`.
 * - Boundaries are INCLUSIVE at the low end and EXCLUSIVE at the high end
 *   of each window: a message updated exactly 24h + 1ms ago lands in
 *   `thisWeek`, not `today`.
 */
export function bucketForTimestamp(updatedAt: Date, now: Date): TimeBucket {
  const diff = now.getTime() - updatedAt.getTime()
  if (diff <= 0) return 'today' // future → today (clock skew tolerance)
  if (diff <= DAY) return 'today'
  if (diff <= 7 * DAY) return 'thisWeek'
  if (diff <= 30 * DAY) return 'thisMonth'
  if (diff <= 90 * DAY) return 'lastMonths'
  return 'older'
}

/** Ordered bucket list for UI rendering (top → bottom). */
export const TIME_BUCKET_ORDER: readonly TimeBucket[] = [
  'today',
  'thisWeek',
  'thisMonth',
  'lastMonths',
  'older',
]

/**
 * Spanish labels for each bucket. The Liminal language lives in Spanish for
 * this project; i18n extraction is a follow-up.
 */
export const BUCKET_LABELS: Record<TimeBucket, string> = {
  today: 'Hoy',
  thisWeek: 'Esta semana',
  thisMonth: 'Este mes',
  lastMonths: 'Últimos meses',
  older: 'Más antiguas',
}
