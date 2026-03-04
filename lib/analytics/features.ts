/**
 * Analytics feature computation for account/month pairs
 */

export interface DailyMetrics {
  date: string
  interactions: number
}

export interface RawPostData {
  posted_at: string
  likes: number
  comments: number
  views: number
}

/**
 * Compute interaction score for a single post
 * views are weighted at 0.1
 */
export function computeInteraction(likes: number, comments: number, views: number): number {
  return likes + comments + views * 0.1
}

/**
 * Compute features for a set of posts in a month
 */
export function computeMonthFeatures(posts: RawPostData[]): {
  posts: number
  inter_total: number
  inter_avg: number
  volatility: number
} {
  if (posts.length === 0) {
    return { posts: 0, inter_total: 0, inter_avg: 0, volatility: 0 }
  }

  const dailyMap = new Map<string, number>()

  for (const post of posts) {
    const date = post.posted_at.slice(0, 10)
    const inter = computeInteraction(post.likes, post.comments, post.views)
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + inter)
  }

  const interTotal = Array.from(dailyMap.values()).reduce((a, b) => a + b, 0)
  const interAvg = interTotal / posts.length

  // Volatility = CV (coefficient of variation) of daily interactions
  const dailyValues = Array.from(dailyMap.values())
  const volatility = computeVolatility(dailyValues)

  return {
    posts: posts.length,
    inter_total: interTotal,
    inter_avg: interAvg,
    volatility,
  }
}

/**
 * Compute volatility as stddev / mean of daily interactions
 */
export function computeVolatility(dailyInteractions: number[]): number {
  if (dailyInteractions.length < 2) return 0

  const mean = dailyInteractions.reduce((a, b) => a + b, 0) / dailyInteractions.length
  if (mean === 0) return 0

  const variance =
    dailyInteractions.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / dailyInteractions.length
  const stddev = Math.sqrt(variance)

  return stddev / mean
}

/**
 * Min-max normalize an array of values to [0, 1]
 */
export function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 0.5)
  return values.map(v => (v - min) / (max - min))
}

/**
 * Compute activation_score = normalized inter_total within platform
 */
export function computeActivationScores(
  entries: Array<{ account_id: string; inter_total: number }>
): Map<string, number> {
  const totals = entries.map(e => e.inter_total)
  const normalized = minMaxNormalize(totals)
  const result = new Map<string, number>()
  entries.forEach((e, i) => result.set(e.account_id, normalized[i]))
  return result
}

/**
 * Compute percentile rank of a value within an array (0-1)
 */
export function percentileRank(value: number, values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const rank = sorted.filter(v => v <= value).length
  return rank / sorted.length
}
