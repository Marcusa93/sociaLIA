import { describe, it, expect } from 'vitest'
import {
  computeInteraction,
  computeMonthFeatures,
  computeVolatility,
  minMaxNormalize,
  computeActivationScores,
  percentileRank,
} from './features'

describe('computeInteraction', () => {
  it('should calculate interaction as likes + comments + views * 0.1', () => {
    expect(computeInteraction(100, 20, 500)).toBe(170) // 100 + 20 + 50
    expect(computeInteraction(0, 0, 0)).toBe(0)
    expect(computeInteraction(1000, 0, 0)).toBe(1000)
    expect(computeInteraction(0, 0, 1000)).toBe(100)
  })
})

describe('computeVolatility', () => {
  it('should return 0 for single-value array', () => {
    expect(computeVolatility([100])).toBe(0)
  })

  it('should return 0 when all values are equal', () => {
    expect(computeVolatility([100, 100, 100])).toBe(0)
  })

  it('should return higher value for more variable data', () => {
    const stable = computeVolatility([100, 100, 100, 100])
    const volatile = computeVolatility([10, 200, 5, 300])
    expect(volatile).toBeGreaterThan(stable)
  })

  it('should return 0 for empty array', () => {
    expect(computeVolatility([])).toBe(0)
  })
})

describe('computeMonthFeatures', () => {
  it('should return zeros for empty posts', () => {
    const result = computeMonthFeatures([])
    expect(result.posts).toBe(0)
    expect(result.inter_total).toBe(0)
    expect(result.inter_avg).toBe(0)
    expect(result.volatility).toBe(0)
  })

  it('should compute correct totals', () => {
    const posts = [
      { posted_at: '2024-08-01', likes: 1000, comments: 100, views: 5000 },
      { posted_at: '2024-08-02', likes: 2000, comments: 200, views: 10000 },
    ]
    const result = computeMonthFeatures(posts)
    // Post 1: 1000 + 100 + 500 = 1600
    // Post 2: 2000 + 200 + 1000 = 3200
    expect(result.posts).toBe(2)
    expect(result.inter_total).toBeCloseTo(4800)
    expect(result.inter_avg).toBeCloseTo(2400)
  })

  it('should aggregate interactions by day', () => {
    const posts = [
      { posted_at: '2024-08-01T10:00:00', likes: 100, comments: 10, views: 1000 },
      { posted_at: '2024-08-01T18:00:00', likes: 100, comments: 10, views: 1000 }, // same day
      { posted_at: '2024-08-02T10:00:00', likes: 1000, comments: 100, views: 10000 },
    ]
    const result = computeMonthFeatures(posts)
    expect(result.posts).toBe(3)
    // Volatility should reflect the day-level variance
    expect(result.volatility).toBeGreaterThan(0)
  })
})

describe('minMaxNormalize', () => {
  it('should normalize values between 0 and 1', () => {
    const result = minMaxNormalize([0, 50, 100])
    expect(result[0]).toBe(0)
    expect(result[1]).toBe(0.5)
    expect(result[2]).toBe(1)
  })

  it('should return 0.5 for all-equal values', () => {
    const result = minMaxNormalize([42, 42, 42])
    expect(result.every(v => v === 0.5)).toBe(true)
  })

  it('should handle single value', () => {
    const result = minMaxNormalize([100])
    expect(result[0]).toBe(0.5)
  })
})

describe('computeActivationScores', () => {
  it('should return normalized scores for each account', () => {
    const entries = [
      { account_id: 'a', inter_total: 0 },
      { account_id: 'b', inter_total: 500 },
      { account_id: 'c', inter_total: 1000 },
    ]
    const result = computeActivationScores(entries)
    expect(result.get('a')).toBe(0)
    expect(result.get('b')).toBe(0.5)
    expect(result.get('c')).toBe(1)
  })
})

describe('percentileRank', () => {
  it('should compute correct percentile rank', () => {
    const values = [10, 20, 30, 40, 50]
    expect(percentileRank(10, values)).toBeCloseTo(0.2)
    expect(percentileRank(50, values)).toBeCloseTo(1.0)
    expect(percentileRank(30, values)).toBeCloseTo(0.6)
  })

  it('should return 1.0 for max value', () => {
    expect(percentileRank(100, [100])).toBe(1.0)
  })
})
