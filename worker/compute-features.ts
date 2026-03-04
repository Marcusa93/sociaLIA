/**
 * Compute account_month_features from posts + post_metrics
 * Run: pnpm compute
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { computeMonthFeatures, computeActivationScores } from '../lib/analytics/features'
import { assignTypology } from '../lib/analytics/typology'
import { computeTop3Share } from '../lib/analytics/concentration'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('⚙️  Computing account_month_features...')

  // Get all orgs
  const { data: orgs } = await supabase.from('organizations').select('id, name')
  if (!orgs?.length) {
    console.log('No organizations found. Run pnpm seed first.')
    return
  }

  for (const org of orgs) {
    console.log(`\nProcessing org: ${org.name}`)

    // Get all months that have posts
    const { data: monthData } = await supabase.rpc('get_monthly_interactions', {
      p_org_id: org.id,
      p_months: 24
    })

    // Alternatively, query directly
    const { data: posts } = await supabase
      .from('posts')
      .select('id, account_id, platform, posted_at, collab_group_id')
      .eq('org_id', org.id)

    const { data: metrics } = await supabase
      .from('post_metrics')
      .select('post_id, likes, comments, views')
      .eq('org_id', org.id)

    if (!posts || !metrics) {
      console.log('  No posts/metrics found')
      continue
    }

    // Index metrics by post_id
    const metricsMap = new Map(metrics.map(m => [m.post_id, m]))

    // Group posts by account + month
    type PostEntry = {
      posted_at: string
      likes: number
      comments: number
      views: number
      collab_group_id: string | null
    }

    const groupMap = new Map<string, Map<string, PostEntry[]>>()

    for (const post of posts) {
      const month = post.posted_at.slice(0, 7) + '-01'
      const key = `${post.account_id}::${month}`
      if (!groupMap.has(post.account_id)) groupMap.set(post.account_id, new Map())
      const accMap = groupMap.get(post.account_id)!
      if (!accMap.has(month)) accMap.set(month, [])

      const m = metricsMap.get(post.id)
      accMap.get(month)!.push({
        posted_at: post.posted_at,
        likes: m?.likes ?? 0,
        comments: m?.comments ?? 0,
        views: m?.views ?? 0,
        collab_group_id: post.collab_group_id,
      })
    }

    // Collect all months
    const allMonths = new Set<string>()
    const allPlatforms = new Set<string>()
    for (const post of posts) {
      allMonths.add(post.posted_at.slice(0, 7) + '-01')
      allPlatforms.add(post.platform)
    }

    // Get account info
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, platform, handle')
      .eq('org_id', org.id)

    const accountPlatformMap = new Map(accounts?.map(a => [a.id, a.platform]) ?? [])

    let totalInserted = 0

    for (const month of Array.from(allMonths).sort()) {
      for (const platform of allPlatforms) {
        // Collect entries for this platform+month
        const platformAccounts = accounts?.filter(a => a.platform === platform) ?? []
        const entries: Array<{
          account_id: string
          inter_total: number
          posts: number
          inter_avg: number
          volatility: number
          collab_ratio: number
        }> = []

        for (const acc of platformAccounts) {
          const accMonthPosts = groupMap.get(acc.id)?.get(month) ?? []
          if (accMonthPosts.length === 0) continue

          const features = computeMonthFeatures(accMonthPosts)
          const collabPosts = accMonthPosts.filter(p => p.collab_group_id !== null).length
          const collabRatio = accMonthPosts.length > 0 ? collabPosts / accMonthPosts.length : 0

          entries.push({
            account_id: acc.id,
            inter_total: features.inter_total,
            posts: features.posts,
            inter_avg: features.inter_avg,
            volatility: features.volatility,
            collab_ratio: collabRatio,
          })
        }

        if (entries.length === 0) continue

        // Compute activation scores
        const activationMap = computeActivationScores(
          entries.map(e => ({ account_id: e.account_id, inter_total: e.inter_total }))
        )

        // Assign typologies
        const typologyInputs = entries.map(e => ({
          ...e,
          activation_score: activationMap.get(e.account_id) ?? 0,
        }))

        // Upsert features
        for (const entry of typologyInputs) {
          const typology = assignTypology(entry, typologyInputs)

          const { error } = await supabase
            .from('account_month_features')
            .upsert({
              org_id: org.id,
              platform: platform as 'instagram' | 'tiktok' | 'facebook',
              account_id: entry.account_id,
              month,
              posts: entry.posts,
              inter_total: entry.inter_total,
              inter_avg: entry.inter_avg,
              volatility: entry.volatility,
              activation_score: entry.activation_score,
              typology,
              computed_at: new Date().toISOString(),
            }, { onConflict: 'org_id,account_id,month' })

          if (!error) totalInserted++
        }

        // Compute ecosystem summary
        const top3Share = computeTop3Share(
          entries.map(e => ({ account_id: e.account_id, inter_total: e.inter_total }))
        )
        const totalInteractions = entries.reduce((sum, e) => sum + e.inter_total, 0)
        const totalPosts = entries.reduce((sum, e) => sum + e.posts, 0)

        await supabase
          .from('ecosystem_month_summary')
          .upsert({
            org_id: org.id,
            platform: platform as 'instagram' | 'tiktok' | 'facebook',
            month,
            total_posts: totalPosts,
            total_interactions: totalInteractions,
            top3_share: top3Share,
            computed_at: new Date().toISOString(),
          }, { onConflict: 'org_id,platform,month' })
      }

      process.stdout.write(`  ${month} ✓\r`)
    }

    console.log(`\n  ✅ Features inserted/updated: ${totalInserted}`)
  }

  console.log('\n🎉 compute-features complete!')
}

main().catch(console.error)
