export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_logs: {
        Row: {
          id: string
          admin_id: string | null
          action_type: string
          target_user_id: string | null
          target_table: string | null
          target_record_id: string | null
          amount: number | null
          currency: string | null
          description: string | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          admin_id?: string | null
          action_type: string
          target_user_id?: string | null
          target_table?: string | null
          target_record_id?: string | null
          amount?: number | null
          currency?: string | null
          description?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          admin_id?: string | null
          action_type?: string
          target_user_id?: string | null
          target_table?: string | null
          target_record_id?: string | null
          amount?: number | null
          currency?: string | null
          description?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      deposits: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          proof_file_url: string | null
          transaction_hash: string | null
          status: string
          verified_at: string | null
          verified_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency: string
          proof_file_url?: string | null
          transaction_hash?: string | null
          status: string
          verified_at?: string | null
          verified_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          currency?: string
          proof_file_url?: string | null
          transaction_hash?: string | null
          status?: string
          verified_at?: string | null
          verified_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      earnings: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          earnings_date: string
          deposit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          reference_id: string | null
          source: string | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency: string
          earnings_date: string
          deposit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          reference_id?: string | null
          source?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          currency?: string
          earnings_date?: string
          deposit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          reference_id?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      kyc_documents: {
        Row: {
          id: string
          user_id: string | null
          document_type: string
          file_url: string
          file_name: string | null
          file_size: number | null
          uploaded_at: string | null
          verified: boolean | null
          verified_by: string | null
          verified_at: string | null
          rejection_reason: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          document_type: string
          file_url: string
          file_name?: string | null
          file_size?: number | null
          uploaded_at?: string | null
          verified?: boolean | null
          verified_by?: string | null
          verified_at?: string | null
          rejection_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          document_type?: string
          file_url?: string
          file_name?: string | null
          file_size?: number | null
          uploaded_at?: string | null
          verified?: boolean | null
          verified_by?: string | null
          verified_at?: string | null
          rejection_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          kyc_verified: boolean | null
          referral_code: string
          referred_by: string | null
          created_at: string
          updated_at: string
          balance: number | null
          username: string | null
          avatar_url: string | null
          kyc_status: string | null
          kyc_id_url: string | null
          kyc_selfie_url: string | null
          last_login: string | null
          kyc_submitted_at: string | null
          kyc_rejection_reason: string | null
          date_of_birth: string | null
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          email: string
          kyc_verified?: boolean | null
          referral_code: string
          referred_by?: string | null
          created_at?: string
          updated_at?: string
          balance?: number | null
          username?: string | null
          avatar_url?: string | null
          kyc_status?: string | null
          kyc_id_url?: string | null
          kyc_selfie_url?: string | null
          last_login?: string | null
          kyc_submitted_at?: string | null
          kyc_rejection_reason?: string | null
          date_of_birth?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string
          kyc_verified?: boolean | null
          referral_code?: string
          referred_by?: string | null
          created_at?: string
          updated_at?: string
          balance?: number | null
          username?: string | null
          avatar_url?: string | null
          kyc_status?: string | null
          kyc_id_url?: string | null
          kyc_selfie_url?: string | null
          last_login?: string | null
          kyc_submitted_at?: string | null
          kyc_rejection_reason?: string | null
          date_of_birth?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      referral_earnings: {
        Row: {
          id: string
          referrer_id: string
          referred_user_id: string
          amount: number
          currency: string
          source_type: string
          source_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_user_id: string
          amount: number
          currency: string
          source_type: string
          source_id?: string | null
          status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_user_id?: string
          amount?: number
          currency?: string
          source_type?: string
          source_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_earnings_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          status: string
          commission_earned: number | null
          commission_rate: number | null
          total_earned: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          status: string
          commission_earned?: number | null
          commission_rate?: number | null
          total_earned?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string
          status?: string
          commission_earned?: number | null
          commission_rate?: number | null
          total_earned?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: string
          amount: number
          currency: string
          status: string
          reference_id: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          amount: number
          currency: string
          status: string
          reference_id?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          amount?: number
          currency?: string
          status?: string
          reference_id?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      withdrawals: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          wallet_address: string
          bank_info: Json | null
          status: string
          transaction_hash: string | null
          processed_at: string | null
          processed_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency: string
          wallet_address: string
          bank_info?: Json | null
          status: string
          transaction_hash?: string | null
          processed_at?: string | null
          processed_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          currency?: string
          wallet_address?: string
          bank_info?: Json | null
          status?: string
          transaction_hash?: string | null
          processed_at?: string | null
          processed_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      investment_plans: {
        Row: {
          id: string
          plan_name: string
          min_amount: number
          weekly_profit_percent: number
          duration_weeks: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_name: string
          min_amount: number
          weekly_profit_percent: number
          duration_weeks?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_name?: string
          min_amount?: number
          weekly_profit_percent?: number
          duration_weeks?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          invested_amount: number
          current_balance: number
          total_profit_earned: number
          status: string
          start_date: string
          last_compound_date: string
          next_compound_date: string
          end_date: string | null
          user_selected_duration_weeks: number | null
          maturity_date: string | null
          early_withdrawal_penalty_percent: number
          is_matured: boolean
          projected_maturity_value: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          invested_amount: number
          current_balance: number
          total_profit_earned?: number
          status?: string
          start_date?: string
          last_compound_date?: string
          next_compound_date: string
          end_date?: string | null
          user_selected_duration_weeks?: number | null
          maturity_date?: string | null
          early_withdrawal_penalty_percent?: number
          is_matured?: boolean
          projected_maturity_value?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          invested_amount?: number
          current_balance?: number
          total_profit_earned?: number
          status?: string
          start_date?: string
          last_compound_date?: string
          next_compound_date?: string
          end_date?: string | null
          user_selected_duration_weeks?: number | null
          maturity_date?: string | null
          early_withdrawal_penalty_percent?: number
          is_matured?: boolean
          projected_maturity_value?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "investment_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      investment_compounds: {
        Row: {
          id: string
          investment_id: string
          compound_date: string
          balance_before: number
          profit_amount: number
          balance_after: number
          created_at: string
        }
        Insert: {
          id?: string
          investment_id: string
          compound_date: string
          balance_before: number
          profit_amount: number
          balance_after: number
          created_at?: string
        }
        Update: {
          id?: string
          investment_id?: string
          compound_date?: string
          balance_before?: number
          profit_amount?: number
          balance_after?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_compounds_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: string
        }
        Returns: boolean
      }
      add_admin_role: {
        Args: {
          _user_id: string
        }
        Returns: void
      }
      remove_admin_role: {
        Args: {
          _user_id: string
        }
        Returns: void
      }
      get_admin_users: {
        Args: Record<string, never>
        Returns: {
          user_id: string
          email: string
        }[]
      }
      log_admin_action: {
        Args: {
          _action_type: string
          _target_user_id?: string
          _target_table?: string
          _target_record_id?: string
          _amount?: number
          _currency?: string
          _description?: string
          _metadata?: Json
        }
        Returns: string
      }
      get_admin_logs: {
        Args: {
          _limit?: number
          _offset?: number
          _action_type?: string
          _admin_id?: string
          _target_user_id?: string
        }
        Returns: {
          id: string
          admin_email: string
          action_type: string
          target_user_email: string
          target_table: string
          target_record_id: string
          amount: number
          currency: string
          description: string
          created_at: string
        }[]
      }
      get_user_kyc_status: {
        Args: {
          _user_id: string
        }
        Returns: {
          user_id: string
          kyc_verified: boolean
          kyc_status: string
          kyc_submitted_at: string
          documents_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user"],
      transaction_status: ["pending", "approved", "rejected", "completed"],
      transaction_type: ["deposit", "profit", "withdrawal", "referral_bonus"],
      withdrawal_status: ["pending", "processing", "completed", "rejected"],
    },
  },
} as const
