'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Badge, Button, EmptyState, Spinner } from '@/components/ui'
import type { Database, JobStatus } from '@/lib/supabase/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Job = Database['public']['Tables']['jobs']['Row']

const STATUS_BADGE: Record<JobStatus, { variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'; label: string }> = {
  pending: { variant: 'warning', label: 'Pendiente' },
  running: { variant: 'info', label: 'Ejecutando...' },
  done: { variant: 'success', label: 'Completado' },
  error: { variant: 'error', label: 'Error' },
}

export default function CollectionPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchJobs = useCallback(async (oid: string) => {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('org_id', oid)
      .order('created_at', { ascending: false })
      .limit(20)
    setJobs(data ?? [])
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
            fetchJobs(data.organization_id)
          }
        })
    })
  }, [supabase, fetchJobs])

  // Auto-refresh for running jobs
  useEffect(() => {
    const hasRunning = jobs.some(j => j.status === 'running' || j.status === 'pending')
    if (!hasRunning || !orgId) return
    const timer = setInterval(() => fetchJobs(orgId), 3000)
    return () => clearInterval(timer)
  }, [jobs, orgId, fetchJobs])

  async function createJob() {
    setCreating(true)
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'collection', params: { triggered_at: new Date().toISOString() } }),
    })
    if (orgId) {
      setTimeout(() => fetchJobs(orgId), 500)
    }
    setCreating(false)
  }

  const runningCount = jobs.filter(j => j.status === 'running').length
  const doneCount = jobs.filter(j => j.status === 'done').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Recolección de Datos</h1>
          <p className="text-sm text-slate-400 mt-1">
            {doneCount} completados · {runningCount > 0 && `${runningCount} en ejecución`}
          </p>
        </div>
        <Button onClick={createJob} loading={creating} size="sm">
          + Nueva recolección
        </Button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['pending', 'running', 'done', 'error'] as JobStatus[]).map(status => {
          const count = jobs.filter(j => j.status === status).length
          const s = STATUS_BADGE[status]
          return (
            <Card key={status} className="p-4">
              <div className="flex items-center justify-between">
                <Badge variant={s.variant} size="sm">{s.label}</Badge>
                <span className="text-2xl font-bold text-white">{count}</span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Jobs list */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : jobs.length === 0 ? (
          <EmptyState
            title="Sin jobs"
            description="Iniciá una recolección para ver los jobs aquí"
            action={<Button size="sm" onClick={createJob}>Nueva recolección</Button>}
          />
        ) : (
          <div className="divide-y divide-surface-border">
            {jobs.map(job => {
              const s = STATUS_BADGE[job.status]
              const isExpanded = expandedLog === job.id
              return (
                <div key={job.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        job.status === 'running' ? 'bg-brand-400 animate-pulse-slow' :
                        job.status === 'done' ? 'bg-emerald-400' :
                        job.status === 'error' ? 'bg-red-400' : 'bg-amber-400'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white capitalize">{job.type}</span>
                          <Badge variant={s.variant} size="sm">{s.label}</Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Creado: {format(new Date(job.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                          {job.started_at && ` · Inicio: ${format(new Date(job.started_at), 'HH:mm:ss')}`}
                          {job.finished_at && ` · Fin: ${format(new Date(job.finished_at), 'HH:mm:ss')}`}
                        </div>
                        {job.log && (
                          <button
                            onClick={() => setExpandedLog(isExpanded ? null : job.id)}
                            className="text-xs text-brand-400 hover:text-brand-300 mt-1 transition-colors"
                          >
                            {isExpanded ? '▲ Ocultar log' : '▼ Ver log'}
                          </button>
                        )}
                        {isExpanded && job.log && (
                          <div className="mt-2 p-3 bg-surface rounded-lg font-mono text-xs text-slate-400 border border-surface-border max-h-32 overflow-y-auto">
                            {job.log}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 ml-4 flex-shrink-0">
                      #{job.id.slice(0, 8)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
