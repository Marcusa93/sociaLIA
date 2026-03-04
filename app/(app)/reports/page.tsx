'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Badge, Button, EmptyState, Spinner } from '@/components/ui'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Report {
  id: string
  period_from: string
  period_to: string
  status: string
  created_at: string
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [periodFrom, setPeriodFrom] = useState('2024-08-01')
  const [periodTo, setPeriodTo] = useState('2025-03-01')
  const [platforms, setPlatforms] = useState<string[]>(['instagram', 'tiktok', 'facebook'])
  const supabase = createClient()

  const fetchReports = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    if (!profile) return
    const { data } = await supabase
      .from('reports')
      .select('id, period_from, period_to, status, created_at')
      .eq('org_id', profile.organization_id)
      .order('created_at', { ascending: false })
    setReports(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchReports() }, [fetchReports])

  async function generateReport() {
    setGenerating(true)
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodFrom, periodTo, platforms }),
    })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Error desconocido' }))
      alert(`Error al generar reporte: ${error}`)
      setGenerating(false)
      return
    }
    const { reportId } = await res.json()
    setGenerating(false)
    setShowBuilder(false)
    await fetchReports()
    if (reportId) window.location.href = `/reports/${reportId}`
  }

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Reportes</h1>
          <p className="text-sm text-slate-400 mt-1">{reports.length} reportes generados</p>
        </div>
        <Button size="sm" onClick={() => setShowBuilder(!showBuilder)}>
          + Generar reporte
        </Button>
      </div>

      {/* Builder */}
      {showBuilder && (
        <Card className="p-5 border-brand-500/30">
          <h2 className="text-sm font-semibold text-white mb-4">Configurar reporte</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">Período desde</label>
              <input
                type="date"
                value={periodFrom}
                onChange={e => setPeriodFrom(e.target.value)}
                className="w-full bg-surface-tertiary border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">Período hasta</label>
              <input
                type="date"
                value={periodTo}
                onChange={e => setPeriodTo(e.target.value)}
                className="w-full bg-surface-tertiary border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm text-slate-400 block mb-2">Plataformas</label>
            <div className="flex gap-2">
              {['instagram', 'tiktok', 'facebook'].map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    platforms.includes(p)
                      ? 'bg-brand-600/20 border-brand-500/50 text-brand-400'
                      : 'bg-surface-tertiary border-surface-border text-slate-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => setShowBuilder(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={generating} onClick={generateReport}>
              Generar reporte
            </Button>
          </div>
        </Card>
      )}

      {/* Reports list */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : reports.length === 0 ? (
          <EmptyState
            title="Sin reportes"
            description="Generá un reporte para analizar el ecosistema en un período específico"
            action={<Button size="sm" onClick={() => setShowBuilder(true)}>Generar primer reporte</Button>}
          />
        ) : (
          <div className="divide-y divide-surface-border">
            {reports.map(report => (
              <div key={report.id} className="p-4 flex items-center justify-between hover:bg-surface-tertiary/30 transition-colors">
                <div>
                  <div className="text-sm font-medium text-white">
                    {report.period_from} → {report.period_to}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Generado el {format(new Date(report.created_at), "d 'de' MMMM yyyy", { locale: es })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={report.status === 'ready' ? 'success' : report.status === 'error' ? 'error' : 'warning'}
                    size="sm"
                  >
                    {report.status === 'ready' ? 'Listo' : report.status === 'error' ? 'Error' : 'Generando...'}
                  </Badge>
                  {report.status === 'ready' && (
                    <Link href={`/reports/${report.id}`}>
                      <Button variant="secondary" size="sm">Ver reporte →</Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
