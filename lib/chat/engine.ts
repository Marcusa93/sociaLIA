import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { classifyIntent, monthNameToDate } from './queries'

function adminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function processQuery(
  orgId: string,
  userQuery: string,
  useLLM = false
): Promise<string> {
  const supabase = adminClient()
  const { intent, platform, month, accountHandle, limit = 5 } = classifyIntent(userQuery)

  let rawAnswer = ''

  try {
    if (intent === 'top_accounts_month') {
      const monthDate = month ? monthNameToDate(month) : null
      let q = supabase
        .from('account_month_features')
        .select('*, accounts!inner(handle, display_name, platform, affinity)')
        .eq('org_id', orgId)
        .order('activation_score', { ascending: false })
        .limit(limit)

      if (platform) q = q.eq('platform', platform as 'instagram' | 'tiktok' | 'facebook')
      if (monthDate) q = q.eq('month', monthDate)

      const { data } = await q
      if (!data || data.length === 0) {
        return 'No hay suficientes datos para responder esta consulta.'
      }

      rawAnswer = `Top ${limit} cuentas por activation score${platform ? ` en ${platform}` : ''}${month ? ` (${month})` : ''}:\n`
      data.forEach((row, i) => {
        const acc = (row as Record<string, unknown>).accounts as { handle: string; display_name: string | null } | null
        rawAnswer += `${i + 1}. @${acc?.handle ?? '?'} — Score: ${row.activation_score.toFixed(2)}, Tipología: ${row.typology ?? 'N/D'}, Interacciones: ${Math.round(row.inter_total).toLocaleString()}\n`
      })
    }

    else if (intent === 'concentration') {
      const monthDate = month ? monthNameToDate(month) : null
      let q = supabase
        .from('ecosystem_month_summary')
        .select('*')
        .eq('org_id', orgId)
        .order('month', { ascending: false })

      if (platform) q = q.eq('platform', platform as 'instagram' | 'tiktok' | 'facebook')
      if (monthDate) q = q.eq('month', monthDate)
      else q = q.limit(6)

      const { data } = await q
      if (!data || data.length === 0) {
        return 'No hay suficientes datos para responder esta consulta.'
      }

      rawAnswer = `Concentración de interacciones${platform ? ` en ${platform}` : ''}:\n`
      data.forEach(row => {
        rawAnswer += `• ${row.month}: Top-3 concentra el ${(row.top3_share * 100).toFixed(1)}% de ${Math.round(row.total_interactions).toLocaleString()} interacciones totales\n`
      })
    }

    else if (intent === 'typology_distribution') {
      const monthDate = month ? monthNameToDate(month) : null
      let q = supabase
        .from('account_month_features')
        .select('typology')
        .eq('org_id', orgId)

      if (platform) q = q.eq('platform', platform as 'instagram' | 'tiktok' | 'facebook')
      if (monthDate) q = q.eq('month', monthDate)

      const { data } = await q
      if (!data || data.length === 0) {
        return 'No hay suficientes datos para responder esta consulta.'
      }

      const counts = data.reduce((acc, row) => {
        const t = row.typology ?? 'Sin tipología'
        acc[t] = (acc[t] ?? 0) + 1
        return acc
      }, {} as Record<string, number>)

      rawAnswer = `Distribución de tipologías${platform ? ` en ${platform}` : ''}${month ? ` (${month})` : ''}:\n`
      Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([typology, count]) => {
          rawAnswer += `• ${typology}: ${count} cuentas\n`
        })
    }

    else if (intent === 'account_evolution') {
      let q = supabase
        .from('account_month_features')
        .select('month, inter_total, activation_score, typology, accounts!inner(handle)')
        .eq('org_id', orgId)
        .order('month', { ascending: true })

      if (accountHandle) {
        q = q.ilike('accounts.handle', `%${accountHandle}%`)
      }
      if (platform) q = q.eq('platform', platform as 'instagram' | 'tiktok' | 'facebook')

      const { data } = await q.limit(12)
      if (!data || data.length === 0) {
        return 'No encontré datos para esa cuenta. Verificá el handle e intentá de nuevo.'
      }

      const firstAccounts = (data[0] as Record<string, unknown>).accounts as { handle: string } | null
      const displayHandle = firstAccounts?.handle ?? accountHandle ?? 'cuenta'
      rawAnswer = `Evolución de @${displayHandle}:\n`
      data.forEach(row => {
        rawAnswer += `• ${row.month}: ${Math.round(row.inter_total).toLocaleString()} interacciones, score: ${row.activation_score.toFixed(2)}, tipología: ${row.typology ?? 'N/D'}\n`
      })
    }

    else if (intent === 'platform_summary') {
      const monthDate = month ? monthNameToDate(month) : null
      let q = supabase
        .from('ecosystem_month_summary')
        .select('*')
        .eq('org_id', orgId)
        .order('total_interactions', { ascending: false })

      if (monthDate) q = q.eq('month', monthDate)
      if (platform) q = q.eq('platform', platform as 'instagram' | 'tiktok' | 'facebook')

      const { data } = await q.limit(10)
      if (!data || data.length === 0) {
        return 'No hay suficientes datos para responder esta consulta.'
      }

      rawAnswer = `Resumen por plataforma:\n`
      data.forEach(row => {
        rawAnswer += `• ${row.platform} (${row.month}): ${row.total_posts} posts, ${Math.round(row.total_interactions).toLocaleString()} interacciones, concentración top-3: ${(row.top3_share * 100).toFixed(1)}%\n`
      })
    }

    else if (intent === 'total_interactions') {
      const monthDate = month ? monthNameToDate(month) : null
      let q = supabase
        .from('ecosystem_month_summary')
        .select('*')
        .eq('org_id', orgId)
        .order('month', { ascending: false })

      if (platform) q = q.eq('platform', platform as 'instagram' | 'tiktok' | 'facebook')
      if (monthDate) q = q.eq('month', monthDate)
      else q = q.limit(8)

      const { data } = await q
      if (!data || data.length === 0) {
        return 'No hay suficientes datos para responder esta consulta.'
      }

      rawAnswer = `Total de interacciones${platform ? ` en ${platform}` : ''}:\n`
      data.forEach(row => {
        rawAnswer += `• ${row.month}: ${Math.round(row.total_interactions).toLocaleString()} interacciones (${row.total_posts} posts)\n`
      })
    }

    else {
      return 'No pude entender tu pregunta. Intentá preguntar por: cuentas con más interacciones, concentración del ecosistema, tipologías de cuentas, o evolución de una cuenta específica.'
    }
  } catch {
    return 'Hubo un error al consultar los datos. Por favor intentá de nuevo.'
  }

  // Optional LLM enhancement
  if (useLLM && process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Sos un analista político experto en ecosistemas de redes sociales. El usuario preguntó: "${userQuery}"\n\nLos datos son:\n${rawAnswer}\n\nRedactá una respuesta profesional, concisa y en español, destacando los patrones más relevantes. Mantené los números exactos.`,
          },
        ],
      })

      return message.content[0].type === 'text' ? message.content[0].text : rawAnswer
    } catch {
      // fallback to raw answer
    }
  }

  return rawAnswer
}
