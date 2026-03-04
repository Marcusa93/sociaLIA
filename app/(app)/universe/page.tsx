'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Badge, Button, Input, Select, EmptyState, Spinner } from '@/components/ui'
import type { Database, Platform, Affinity } from '@/lib/supabase/types'
import { TYPOLOGY_BADGE_VARIANT } from '@/lib/analytics/typology'
import type { Typology } from '@/lib/supabase/types'

type Account = Database['public']['Tables']['accounts']['Row']
type Feature = Database['public']['Tables']['account_month_features']['Row']

type AccountWithFeature = Account & {
  latest_feature?: Pick<Feature, 'activation_score' | 'typology'>
}

const PLATFORM_OPTIONS = [
  { value: '', label: 'Todas las plataformas' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
]

const AFFINITY_OPTIONS = [
  { value: '', label: 'Todas las afinidades' },
  { value: 'oficialismo', label: 'Oficialismo' },
  { value: 'oposicion', label: 'Oposición' },
  { value: 'neutro', label: 'Neutro' },
  { value: 'desconocido', label: 'Desconocido' },
]

const TYPOLOGY_OPTIONS = [
  { value: '', label: 'Todas las tipologías' },
  { value: 'Gatillo', label: 'Gatillo' },
  { value: 'Amplificador', label: 'Amplificador' },
  { value: 'Intermitente', label: 'Intermitente' },
  { value: 'Saturación', label: 'Saturación' },
  { value: 'Tracción sostenida', label: 'Tracción sostenida' },
  { value: 'Intermedia', label: 'Intermedia' },
  { value: 'Baja incidencia', label: 'Baja incidencia' },
  { value: 'Coordinación', label: 'Coordinación' },
]

export default function UniversePage() {
  const [accounts, setAccounts] = useState<AccountWithFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterAffinity, setFilterAffinity] = useState('')
  const [filterTypology, setFilterTypology] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchAccounts = useCallback(async (oid: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('accounts')
      .select(`
        *,
        account_month_features(activation_score, typology, month)
      `)
      .eq('org_id', oid)
      .order('created_at', { ascending: false })

    const processed = (data ?? []).map(acc => {
      const features = (acc as Record<string, unknown>).account_month_features as Feature[]
      const latest = features?.sort((a, b) => b.month > a.month ? 1 : -1)[0]
      return {
        ...acc,
        latest_feature: latest ? { activation_score: latest.activation_score, typology: latest.typology } : undefined,
      } as AccountWithFeature
    })

    setAccounts(processed)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setOrgId(data.organization_id)
            fetchAccounts(data.organization_id)
          }
        })
    })
  }, [supabase, fetchAccounts])

  const filtered = accounts.filter(acc => {
    if (search && !acc.handle.includes(search) && !(acc.display_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterPlatform && acc.platform !== filterPlatform) return false
    if (filterAffinity && acc.affinity !== filterAffinity) return false
    if (filterTypology && acc.latest_feature?.typology !== filterTypology) return false
    return true
  })

  function exportCSV() {
    const headers = ['Handle', 'Display Name', 'Platform', 'Affinity', 'Typology', 'Score']
    const rows = filtered.map(a => [
      a.handle,
      a.display_name ?? '',
      a.platform,
      a.affinity ?? '',
      a.latest_feature?.typology ?? '',
      a.latest_feature?.activation_score?.toFixed(3) ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'accounts.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Universo de Cuentas</h1>
          <p className="text-sm text-slate-400 mt-1">{accounts.length} cuentas monitoreadas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            Exportar CSV
          </Button>
          <Button size="sm" onClick={() => { setEditAccount(null); setShowModal(true) }}>
            + Nueva cuenta
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por handle o nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-64"
          />
          <Select
            options={PLATFORM_OPTIONS}
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
          />
          <Select
            options={AFFINITY_OPTIONS}
            value={filterAffinity}
            onChange={e => setFilterAffinity(e.target.value)}
          />
          <Select
            options={TYPOLOGY_OPTIONS}
            value={filterTypology}
            onChange={e => setFilterTypology(e.target.value)}
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin cuentas"
            description={accounts.length === 0 ? "Ejecutá pnpm seed o agregá cuentas manualmente" : "Ninguna cuenta coincide con los filtros"}
            action={
              accounts.length === 0 ? (
                <Button onClick={() => setShowModal(true)} size="sm">
                  Agregar primera cuenta
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left p-4 font-medium">Cuenta</th>
                  <th className="text-left p-4 font-medium">Plataforma</th>
                  <th className="text-left p-4 font-medium">Afinidad</th>
                  <th className="text-left p-4 font-medium">Tipología</th>
                  <th className="text-left p-4 font-medium">Score</th>
                  <th className="text-left p-4 font-medium">Tags</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filtered.map(acc => (
                  <tr key={acc.id} className="text-slate-300 hover:bg-surface-tertiary/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">@{acc.handle}</div>
                      {acc.display_name && <div className="text-xs text-slate-500 mt-0.5">{acc.display_name}</div>}
                    </td>
                    <td className="p-4">
                      <Badge variant="info" size="sm">{acc.platform}</Badge>
                    </td>
                    <td className="p-4">
                      {acc.affinity && (
                        <Badge
                          variant={acc.affinity === 'oficialismo' ? 'info' : acc.affinity === 'oposicion' ? 'error' : 'default'}
                          size="sm"
                        >
                          {acc.affinity}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      {acc.latest_feature?.typology && (
                        <Badge
                          variant={TYPOLOGY_BADGE_VARIANT[acc.latest_feature.typology as Typology] as 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'}
                          size="sm"
                        >
                          {acc.latest_feature.typology}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 font-mono text-brand-400">
                      {acc.latest_feature?.activation_score?.toFixed(3) ?? '—'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries((acc.tags as Record<string, string>) ?? {}).map(([k, v]) => (
                          <span key={k} className="text-xs bg-surface-tertiary text-slate-400 px-2 py-0.5 rounded-full">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => { setEditAccount(acc); setShowModal(true) }}
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {showModal && orgId && (
        <AccountModal
          account={editAccount}
          orgId={orgId}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); if (orgId) fetchAccounts(orgId) }}
        />
      )}
    </div>
  )
}

interface AccountModalProps {
  account: Account | null
  orgId: string
  onClose: () => void
  onSaved: () => void
}

function AccountModal({ account, orgId, onClose, onSaved }: AccountModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    handle: account?.handle ?? '',
    display_name: account?.display_name ?? '',
    platform: (account?.platform ?? 'instagram') as Platform,
    affinity: (account?.affinity ?? 'desconocido') as Affinity,
    tags: JSON.stringify(account?.tags ?? {}, null, 2),
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let tags: Record<string, string> = {}
    try { tags = JSON.parse(form.tags) } catch {}

    const payload = {
      org_id: orgId,
      handle: form.handle,
      display_name: form.display_name || null,
      platform: form.platform,
      affinity: form.affinity,
      tags,
    }

    if (account) {
      await supabase.from('accounts').update(payload).eq('id', account.id)
    } else {
      await supabase.from('accounts').insert(payload)
    }

    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-secondary border border-surface-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-5">
          {account ? 'Editar cuenta' : 'Nueva cuenta'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Handle"
            value={form.handle}
            onChange={e => setForm(f => ({ ...f, handle: e.target.value }))}
            placeholder="@usuario"
            required
          />
          <Input
            label="Nombre para mostrar"
            value={form.display_name}
            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            placeholder="Nombre completo"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Plataforma"
              options={[
                { value: 'instagram', label: 'Instagram' },
                { value: 'tiktok', label: 'TikTok' },
                { value: 'facebook', label: 'Facebook' },
              ]}
              value={form.platform}
              onChange={e => setForm(f => ({ ...f, platform: e.target.value as Platform }))}
            />
            <Select
              label="Afinidad"
              options={AFFINITY_OPTIONS.slice(1)}
              value={form.affinity}
              onChange={e => setForm(f => ({ ...f, affinity: e.target.value as Affinity }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-slate-400">Tags (JSON)</label>
            <textarea
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="bg-surface-tertiary border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm font-mono h-20 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              placeholder='{"provincia": "Buenos Aires", "tema": "economía"}'
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" size="md" onClick={onClose} type="button" className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={loading} size="md" className="flex-1">
              {account ? 'Guardar cambios' : 'Agregar cuenta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
