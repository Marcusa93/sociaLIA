/**
 * Concentration analytics: top3 share of total interactions
 */

export interface AccountInteractions {
  account_id: string
  inter_total: number
}

/**
 * Compute top-3 share: fraction of total interactions from top 3 accounts
 */
export function computeTop3Share(accounts: AccountInteractions[]): number {
  if (accounts.length === 0) return 0

  const sorted = [...accounts].sort((a, b) => b.inter_total - a.inter_total)
  const totalInteractions = accounts.reduce((sum, a) => sum + a.inter_total, 0)

  if (totalInteractions === 0) return 0

  const top3Sum = sorted
    .slice(0, 3)
    .reduce((sum, a) => sum + a.inter_total, 0)

  return top3Sum / totalInteractions
}

/**
 * Get the top N accounts by interactions
 */
export function getTopAccounts(
  accounts: AccountInteractions[],
  n = 3
): AccountInteractions[] {
  return [...accounts]
    .sort((a, b) => b.inter_total - a.inter_total)
    .slice(0, n)
}

/**
 * Compute monthly concentration for a platform
 */
export function computeMonthlyConcentration(
  entries: Array<{ account_id: string; month: string; inter_total: number }>
): Array<{ month: string; top3_share: number; total_interactions: number; total_posts?: number }> {
  const byMonth = new Map<string, AccountInteractions[]>()

  for (const entry of entries) {
    const list = byMonth.get(entry.month) ?? []
    list.push({ account_id: entry.account_id, inter_total: entry.inter_total })
    byMonth.set(entry.month, list)
  }

  return Array.from(byMonth.entries()).map(([month, accounts]) => ({
    month,
    top3_share: computeTop3Share(accounts),
    total_interactions: accounts.reduce((sum, a) => sum + a.inter_total, 0),
  }))
}
