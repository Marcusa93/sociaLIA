import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildReportHTML } from '@/lib/reports/builder'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { periodFrom, periodTo, platforms } = await request.json()

  if (!periodFrom || !periodTo) {
    return NextResponse.json({ error: 'Period is required' }, { status: 400 })
  }

  const orgData = profile.organizations as unknown as { name: string } | null

  // Create report record
  const { data: report, error: insertError } = await supabase
    .from('reports')
    .insert({
      org_id: profile.organization_id,
      period_from: periodFrom,
      period_to: periodTo,
      status: 'generating',
    })
    .select()
    .single()

  if (insertError || !report) {
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }

  // Generate HTML
  try {
    const html = await buildReportHTML({
      orgId: profile.organization_id,
      orgName: orgData?.name ?? 'Organización',
      periodFrom,
      periodTo,
      platforms: platforms ?? ['instagram', 'tiktok', 'facebook'],
    })

    await supabase
      .from('reports')
      .update({ html_content: html, status: 'ready' })
      .eq('id', report.id)

    return NextResponse.json({ reportId: report.id })
  } catch {
    await supabase
      .from('reports')
      .update({ status: 'error' })
      .eq('id', report.id)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
