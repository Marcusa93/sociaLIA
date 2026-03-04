import type { AccountDTO, PostDTO, MetricsDTO } from '@/types/dto'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

/**
 * BrightData connector interface
 */
export interface BrightDataConnector {
  fetchAccountPosts(account: AccountDTO, from: Date, to: Date): Promise<PostDTO[]>
  fetchPostMetrics(postIds: string[]): Promise<MetricsDTO[]>
}

/**
 * Mock connector — returns data from the seed in Supabase
 */
export class MockConnector implements BrightDataConnector {
  private supabase

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  async fetchAccountPosts(account: AccountDTO, from: Date, to: Date): Promise<PostDTO[]> {
    const { data } = await this.supabase
      .from('posts')
      .select('*')
      .eq('account_id', account.id)
      .gte('posted_at', from.toISOString())
      .lte('posted_at', to.toISOString())

    return (data ?? []).map(p => ({
      id: p.id,
      orgId: p.org_id,
      platform: p.platform,
      externalPostId: p.external_post_id,
      accountId: p.account_id,
      postedAt: new Date(p.posted_at),
      permalink: p.permalink,
      collabGroupId: p.collab_group_id,
      caption: p.caption,
      mediaType: p.media_type,
    }))
  }

  async fetchPostMetrics(postIds: string[]): Promise<MetricsDTO[]> {
    const { data } = await this.supabase
      .from('post_metrics')
      .select('*')
      .in('post_id', postIds)

    return (data ?? []).map(m => ({
      postId: m.post_id,
      likes: m.likes,
      comments: m.comments,
      views: m.views,
      collectedAt: new Date(m.collected_at),
    }))
  }
}

/**
 * Real BrightData connector — stub for future integration
 */
export class RealConnector implements BrightDataConnector {
  constructor(private apiKey: string) {}

  async fetchAccountPosts(_account: AccountDTO, _from: Date, _to: Date): Promise<PostDTO[]> {
    // TODO: Implement Bright Data API calls
    throw new Error('RealConnector not yet implemented')
  }

  async fetchPostMetrics(_postIds: string[]): Promise<MetricsDTO[]> {
    // TODO: Implement Bright Data API calls
    throw new Error('RealConnector not yet implemented')
  }
}

export function getConnector(): BrightDataConnector {
  if (process.env.BRIGHT_DATA_API_KEY) {
    return new RealConnector(process.env.BRIGHT_DATA_API_KEY)
  }
  return new MockConnector()
}
