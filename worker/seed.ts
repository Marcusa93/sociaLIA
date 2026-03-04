/**
 * Seed script for SociaLIA
 * Creates: 1 org, 15 accounts, 8 months of posts & metrics
 * Run: pnpm seed
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Helpers ────────────────────────────────────────────────────────────────
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function firstDayOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

// ── Data definitions ──────────────────────────────────────────────────────
const START_DATE = new Date('2024-08-01')
const NUM_MONTHS = 8  // aug-2024 to mar-2025

const ACCOUNTS = [
  // Oficialismo
  { handle: 'gob_central', display_name: 'Gobierno Central', platform: 'instagram', affinity: 'oficialismo', block: 'oficialismo', tags: { nivel: 'nacional', tema: 'gestión' } },
  { handle: 'ministerioecon', display_name: 'Ministerio de Economía', platform: 'instagram', affinity: 'oficialismo', block: 'oficialismo', tags: { nivel: 'nacional', tema: 'economía' } },
  { handle: 'partido_oficialista', display_name: 'Partido Oficialista', platform: 'facebook', affinity: 'oficialismo', block: 'oficialismo', tags: { nivel: 'nacional', tema: 'política' } },
  { handle: 'vocero_oficial', display_name: 'Vocero Oficial', platform: 'tiktok', affinity: 'oficialismo', block: 'oficialismo', tags: { nivel: 'nacional', tema: 'comunicación' } },
  { handle: 'legislador_of1', display_name: 'Legislador Oficialismo 1', platform: 'facebook', affinity: 'oficialismo', block: 'oficialismo', tags: { nivel: 'nacional', tema: 'legislativo' } },
  { handle: 'candidata_oficialista', display_name: 'Candidata Oficialista', platform: 'instagram', affinity: 'oficialismo', block: 'oficialismo', tags: { nivel: 'provincial', tema: 'elecciones' } },
  { handle: 'intendente_of', display_name: 'Intendente Oficialista', platform: 'tiktok', affinity: 'oficialismo', block: 'oficialismo', tags: { nivel: 'municipal', tema: 'gestión' } },
  { handle: 'portavoz_of', display_name: 'Portavoz Oficialismo', platform: 'facebook', affinity: 'oficialismo', block: 'oficialismo', tags: { nivel: 'nacional', tema: 'comunicación' } },
  // Oposición
  { handle: 'lider_oposicion', display_name: 'Líder de la Oposición', platform: 'instagram', affinity: 'oposicion', block: 'oposicion', tags: { nivel: 'nacional', tema: 'política' } },
  { handle: 'bloque_opositor', display_name: 'Bloque Opositor', platform: 'facebook', affinity: 'oposicion', block: 'oposicion', tags: { nivel: 'nacional', tema: 'legislativo' } },
  { handle: 'critica_politica', display_name: 'Crítica Política', platform: 'tiktok', affinity: 'oposicion', block: 'oposicion', tags: { nivel: 'nacional', tema: 'análisis' } },
  { handle: 'opositor_joven', display_name: 'Movimiento Joven Opositor', platform: 'instagram', affinity: 'oposicion', block: 'oposicion', tags: { nivel: 'nacional', tema: 'juventud' } },
  { handle: 'legisladora_op', display_name: 'Legisladora Opositora', platform: 'facebook', affinity: 'oposicion', block: 'oposicion', tags: { nivel: 'nacional', tema: 'legislativo' } },
  { handle: 'medios_alternativos', display_name: 'Medios Alternativos', platform: 'tiktok', affinity: 'oposicion', block: 'oposicion', tags: { nivel: 'nacional', tema: 'medios' } },
  { handle: 'activismo_civil', display_name: 'Activismo Civil', platform: 'instagram', affinity: 'neutro', block: 'oposicion', tags: { nivel: 'nacional', tema: 'sociedad' } },
]

// Collab groups (accounts that co-publish)
const COLLAB_CLUSTERS = [
  { id: 'collab-A', handles: ['gob_central', 'ministerioecon', 'vocero_oficial'] },
  { id: 'collab-B', handles: ['partido_oficialista', 'legislador_of1', 'portavoz_of'] },
  { id: 'collab-C', handles: ['lider_oposicion', 'bloque_opositor', 'legisladora_op'] },
  { id: 'collab-D', handles: ['critica_politica', 'opositor_joven', 'medios_alternativos'] },
]

// ── Main seed function ─────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting SociaLIA seed...')

  // 1. Create organization
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'socialía-demo')
    .single()

  let orgId: string

  if (existingOrg) {
    orgId = existingOrg.id
    console.log(`✅ Using existing org: ${orgId}`)
  } else {
    const { data: org, error } = await supabase
      .from('organizations')
      .insert({ name: 'SociaLIA Demo', slug: 'socialía-demo' })
      .select()
      .single()

    if (error || !org) {
      console.error('❌ Failed to create organization:', error)
      process.exit(1)
    }

    orgId = org.id
    console.log(`✅ Created org: ${orgId}`)
  }

  // 2. Create accounts
  const accountIdMap = new Map<string, string>()

  for (const acc of ACCOUNTS) {
    const { data: existing } = await supabase
      .from('accounts')
      .select('id')
      .eq('org_id', orgId)
      .eq('handle', acc.handle)
      .single()

    if (existing) {
      accountIdMap.set(acc.handle, existing.id)
      continue
    }

    const { data: created, error } = await supabase
      .from('accounts')
      .insert({
        org_id: orgId,
        platform: acc.platform as 'instagram' | 'tiktok' | 'facebook',
        handle: acc.handle,
        display_name: acc.display_name,
        affinity: acc.affinity as 'oficialismo' | 'oposicion' | 'neutro' | 'desconocido',
        tags: acc.tags,
      })
      .select()
      .single()

    if (error || !created) {
      console.error(`❌ Failed to create account ${acc.handle}:`, error?.message)
      continue
    }

    accountIdMap.set(acc.handle, created.id)
  }

  console.log(`✅ Accounts: ${accountIdMap.size} created/found`)

  // 3. Create posts and metrics for 8 months
  let postCount = 0
  let metricsCount = 0

  for (let m = 0; m < NUM_MONTHS; m++) {
    const monthDate = addMonths(START_DATE, m)
    const monthStr = firstDayOfMonth(monthDate)

    for (const acc of ACCOUNTS) {
      const accountId = accountIdMap.get(acc.handle)
      if (!accountId) continue

      // Number of posts varies by account and month (high engagement accounts post more)
      const isHighActivity = ['gob_central', 'lider_oposicion', 'critica_politica'].includes(acc.handle)
      const isMediumActivity = ['ministerioecon', 'partido_oficialista', 'bloque_opositor'].includes(acc.handle)
      const postsThisMonth = isHighActivity ? randomInt(15, 30) : isMediumActivity ? randomInt(8, 18) : randomInt(3, 12)

      const collabCluster = COLLAB_CLUSTERS.find(c => c.handles.includes(acc.handle))

      for (let p = 0; p < postsThisMonth; p++) {
        const dayOfMonth = randomInt(1, 28)
        const postedAt = new Date(monthDate)
        postedAt.setDate(dayOfMonth)
        postedAt.setHours(randomInt(8, 22), randomInt(0, 59))

        // Some posts are collaborative
        const isCollab = collabCluster && Math.random() < 0.4
        const collabGroupId = isCollab
          ? `${collabCluster.id}-${monthStr}-${Math.floor(p / 3)}`
          : null

        const externalId = `${acc.platform}-${acc.handle}-${monthStr}-${p}`

        // Check if post already exists
        const { data: existing } = await supabase
          .from('posts')
          .select('id')
          .eq('org_id', orgId)
          .eq('external_post_id', externalId)
          .single()

        let postId: string

        if (existing) {
          postId = existing.id
        } else {
          const { data: post, error } = await supabase
            .from('posts')
            .insert({
              org_id: orgId,
              platform: acc.platform as 'instagram' | 'tiktok' | 'facebook',
              external_post_id: externalId,
              account_id: accountId,
              posted_at: postedAt.toISOString(),
              collab_group_id: collabGroupId,
              caption: `Post de ${acc.display_name} - ${monthStr}`,
              media_type: ['image', 'video', 'reel'][randomInt(0, 2)],
            })
            .select()
            .single()

          if (error || !post) continue

          postId = post.id
          postCount++
        }

        // Generate metrics (varied by account type)
        const baseLikes = isHighActivity
          ? randomInt(5000, 50000)
          : isMediumActivity ? randomInt(1000, 15000) : randomInt(100, 5000)

        // Check if metrics already exist for this post
        const { data: existingMetrics } = await supabase
          .from('post_metrics')
          .select('id')
          .eq('post_id', postId)
          .single()

        let metricsError = null
        if (!existingMetrics) {
          const { error } = await supabase
            .from('post_metrics')
            .insert({
              org_id: orgId,
              post_id: postId,
              likes: baseLikes,
              comments: Math.floor(baseLikes * randomFloat(0.02, 0.15)),
              views: Math.floor(baseLikes * randomFloat(3, 20)),
            })
          metricsError = error
        }

        if (!metricsError) metricsCount++
      }
    }

    process.stdout.write(`  Month ${m + 1}/${NUM_MONTHS}: ${monthStr} ✓\r`)
  }

  console.log(`\n✅ Posts: ${postCount} created, Metrics: ${metricsCount} upserted`)
  console.log('\n🎉 Seed complete! Run pnpm compute to calculate features.')
  console.log(`   Org ID: ${orgId}`)
}

main().catch(console.error)
