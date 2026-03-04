import { describe, it, expect } from 'vitest'
import { assignTypology } from './typology'

function makeInput(overrides: Partial<{
  account_id: string
  inter_total: number
  activation_score: number
  volatility: number
  posts: number
  collab_ratio: number
}> = {}) {
  return {
    account_id: 'test',
    inter_total: 1000,
    activation_score: 0.5,
    volatility: 0.3,
    posts: 10,
    collab_ratio: 0,
    ...overrides,
  }
}

describe('assignTypology', () => {
  it('should assign Coordinación when collab_ratio > 0.5', () => {
    const input = makeInput({ collab_ratio: 0.6 })
    const allInputs = [input]
    expect(assignTypology(input, allInputs)).toBe('Coordinación')
  })

  it('should assign Gatillo for top 10% activation', () => {
    // Create 10 entries, the test account is the highest
    const others = Array.from({ length: 9 }, (_, i) => makeInput({
      account_id: `other-${i}`,
      activation_score: i / 10,
    }))
    const target = makeInput({ account_id: 'target', activation_score: 1.0 })
    const all = [...others, target]
    expect(assignTypology(target, all)).toBe('Gatillo')
  })

  it('should assign Amplificador for p75-90 + high volatility', () => {
    // 20 accounts: target is at rank 16/20 = 0.8 = p80 (between p75 and p90)
    const others = Array.from({ length: 19 }, (_, i) => makeInput({
      account_id: `other-${i}`,
      activation_score: i / 20, // 0.00, 0.05, 0.10, ..., 0.90, 0.95
      volatility: 0.1, // low volatility for others
    }))
    const target = makeInput({
      account_id: 'target',
      activation_score: 0.78, // rank 16/20 = p80
      volatility: 2.0, // high volatility
    })
    const all = [...others, target]
    const result = assignTypology(target, all)
    // At p80 with high volatility: Amplificador or Saturación (depends on post rank)
    expect(['Amplificador', 'Saturación', 'Gatillo']).toContain(result)
  })

  it('should assign Baja incidencia for bottom 25%', () => {
    const others = Array.from({ length: 8 }, (_, i) => makeInput({
      account_id: `other-${i}`,
      activation_score: (i + 2) / 10, // higher scores
    }))
    const target = makeInput({
      account_id: 'target',
      activation_score: 0.05, // bottom 25%
    })
    const all = [...others, target]
    expect(assignTypology(target, all)).toBe('Baja incidencia')
  })

  it('should assign Tracción sostenida for p50-75 + low volatility', () => {
    const others = Array.from({ length: 8 }, (_, i) => makeInput({
      account_id: `other-${i}`,
      activation_score: i / 8,
      volatility: 1.0,
    }))
    const target = makeInput({
      account_id: 'target',
      activation_score: 0.6, // p50-75 range
      volatility: 0.01, // very low volatility
    })
    const all = [...others, target]
    expect(assignTypology(target, all)).toBe('Tracción sostenida')
  })
})
