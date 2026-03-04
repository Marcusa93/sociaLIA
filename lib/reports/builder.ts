import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

function adminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface ReportData {
  orgId: string
  orgName: string
  periodFrom: string
  periodTo: string
  platforms: string[]
}

export async function buildReportHTML(data: ReportData): Promise<string> {
  const supabase = adminClient()

  // Fetch ecosystem summaries
  const { data: summaries } = await supabase
    .from('ecosystem_month_summary')
    .select('*')
    .eq('org_id', data.orgId)
    .gte('month', data.periodFrom)
    .lte('month', data.periodTo)
    .order('month', { ascending: true })

  // Fetch top accounts
  const { data: topAccounts } = await supabase
    .from('account_month_features')
    .select('*, accounts!inner(handle, display_name, affinity, platform)')
    .eq('org_id', data.orgId)
    .gte('month', data.periodFrom)
    .lte('month', data.periodTo)
    .order('activation_score', { ascending: false })
    .limit(10)

  // Fetch typology distribution
  const { data: typologies } = await supabase
    .from('account_month_features')
    .select('typology, platform')
    .eq('org_id', data.orgId)
    .gte('month', data.periodFrom)
    .lte('month', data.periodTo)

  const typologyCount = (typologies ?? []).reduce((acc, row) => {
    const t = row.typology ?? 'Sin tipología'
    acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalInteractions = (summaries ?? []).reduce((sum, s) => sum + Number(s.total_interactions), 0)
  const totalPosts = (summaries ?? []).reduce((sum, s) => sum + s.total_posts, 0)
  const avgConcentration = (summaries ?? []).length > 0
    ? (summaries ?? []).reduce((sum, s) => sum + Number(s.top3_share), 0) / (summaries ?? []).length
    : 0

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte SociaLIA — ${data.orgName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; background: #fff; line-height: 1.6; }
    .page { max-width: 900px; margin: 0 auto; padding: 48px 40px; }
    .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 40px; border-radius: 16px; margin-bottom: 40px; }
    .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    .header p { opacity: 0.85; font-size: 14px; }
    .header .period { margin-top: 12px; font-size: 13px; opacity: 0.75; }
    h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .section { margin-bottom: 40px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .kpi-value { font-size: 28px; font-weight: 700; color: #4f46e5; }
    .kpi-label { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; }
    .badge-oficialismo { background: #dbeafe; color: #1d4ed8; }
    .badge-oposicion { background: #fee2e2; color: #b91c1c; }
    .badge-neutro { background: #f1f5f9; color: #475569; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
    .conclusions { background: #fafafa; border-left: 4px solid #4f46e5; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 16px; }
    .conclusions p { font-size: 13px; color: #475569; line-height: 1.7; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1>Reporte de Ecosistema Digital</h1>
        <p>${data.orgName}</p>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:700">SociaLIA</div>
        <div style="font-size:11px;opacity:0.75">Social Intelligence</div>
      </div>
    </div>
    <div class="period">Período: ${data.periodFrom} → ${data.periodTo} · Plataformas: ${data.platforms.join(', ')}</div>
  </div>

  <div class="section">
    <h2>Indicadores Clave</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">${Math.round(totalInteractions).toLocaleString('es-AR')}</div>
        <div class="kpi-label">Interacciones totales</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${totalPosts.toLocaleString('es-AR')}</div>
        <div class="kpi-label">Posts recolectados</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${(avgConcentration * 100).toFixed(1)}%</div>
        <div class="kpi-label">Concentración top-3 promedio</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Conclusiones Automáticas</h2>
    ${generateConclusions({ totalInteractions, avgConcentration, typologyCount })}
  </div>

  <div class="section">
    <h2>Top 10 Cuentas por Activation Score</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Cuenta</th>
          <th>Plataforma</th>
          <th>Interacciones</th>
          <th>Score</th>
          <th>Tipología</th>
          <th>Afinidad</th>
        </tr>
      </thead>
      <tbody>
        ${(topAccounts ?? []).map((row, i) => {
          const acc = (row as Record<string, unknown>).accounts as { handle: string; display_name: string | null; affinity: string | null; platform: string } | null
          return `<tr>
            <td>${i + 1}</td>
            <td>@${acc?.handle ?? '?'}<br><span style="color:#94a3b8;font-size:11px">${acc?.display_name ?? ''}</span></td>
            <td>${acc?.platform ?? '?'}</td>
            <td>${Math.round(row.inter_total).toLocaleString('es-AR')}</td>
            <td>${row.activation_score?.toFixed(3) ?? 'N/D'}</td>
            <td>${row.typology ?? 'N/D'}</td>
            <td><span class="badge badge-${acc?.affinity ?? 'neutro'}">${acc?.affinity ?? 'neutro'}</span></td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Distribución de Tipologías</h2>
    <table>
      <thead>
        <tr><th>Tipología</th><th>Cuentas</th><th>%</th></tr>
      </thead>
      <tbody>
        ${Object.entries(typologyCount)
          .sort(([, a], [, b]) => b - a)
          .map(([t, count]) => {
            const total = Object.values(typologyCount).reduce((a, b) => a + b, 0)
            return `<tr><td>${t}</td><td>${count}</td><td>${((count / total) * 100).toFixed(1)}%</td></tr>`
          }).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Resumen Mensual por Plataforma</h2>
    <table>
      <thead>
        <tr><th>Mes</th><th>Plataforma</th><th>Posts</th><th>Interacciones</th><th>Conc. Top-3</th></tr>
      </thead>
      <tbody>
        ${(summaries ?? []).map(s => `
          <tr>
            <td>${s.month}</td>
            <td>${s.platform}</td>
            <td>${s.total_posts.toLocaleString('es-AR')}</td>
            <td>${Math.round(s.total_interactions).toLocaleString('es-AR')}</td>
            <td>${(Number(s.top3_share) * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Generado por SociaLIA · ${new Date().toLocaleDateString('es-AR')} · Datos al cierre del período analizado
  </div>
</div>
</body>
</html>`

  return html
}

function generateConclusions(data: {
  totalInteractions: number
  avgConcentration: number
  typologyCount: Record<string, number>
}): string {
  const conclusions: string[] = []

  if (data.avgConcentration > 0.6) {
    conclusions.push(`El ecosistema muestra <strong>alta concentración</strong>: el top-3 de cuentas acapara en promedio el ${(data.avgConcentration * 100).toFixed(1)}% de las interacciones, indicando un ecosistema poco diverso y dominado por pocos actores.`)
  } else if (data.avgConcentration > 0.4) {
    conclusions.push(`El ecosistema presenta una concentración <strong>moderada</strong> (${(data.avgConcentration * 100).toFixed(1)}% en top-3), con varios actores compitiendo por visibilidad.`)
  } else {
    conclusions.push(`La concentración es <strong>baja</strong> (${(data.avgConcentration * 100).toFixed(1)}% en top-3), sugiriendo un ecosistema relativamente diverso.`)
  }

  const gatillos = data.typologyCount['Gatillo'] ?? 0
  const coordinacion = data.typologyCount['Coordinación'] ?? 0

  if (gatillos > 0) {
    conclusions.push(`Se identificaron <strong>${gatillos} cuentas Gatillo</strong>, con capacidad de alta amplificación de mensajes.`)
  }

  if (coordinacion > 0) {
    conclusions.push(`Se detectaron <strong>${coordinacion} cuentas con patrón de Coordinación</strong> (más del 50% de publicaciones en formato colaborativo), lo que puede indicar acción coordinada.`)
  }

  return conclusions
    .map(c => `<div class="conclusions"><p>${c}</p></div>`)
    .join('')
}
