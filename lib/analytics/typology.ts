import type { Typology } from '@/lib/supabase/types'
import { percentileRank } from './features'

export interface TypologyInput {
  account_id: string
  inter_total: number
  activation_score: number
  volatility: number
  posts: number
  collab_ratio: number // fraction of posts with collab_group_id
}

/**
 * Assign typology to a single account based on its features
 * and the distribution of all accounts in the same platform/month
 */
export function assignTypology(
  input: TypologyInput,
  allInputs: TypologyInput[]
): Typology {
  const { activation_score, volatility, posts, collab_ratio } = input

  // Coordination override: if >50% of posts are collaborative
  if (collab_ratio > 0.5) return 'Coordinación'

  const activationScores = allInputs.map(a => a.activation_score)
  const volatilities = allInputs.map(a => a.volatility)
  const postCounts = allInputs.map(a => a.posts)

  const activationPct = percentileRank(activation_score, activationScores)
  const volatilityPct = percentileRank(volatility, volatilities)
  const postsPct = percentileRank(posts, postCounts)

  const highVolatility = volatilityPct >= 0.5
  const highFrequency = postsPct >= 0.75

  // Gatillo: top 10% activation
  if (activationPct >= 0.9) return 'Gatillo'

  // Amplificador: p75-90 activation + high volatility
  if (activationPct >= 0.75 && highVolatility) return 'Amplificador'

  // Saturación: p75+ activation + high frequency (many posts)
  if (activationPct >= 0.75 && highFrequency) return 'Saturación'

  // Tracción sostenida: p50-75 activation + low volatility (stable)
  if (activationPct >= 0.5 && !highVolatility) return 'Tracción sostenida'

  // Intermitente: p50-75 activation + high volatility
  if (activationPct >= 0.5 && highVolatility) return 'Intermitente'

  // Intermedia: p25-50
  if (activationPct >= 0.25) return 'Intermedia'

  // Baja incidencia: bottom 25%
  return 'Baja incidencia'
}

export const TYPOLOGY_COLORS: Record<Typology, string> = {
  Gatillo: '#f43f5e',
  Amplificador: '#f97316',
  Intermitente: '#eab308',
  Saturación: '#a855f7',
  'Tracción sostenida': '#22c55e',
  Intermedia: '#6374f1',
  'Baja incidencia': '#64748b',
  Coordinación: '#ec4899',
}

export const TYPOLOGY_BADGE_VARIANT: Record<Typology, string> = {
  Gatillo: 'error',
  Amplificador: 'warning',
  Intermitente: 'warning',
  Saturación: 'purple',
  'Tracción sostenida': 'success',
  Intermedia: 'info',
  'Baja incidencia': 'default',
  Coordinación: 'purple',
}
