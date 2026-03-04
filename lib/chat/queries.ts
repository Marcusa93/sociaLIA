/**
 * Structured SQL queries for the chatbot engine
 */

export type QueryIntent =
  | 'top_accounts_month'
  | 'concentration'
  | 'typology_distribution'
  | 'account_evolution'
  | 'compare_periods'
  | 'platform_summary'
  | 'total_interactions'
  | 'unknown'

export interface ParsedIntent {
  intent: QueryIntent
  platform?: string
  month?: string
  accountHandle?: string
  limit?: number
}

/**
 * Classify the user's query into an intent
 */
export function classifyIntent(query: string): ParsedIntent {
  const q = query.toLowerCase()

  // Extract platform
  let platform: string | undefined
  if (q.includes('instagram') || q.includes('ig')) platform = 'instagram'
  else if (q.includes('tiktok')) platform = 'tiktok'
  else if (q.includes('facebook') || q.includes('fb')) platform = 'facebook'

  // Extract account handle
  const handleMatch = q.match(/@(\w+)/)
  const accountHandle = handleMatch?.[1]

  // Extract month reference
  const monthMatch = q.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/)
  const month = monthMatch?.[0]

  if (q.includes('top') || q.includes('líder') || q.includes('lider') || q.includes('mayor') || q.includes('más inter')) {
    return { intent: 'top_accounts_month', platform, month, limit: 5 }
  }
  if (q.includes('concentración') || q.includes('concentracion') || q.includes('top 3') || q.includes('top3')) {
    return { intent: 'concentration', platform, month }
  }
  if (q.includes('tipología') || q.includes('tipologia') || q.includes('gatillo') || q.includes('amplificador') || q.includes('coordinación')) {
    return { intent: 'typology_distribution', platform, month }
  }
  if (accountHandle || (q.includes('evolución') || q.includes('evolucion') || q.includes('cambio') || q.includes('tendencia'))) {
    return { intent: 'account_evolution', platform, accountHandle, month }
  }
  if (q.includes('comparar') || q.includes('versus') || q.includes(' vs ')) {
    return { intent: 'compare_periods', platform }
  }
  if (q.includes('resumen') || q.includes('summary') || q.includes('plataforma')) {
    return { intent: 'platform_summary', platform, month }
  }
  if (q.includes('total') || q.includes('interacciones') || q.includes('posts')) {
    return { intent: 'total_interactions', platform, month }
  }

  return { intent: 'unknown' }
}

const MONTH_MAP: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05',
  junio: '06', julio: '07', agosto: '08', septiembre: '09',
  octubre: '10', noviembre: '11', diciembre: '12'
}

export function monthNameToDate(monthName: string, year?: number): string {
  const month = MONTH_MAP[monthName.toLowerCase()]
  if (!month) return '2025-01-01'
  // Seed data: Aug-Dec 2024, Jan-Mar 2025. Infer year by month number.
  const monthNum = parseInt(month)
  const inferredYear = year ?? (monthNum >= 8 ? 2024 : 2025)
  return `${inferredYear}-${month}-01`
}
