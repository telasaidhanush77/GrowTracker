export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_coaching_logs: {
        Row: {
          coaching_type: string
          employee_id: string
          id: string
          log_date: string
          notification_id: string | null
          sent_at: string
        }
        Insert: {
          coaching_type: string
          employee_id: string
          id?: string
          log_date?: string
          notification_id?: string | null
          sent_at?: string
        }
        Update: {
          coaching_type?: string
          employee_id?: string
          id?: string
          log_date?: string
          notification_id?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coaching_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coaching_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reports: {
        Row: {
          content: string
          created_at: string
          employee_id: string
          generated_at: string
          goal_id: string | null
          id: string
          improvements: string[]
          model_used: string
          overall_score: number | null
          quarter: string | null
          recommendations: string[]
          report_type: string
          strengths: string[]
          summary: string | null
        }
        Insert: {
          content: string
          created_at?: string
          employee_id: string
          generated_at?: string
          goal_id?: string | null
          id?: string
          improvements?: string[]
          model_used: string
          overall_score?: number | null
          quarter?: string | null
          recommendations?: string[]
          report_type: string
          strengths?: string[]
          summary?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          employee_id?: string
          generated_at?: string
          goal_id?: string | null
          id?: string
          improvements?: string[]
          model_used?: string
          overall_score?: number | null
          quarter?: string | null
          recommendations?: string[]
          report_type?: string
          strengths?: string[]
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reports_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      api_call_log: {
        Row: {
          call_date: string
          called_at: string
          endpoint: string
          id: string
          user_id: string
        }
        Insert: {
          call_date?: string
          called_at?: string
          endpoint: string
          id?: string
          user_id: string
        }
        Update: {
          call_date?: string
          called_at?: string
          endpoint?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          evidence_id: string | null
          goal_id: string | null
          id: string
          mime_type: string
          name: string
          size: number | null
          uri: string
        }
        Insert: {
          created_at?: string
          evidence_id?: string | null
          goal_id?: string | null
          id?: string
          mime_type: string
          name: string
          size?: number | null
          uri: string
        }
        Update: {
          created_at?: string
          evidence_id?: string | null
          goal_id?: string | null
          id?: string
          mime_type?: string
          name?: string
          size?: number | null
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          tasks: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          id?: string
          notes?: string | null
          tasks?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          tasks?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          description: string
          goal_id: string
          id: string
          links: string[]
          manager_feedback: string | null
          reviewed_at: string | null
          self_rating: number | null
          status: string
          submitted_at: string
        }
        Insert: {
          description?: string
          goal_id: string
          id?: string
          links?: string[]
          manager_feedback?: string | null
          reviewed_at?: string | null
          self_rating?: number | null
          status?: string
          submitted_at?: string
        }
        Update: {
          description?: string
          goal_id?: string
          id?: string
          links?: string[]
          manager_feedback?: string | null
          reviewed_at?: string | null
          self_rating?: number | null
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: true
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string
          created_at: string
          description: string
          employee_id: string
          id: string
          manager_rating: number | null
          priority: string
          quarter: string
          status: string
          target_date: string
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          employee_id: string
          id?: string
          manager_rating?: number | null
          priority?: string
          quarter: string
          status?: string
          target_date: string
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          employee_id?: string
          id?: string
          manager_rating?: number | null
          priority?: string
          quarter?: string
          status?: string
          target_date?: string
          title?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_id: string
          related_employee_id: string | null
          related_goal_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_id: string
          related_employee_id?: string | null
          related_goal_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_id?: string
          related_employee_id?: string | null
          related_goal_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_employee_id_fkey"
            columns: ["related_employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_goal_id_fkey"
            columns: ["related_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_initials: string
          created_at: string
          department: string
          designation: string
          email: string
          employee_code: string
          first_name: string
          id: string
          join_date: string
          last_name: string
          manager_id: string | null
          mobile: string | null
          push_token: string | null
          role: string
          status: string
          username: string
        }
        Insert: {
          avatar_initials?: string
          created_at?: string
          department?: string
          designation?: string
          email: string
          employee_code: string
          first_name: string
          id: string
          join_date?: string
          last_name: string
          manager_id?: string | null
          mobile?: string | null
          push_token?: string | null
          role: string
          status?: string
          username: string
        }
        Update: {
          avatar_initials?: string
          created_at?: string
          department?: string
          designation?: string
          email?: string
          employee_code?: string
          first_name?: string
          id?: string
          join_date?: string
          last_name?: string
          manager_id?: string | null
          mobile?: string | null
          push_token?: string | null
          role?: string
          status?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_identifier: {
        Args: { p_identifier: string }
        Returns: string
      }
      my_manager_id: { Args: never; Returns: string }
      my_role: { Args: never; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
