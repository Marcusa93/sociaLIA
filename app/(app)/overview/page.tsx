import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KpiCard, Card, Badge, EmptyState } from '@/components/ui'
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart'
import { ConcentrationBar } from '@/components/charts/ConcentrationBar'

export const metadata = { title: 'Overview' }

export default async function OverviewPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/login')
  const orgId = profile.organization_id

  // Fetch KPI data
  const [
    { data: accountsData },
    { data: summaries },
    { data: topAccounts },
  ] = await Promise.all([
    supabase.from('accounts').select('id, platform').eq('org_id', orgId),
    supabase
      .from('ecosystem_month_summary')
      .select('*')
      .eq('org_id', orgId)
      .order('month', { ascending: true })
      .limit(8),
    supabase
      .from('account_month_features')
      .select('*, accounts!inner(handle, display_name, platform, affinity)')
      .eq('org_id', orgId)
      .order('activation_score', { ascending: false })
      .limit(5),
  ])

  const totalAccounts = accountsData?.length ?? 0
  const totalInteractions = (summaries ?? []).reduce((sum, s) => sum + Number(s.total_interactions), 0)

  // Build time series data
  const monthlyData: Record<string, Record<string, number>> = {}
  for (const s of summaries ?? []) {
    if (!monthlyData[s.month]) monthlyData[s.month] = {}
    monthlyData[s.month][s.platform] = Number(s.total_interactions)
  }
  const timeSeriesData = Object.entries(monthlyData).map(([month, platforms]) => ({
    month,
    ...platforms,
  }))

  // Build concentration data — average across platforms per month
  const concentrationByMonth: Record<string, { top3: number; resto: number; count: number }> = {}
  for (const s of summaries ?? []) {
    const existing = concentrationByMonth[s.month] ?? { top3: 0, resto: 0, count: 0 }
    existing.top3 += Number(s.top3_share)
    existing.resto += 1 - Number(s.top3_share)
    existing.count += 1
    concentrationByMonth[s.month] = existing
  }
  const concentrationData = Object.entries(concentrationByMonth).map(([month, d]) => ({
    month,
    top3: d.top3 / Math.max(d.count, 1),
    resto: d.resto / Math.max(d.count, 1),
  }))

  const latestMonth = summaries?.[summaries.length - 1]
  const topPlatform = (summaries ?? [])
    .reduce((acc, s) => {
      acc[s.platform] = (acc[s.platform] ?? 0) + Number(s.total_interactions)
      return acc
    }, {} as Record<string, number>)
  const topPlatformName = Object.entries(topPlatform).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'N/D'

  const gatilloCount = (topAccounts ?? [])
    .filter(a => a.typology === 'Gatillo' || a.typology === 'Amplificador').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Overview del Ecosistema</h1>
        <p className="text-sm text-slate-400 mt-1">
          Resumen de actividad · {latestMonth?.month ?? 'Sin datos'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Cuentas activas"
          value={totalAccounts}
          color="blue"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <KpiCard
          title="Total interacciones"
          value={Math.round(totalInteractions).toLocaleString('es-AR')}
          color="green"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <KpiCard
          title="Top plataforma"
          value={topPlatformName}
          color="amber"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
        <KpiCard
          title="Cuentas gatillo / amplif."
          value={gatilloCount}
          color="rose"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Interacciones mensuales por plataforma</h2>
          {timeSeriesData.length > 0 ? (
            <TimeSeriesChart data={timeSeriesData} />
          ) : (
            <EmptyState title="Sin datos" description="Ejecutá el seed para ver datos aquí" />
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Concentración Top-3 vs Resto</h2>
          {concentrationData.length > 0 ? (
            <ConcentrationBar data={concentrationData} />
          ) : (
            <EmptyState title="Sin datos" description="Ejecutá el seed para ver datos aquí" />
          )}
        </Card>
      </div>

      {/* Top 5 Accounts */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Top 5 cuentas por activation score</h2>
        {(topAccounts ?? []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left pb-3 font-medium">#</th>
                  <th className="text-left pb-3 font-medium">Cuenta</th>
                  <th className="text-left pb-3 font-medium">Plataforma</th>
                  <th className="text-left pb-3 font-medium">Score</th>
                  <th className="text-left pb-3 font-medium">Interacciones</th>
                  <th className="text-left pb-3 font-medium">Tipología</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {(topAccounts ?? []).map((row, i) => {
                  const acc = (row as Record<string, unknown>).accounts as {
                    handle: string; display_name: string | null; platform: string; affinity: string | null
                  } | null
                  return (
                    <tr key={row.id} className="text-slate-300">
                      <td className="py-2.5 text-slate-500">{i + 1}</td>
                      <td className="py-2.5">
                        <div className="font-medium text-white">@{acc?.handle ?? '?'}</div>
                        <div className="text-xs text-slate-500">{acc?.display_name}</div>
                      </td>
                      <td className="py-2.5">
                        <Badge variant="info" size="sm">{acc?.platform ?? '?'}</Badge>
                      </td>
                      <td className="py-2.5 font-mono text-brand-400">
                        {row.activation_score?.toFixed(3) ?? 'N/D'}
                      </td>
                      <td className="py-2.5">
                        {Math.round(row.inter_total).toLocaleString('es-AR')}
                      </td>
                      <td className="py-2.5">
                        {row.typology && (
                          <Badge
                            variant={row.typology === 'Gatillo' ? 'error' : row.typology === 'Amplificador' ? 'warning' : 'info'}
                            size="sm"
                          >
                            {row.typology}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sin datos aún"
            description="Ejecutá pnpm seed para cargar los datos de ejemplo"
          />
        )}
      </Card>
    </div>
  )
}
