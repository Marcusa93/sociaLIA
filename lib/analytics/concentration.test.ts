import { describe, it, expect } from 'vitest'
import { computeTop3Share, getTopAccounts, computeMonthlyConcentration } from './concentration'

describe('computeTop3Share', () => {
  it('should return 0 for empty array', () => {
    expect(computeTop3Share([])).toBe(0)
  })

  it('should return 1.0 if there are only 3 or fewer accounts', () => {
    const accounts = [
      { account_id: 'a', inter_total: 100 },
      { account_id: 'b', inter_total: 200 },
    ]
    expect(computeTop3Share(accounts)).toBe(1.0)
  })

  it('should compute correct top-3 share', () => {
    const accounts = [
      { account_id: 'a', inter_total: 1000 },
      { account_id: 'b', inter_total: 500 },
      { account_id: 'c', inter_total: 300 },
      { account_id: 'd', inter_total: 100 },
      { account_id: 'e', inter_total: 100 },
    ]
    // top 3: 1000 + 500 + 300 = 1800
    // total: 2000
    // share: 1800/2000 = 0.9
    expect(computeTop3Share(accounts)).toBeCloseTo(0.9)
  })

  it('should return 0 when all totals are 0', () => {
    const accounts = [
      { account_id: 'a', inter_total: 0 },
      { account_id: 'b', inter_total: 0 },
    ]
    expect(computeTop3Share(accounts)).toBe(0)
  })

  it('should return 1.0 for single dominant account', () => {
    const accounts = [
      { account_id: 'dominant', inter_total: 9999 },
      { account_id: 'small1', inter_total: 1 },
      { account_id: 'small2', inter_total: 1 },
      { account_id: 'small3', inter_total: 1 },
    ]
    // top 3: 9999 + 1 + 1 = 10001
    // total: 10002
    const share = computeTop3Share(accounts)
    expect(share).toBeGreaterThan(0.99)
  })
})

describe('getTopAccounts', () => {
  it('should return top N accounts sorted by interactions', () => {
    const accounts = [
      { account_id: 'a', inter_total: 100 },
      { account_id: 'b', inter_total: 500 },
      { account_id: 'c', inter_total: 300 },
    ]
    const top2 = getTopAccounts(accounts, 2)
    expect(top2[0].account_id).toBe('b')
    expect(top2[1].account_id).toBe('c')
    expect(top2.length).toBe(2)
  })
})

describe('computeMonthlyConcentration', () => {
  it('should group by month and compute concentration', () => {
    const entries = [
      { account_id: 'a', month: '2024-08-01', inter_total: 1000 },
      { account_id: 'b', month: '2024-08-01', inter_total: 100 },
      { account_id: 'c', month: '2024-09-01', inter_total: 500 },
      { account_id: 'd', month: '2024-09-01', inter_total: 500 },
    ]
    const result = computeMonthlyConcentration(entries)
    expect(result.length).toBe(2)

    const aug = result.find(r => r.month === '2024-08-01')
    expect(aug?.top3_share).toBe(1.0) // only 2 accounts, all in top 3
    expect(aug?.total_interactions).toBe(1100)

    const sep = result.find(r => r.month === '2024-09-01')
    expect(sep?.top3_share).toBe(1.0) // only 2 accounts
  })
})
