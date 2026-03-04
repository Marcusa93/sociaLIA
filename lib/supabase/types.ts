export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Platform = 'instagram' | 'tiktok' | 'facebook'
export type Affinity = 'oficialismo' | 'oposicion' | 'neutro' | 'desconocido'
export type Role = 'admin' | 'analyst' | 'viewer'
export type JobStatus = 'pending' | 'running' | 'done' | 'error'
export type ReportStatus = 'generating' | 'ready' | 'error'
export type Typology =
  | 'Gatillo'
  | 'Amplificador'
  | 'Intermitente'
  | 'Saturación'
  | 'Tracción sostenida'
  | 'Intermedia'
  | 'Baja incidencia'
  | 'Coordinación'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: Role
          full_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          role?: Role
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          role?: Role
          full_name?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      accounts: {
        Row: {
          id: string
          org_id: string
          platform: Platform
          handle: string
          display_name: string | null
          affinity: Affinity | null
          tags: Json
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          platform: Platform
          handle: string
          display_name?: string | null
          affinity?: Affinity | null
          tags?: Json
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          platform?: Platform
          handle?: string
          display_name?: string | null
          affinity?: Affinity | null
          tags?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'accounts_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      posts: {
        Row: {
          id: string
          org_id: string
          platform: Platform
          external_post_id: string
          account_id: string
          posted_at: string
          permalink: string | null
          collab_group_id: string | null
          caption: string | null
          media_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          platform: Platform
          external_post_id: string
          account_id: string
          posted_at: string
          permalink?: string | null
          collab_group_id?: string | null
          caption?: string | null
          media_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          platform?: Platform
          external_post_id?: string
          account_id?: string
          posted_at?: string
          permalink?: string | null
          collab_group_id?: string | null
          caption?: string | null
          media_type?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'posts_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'posts_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      post_metrics: {
        Row: {
          id: string
          org_id: string
          post_id: string
          likes: number
          comments: number
          views: number
          collected_at: string
        }
        Insert: {
          id?: string
          org_id: string
          post_id: string
          likes?: number
          comments?: number
          views?: number
          collected_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          post_id?: string
          likes?: number
          comments?: number
          views?: number
          collected_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'post_metrics_post_id_fkey'
            columns: ['post_id']
            isOneToOne: true
            referencedRelation: 'posts'
            referencedColumns: ['id']
          }
        ]
      }
      account_month_features: {
        Row: {
          id: string
          org_id: string
          platform: Platform
          account_id: string
          month: string
          posts: number
          inter_total: number
          inter_avg: number
          volatility: number
          activation_score: number
          typology: Typology | null
          computed_at: string
        }
        Insert: {
          id?: string
          org_id: string
          platform: Platform
          account_id: string
          month: string
          posts?: number
          inter_total?: number
          inter_avg?: number
          volatility?: number
          activation_score?: number
          typology?: Typology | null
          computed_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          platform?: Platform
          account_id?: string
          month?: string
          posts?: number
          inter_total?: number
          inter_avg?: number
          volatility?: number
          activation_score?: number
          typology?: Typology | null
          computed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'account_month_features_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          }
        ]
      }
      ecosystem_month_summary: {
        Row: {
          id: string
          org_id: string
          platform: Platform
          month: string
          total_posts: number
          total_interactions: number
          top3_share: number
          computed_at: string
        }
        Insert: {
          id?: string
          org_id: string
          platform: Platform
          month: string
          total_posts?: number
          total_interactions?: number
          top3_share?: number
          computed_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          platform?: Platform
          month?: string
          total_posts?: number
          total_interactions?: number
          top3_share?: number
          computed_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          id: string
          org_id: string
          type: string
          status: JobStatus
          started_at: string | null
          finished_at: string | null
          log: string | null
          params_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          type?: string
          status?: JobStatus
          started_at?: string | null
          finished_at?: string | null
          log?: string | null
          params_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          type?: string
          status?: JobStatus
          started_at?: string | null
          finished_at?: string | null
          log?: string | null
          params_json?: Json
          created_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          org_id: string
          period_from: string
          period_to: string
          status: ReportStatus
          pdf_path: string | null
          html_content: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          period_from: string
          period_to: string
          status?: ReportStatus
          pdf_path?: string | null
          html_content?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          period_from?: string
          period_to?: string
          status?: ReportStatus
          pdf_path?: string | null
          html_content?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_monthly_interactions: {
        Args: {
          p_org_id: string
          p_platform?: string | null
          p_months?: number
        }
        Returns: Array<{
          month: string
          platform: string
          total_interactions: number
        }>
      }
      get_top_accounts: {
        Args: {
          p_org_id: string
          p_platform?: string | null
          p_limit?: number
        }
        Returns: Array<{
          account_id: string
          handle: string
          display_name: string | null
          platform: string
          activation_score: number
          typology: string | null
        }>
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
