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
  public: {
    Tables: {
      challenge_participation: {
        Row: {
          activity: string
          challenge_id: string
          id: string
          points: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          activity?: string
          challenge_id: string
          id?: string
          points?: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          activity?: string
          challenge_id?: string
          id?: string
          points?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participation_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          activity_type: string
          challenge_type: string
          created_at: string
          description: string
          end_date: string
          frequency: string
          id: string
          points: number
          start_date: string
          status: string
          target: string
          title: string
        }
        Insert: {
          activity_type?: string
          challenge_type: string
          created_at?: string
          description?: string
          end_date: string
          frequency?: string
          id?: string
          points?: number
          start_date: string
          status?: string
          target?: string
          title: string
        }
        Update: {
          activity_type?: string
          challenge_type?: string
          created_at?: string
          description?: string
          end_date?: string
          frequency?: string
          id?: string
          points?: number
          start_date?: string
          status?: string
          target?: string
          title?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          action_url: string | null
          banner_url: string | null
          created_at: string
          description: string
          end_date: string
          id: string
          start_date: string
          status: string
          title: string
        }
        Insert: {
          action_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          title: string
        }
        Update: {
          action_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      health_talks: {
        Row: {
          category: string
          created_at: string
          description: string
          duration: number
          id: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          duration?: number
          id?: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          duration?: number
          id?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          correct_answers: number
          health_talk_id: string
          id: string
          score: number
          submitted_at: string
          total_questions: number
          user_id: string
        }
        Insert: {
          correct_answers: number
          health_talk_id: string
          id?: string
          score: number
          submitted_at?: string
          total_questions: number
          user_id: string
        }
        Update: {
          correct_answers?: number
          health_talk_id?: string
          id?: string
          score?: number
          submitted_at?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_health_talk_id_fkey"
            columns: ["health_talk_id"]
            isOneToOne: false
            referencedRelation: "health_talks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          health_talk_id: string
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          question_order: number
        }
        Insert: {
          correct_answer: string
          health_talk_id: string
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          question_order?: number
        }
        Update: {
          correct_answer?: string
          health_talk_id?: string
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          question_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_health_talk_id_fkey"
            columns: ["health_talk_id"]
            isOneToOne: false
            referencedRelation: "health_talks"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          employee_number: string
          function: string
          id: string
          is_admin: boolean
          location: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          employee_number: string
          function: string
          id?: string
          is_admin?: boolean
          location: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          employee_number?: string
          function?: string
          id?: string
          is_admin?: boolean
          location?: string
          name?: string
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          health_talk_id: string
          id: string
          progress_percentage: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          health_talk_id: string
          id?: string
          progress_percentage?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          health_talk_id?: string
          id?: string
          progress_percentage?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_health_talk_id_fkey"
            columns: ["health_talk_id"]
            isOneToOne: false
            referencedRelation: "health_talks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
