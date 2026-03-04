import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { type = 'collection', params = {} } = await request.json()

  // Create the job
  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      org_id: profile.organization_id,
      type,
      status: 'pending',
      params_json: params,
    })
    .select()
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }

  // Simulate job execution (stub)
  simulateJob(profile.organization_id, job.id)

  return NextResponse.json({ jobId: job.id })
}

async function simulateJob(orgId: string, jobId: string) {
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    await supabase
      .from('jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId)

    const delay = 5000 + Math.random() * 5000
    await new Promise(resolve => setTimeout(resolve, delay))

    const success = Math.random() > 0.1
    await supabase
      .from('jobs')
      .update({
        status: success ? 'done' : 'error',
        finished_at: new Date().toISOString(),
        log: success
          ? `Recolección completada. Posts procesados: ${Math.floor(Math.random() * 200 + 50)}`
          : 'Error: timeout al conectar con la API de la plataforma',
      })
      .eq('id', jobId)
  } catch {
    await supabase
      .from('jobs')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        log: 'Error inesperado durante la simulación',
      })
      .eq('id', jobId)
  }
}
