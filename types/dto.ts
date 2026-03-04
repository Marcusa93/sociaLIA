import type { Platform, Affinity, Typology } from '@/lib/supabase/types'

export interface AccountDTO {
  id: string
  orgId: string
  platform: Platform
  handle: string
  displayName: string | null
  affinity: Affinity | null
  tags: Record<string, string>
}

export interface PostDTO {
  id: string
  orgId: string
  platform: Platform
  externalPostId: string
  accountId: string
  postedAt: Date
  permalink: string | null
  collabGroupId: string | null
  caption: string | null
  mediaType: string | null
}

export interface MetricsDTO {
  postId: string
  likes: number
  comments: number
  views: number
  collectedAt: Date
}

export interface MonthlyFeatures {
  accountId: string
  month: Date
  posts: number
  interTotal: number
  interAvg: number
  volatility: number
  activationScore: number
  typology: Typology | null
}

export interface EcosystemSummary {
  orgId: string
  platform: Platform
  month: Date
  totalPosts: number
  totalInteractions: number
  top3Share: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  data?: unknown
}

export interface GraphNode {
  id: string
  label: string
  value: number // degree
  group: string // affinity
  title: string
}

export interface GraphEdge {
  from: string
  to: string
  value: number // weight
}
