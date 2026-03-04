'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Badge, Button, Select, EmptyState, Spinner } from '@/components/ui'
import { ActivationChart } from '@/components/charts/ConcentrationBar'
import { TYPOLOGY_BADGE_VARIANT } from '@/lib/analytics/typology'
import type { Typology } from '@/lib/supabase/types'
import Link from 'next/link'

interface FeatureRow {
  id: string
  month: string
  platform: string
  posts: number
  inter_total: number
  inter_avg: number
  volatility: number
  activation_score: number
  typology: string | null
  accounts: { handle: string; display_name: string | null; affinity: string | null } | null
}

const PLATFORM_OPTIONS = [
  { value: '', label: 'Todas las plataformas' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
]

export default function AnalysisPage() {
  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchFeatures = useCallback(async (oid: string) => {
    const { data } = await supabase
      .from('account_month_features')
      .select(`
        id, month, platform, posts, inter_total, inter_avg, volatility, activation_score, typology,
        accounts(handle, display_name, affinity)
      `)
      .eq('org_id', oid)
      .order('month', { ascending: false })
      .order('activation_score', { ascending: false })
      .limit(200)

    setFeatures((data ?? []) as FeatureRow[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('organization_id').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) { setOrgId(data.organization_id); fetchFeatures(data.organization_id) } })
    })
  }, [supabase, fetchFeatures])

  const months = Array.from(new Set(features.map(f => f.month))).sort((a, b) => b.localeCompare(a))
  const monthOptions = [
    { value: '', label: 'Todos los meses' },
    ...months.map(m => ({ value: m, label: m })),
  ]

  const filtered = features.filter(f => {
    if (filterPlatform && f.platform !== filterPlatform) return false
    if (filterMonth && f.month !== filterMonth) return false
    return true
  })

  // For the selected account evolution chart
  const accountHandles = Array.from(new Set(features.map(f => f.accounts?.handle).filter(Boolean))) as string[]
  const evolutionData = selectedAccount
    ? features
        .filter(f => f.accounts?.handle === selectedAccount)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(f => ({ month: f.month, value: f.activation_score }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Análisis de Features</h1>
          <p className="text-sm text-slate-400 mt-1">{filtered.length} registros</p>
        </div>
        <Link href="/analysis/graph">
          <Button variant="secondary" size="sm">
            Ver Red de Co-publicación →
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <Select
            options={PLATFORM_OPTIONS}
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            label="Plataforma"
          />
          <Select
            options={monthOptions}
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            label="Mes"
          />
        </div>
      </Card>

      {/* Evolution Chart */}
      {accountHandles.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Evolución de Activation Score</h2>
            <select
              value={selectedAccount ?? ''}
              onChange={e => setSelectedAccount(e.target.value || null)}
              className="bg-surface-tertiary border border-surface-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
            >
              <option value="">Seleccionar cuenta...</option>
              {accountHandles.map(h => <option key={h} value={h}>@{h}</option>)}
            </select>
          </div>
          {selectedAccount && evolutionData.length > 0 ? (
            <ActivationChart data={evolutionData} accountName={selectedAccount} />
          ) : (
            <div className="text-sm text-slate-500 text-center py-8">
              Seleccioná una cuenta para ver su evolución
            </div>
          )}
        </Card>
      )}

      {/* Features Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Sin datos" description="Ejecutá pnpm seed y pnpm compute para ver los features" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left p-4 font-medium">Cuenta</th>
                  <th className="text-left p-4 font-medium">Mes</th>
                  <th className="text-left p-4 font-medium">Plataforma</th>
                  <th className="text-right p-4 font-medium">Posts</th>
                  <th className="text-right p-4 font-medium">Interacciones</th>
                  <th className="text-right p-4 font-medium">Avg/post</th>
                  <th className="text-right p-4 font-medium">Volatilidad</th>
                  <th className="text-right p-4 font-medium">Score</th>
                  <th className="text-left p-4 font-medium">Tipología</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filtered.map(row => (
                  <tr key={row.id} className="text-slate-300 hover:bg-surface-tertiary/30">
                    <td className="p-4">
                      <div className="font-medium text-white">@{row.accounts?.handle ?? '?'}</div>
                      <div className="text-xs text-slate-500">{row.accounts?.display_name}</div>
                    </td>
                    <td className="p-4 text-slate-400">{row.month}</td>
                    <td className="p-4">
                      <Badge variant="info" size="sm">{row.platform}</Badge>
                    </td>
                    <td className="p-4 text-right">{row.posts}</td>
                    <td className="p-4 text-right">{Math.round(row.inter_total).toLocaleString('es-AR')}</td>
                    <td className="p-4 text-right">{Math.round(row.inter_avg).toLocaleString('es-AR')}</td>
                    <td className="p-4 text-right font-mono text-xs">
                      <span className={row.volatility > 1 ? 'text-amber-400' : 'text-slate-400'}>
                        {row.volatility.toFixed(3)}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono">
                      <span className={`${row.activation_score >= 0.75 ? 'text-rose-400' : row.activation_score >= 0.5 ? 'text-brand-400' : 'text-slate-500'}`}>
                        {row.activation_score.toFixed(3)}
                      </span>
                    </td>
                    <td className="p-4">
                      {row.typology && (
                        <Badge
                          variant={TYPOLOGY_BADGE_VARIANT[row.typology as Typology] as 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'}
                          size="sm"
                        >
                          {row.typology}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
