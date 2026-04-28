export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: 'USER' | 'ADMIN' | 'AUDITOR'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          role?: 'USER' | 'ADMIN' | 'AUDITOR'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: 'USER' | 'ADMIN' | 'AUDITOR'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan?: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'OWNER' | 'ADMIN' | 'MEMBER'
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'OWNER' | 'ADMIN' | 'MEMBER'
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'OWNER' | 'ADMIN' | 'MEMBER'
          created_at?: string
        }
      }
      websites: {
        Row: {
          id: string
          organization_id: string
          name: string
          url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          url: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          url?: string
          created_at?: string
          updated_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          website_id: string
          status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
          score: number | null
          total_violations: number
          critical_violations: number
          serious_violations: number
          moderate_violations: number
          minor_violations: number
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          website_id: string
          status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
          score?: number | null
          total_violations?: number
          critical_violations?: number
          serious_violations?: number
          moderate_violations?: number
          minor_violations?: number
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          website_id?: string
          status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
          score?: number | null
          total_violations?: number
          critical_violations?: number
          serious_violations?: number
          moderate_violations?: number
          minor_violations?: number
          created_at?: string
          completed_at?: string | null
        }
      }
      violations: {
        Row: {
          id: string
          scan_id: string
          rule_id: string
          impact: 'critical' | 'serious' | 'moderate' | 'minor'
          description: string
          help: string
          help_url: string
          html: string
          target: string
          wcag_tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          scan_id: string
          rule_id: string
          impact: 'critical' | 'serious' | 'moderate' | 'minor'
          description: string
          help: string
          help_url: string
          html: string
          target: string
          wcag_tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          scan_id?: string
          rule_id?: string
          impact?: 'critical' | 'serious' | 'moderate' | 'minor'
          description?: string
          help?: string
          help_url?: string
          html?: string
          target?: string
          wcag_tags?: string[]
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          organization_id: string
          name: string
          type: 'EXECUTIVE' | 'DETAILED' | 'COMPLIANCE'
          date_range_start: string
          date_range_end: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          type: 'EXECUTIVE' | 'DETAILED' | 'COMPLIANCE'
          date_range_start: string
          date_range_end: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          type?: 'EXECUTIVE' | 'DETAILED' | 'COMPLIANCE'
          date_range_start?: string
          date_range_end?: string
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'USER' | 'ADMIN' | 'AUDITOR'
      organization_plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
      member_role: 'OWNER' | 'ADMIN' | 'MEMBER'
      scan_status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
      impact_level: 'critical' | 'serious' | 'moderate' | 'minor'
      report_type: 'EXECUTIVE' | 'DETAILED' | 'COMPLIANCE'
    }
  }
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
export type Website = Database['public']['Tables']['websites']['Row']
export type Scan = Database['public']['Tables']['scans']['Row']
export type Violation = Database['public']['Tables']['violations']['Row']
export type Report = Database['public']['Tables']['reports']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
