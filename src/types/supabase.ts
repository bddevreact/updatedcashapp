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
          telegram_id: string
          balance: number
          energy: number
          max_energy: number
          level: number
          mining_power: number
          claim_streak: number
          last_claim: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          telegram_id: string
          balance?: number
          energy?: number
          max_energy?: number
          level?: number
          mining_power?: number
          claim_streak?: number
          last_claim?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          telegram_id?: string
          balance?: number
          energy?: number
          max_energy?: number
          level?: number
          mining_power?: number
          claim_streak?: number
          last_claim?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_activities: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          amount?: number
          created_at?: string
        }
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          progress: number
          total: number
          reward: number
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          progress?: number
          total: number
          reward: number
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          progress?: number
          total?: number
          reward?: number
          completed?: boolean
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          created_at?: string
        }
      }
    }
  }
}