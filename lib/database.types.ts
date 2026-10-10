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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      cc_applications: {
        Row: {
          business_id: string
          evidence_paths: string[]
          logo_path: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          evidence_paths?: string[]
          logo_path?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          evidence_paths?: string[]
          logo_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_applications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "cc_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          business_id: string | null
          created_at: string
          id: string
          note: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          note?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "cc_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "cc_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_businesses: {
        Row: {
          category: string
          description: string
          hours: string
          id: string
          location: string
          name: string
          owner_id: string
          owner_name: string
          phone: string
          slug: string
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          category: string
          description: string
          hours?: string
          id?: string
          location: string
          name: string
          owner_id: string
          owner_name?: string
          phone: string
          slug?: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          category?: string
          description?: string
          hours?: string
          id?: string
          location?: string
          name?: string
          owner_id?: string
          owner_name?: string
          phone?: string
          slug?: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "cc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_cleanup: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          paths: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          paths: string[]
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          paths?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "cc_cleanup_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "cc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          order_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          order_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "cc_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cc_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_orders: {
        Row: {
          business_id: string
          buyer_id: string
          confirmed_at: string | null
          created_at: string
          fulfillment: string
          fulfillment_location: string
          id: string
          notes: string
          payment_method: string
          product_id: string | null
          product_name: string
          quantity: number
          status: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          business_id: string
          buyer_id: string
          confirmed_at?: string | null
          created_at?: string
          fulfillment?: string
          fulfillment_location?: string
          id?: string
          notes?: string
          payment_method?: string
          product_id?: string | null
          product_name?: string
          quantity: number
          status?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          buyer_id?: string
          confirmed_at?: string | null
          created_at?: string
          fulfillment?: string
          fulfillment_location?: string
          id?: string
          notes?: string
          payment_method?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          status?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "cc_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "cc_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cc_products"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_products: {
        Row: {
          active: boolean
          available: boolean
          business_id: string
          category: string
          created_at: string
          description: string
          id: string
          image_paths: string[]
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          available?: boolean
          business_id: string
          category: string
          created_at?: string
          description: string
          id?: string
          image_paths?: string[]
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          available?: boolean
          business_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_paths?: string[]
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "cc_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_profiles: {
        Row: {
          account_kind: string
          blocked: boolean
          created_at: string
          full_name: string
          id: string
          role: string
        }
        Insert: {
          account_kind?: string
          blocked?: boolean
          created_at?: string
          full_name?: string
          id: string
          role?: string
        }
        Update: {
          account_kind?: string
          blocked?: boolean
          created_at?: string
          full_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      cc_reports: {
        Row: {
          business_id: string
          created_at: string
          details: string
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          details: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "cc_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "cc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_review_comments: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          author_name?: string
          body: string
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_review_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "cc_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_review_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "cc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_reviews: {
        Row: {
          body: string
          business_id: string
          created_at: string
          hidden: boolean
          id: string
          order_id: string | null
          product_id: string | null
          rating: number
          reviewer_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          business_id: string
          created_at?: string
          hidden?: boolean
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating: number
          reviewer_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          business_id?: string
          created_at?: string
          hidden?: boolean
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating?: number
          reviewer_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "cc_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cc_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cc_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "cc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_saved: {
        Row: {
          product_id: string
          user_id: string
        }
        Insert: {
          product_id: string
          user_id: string
        }
        Update: {
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_saved_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cc_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_saved_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "cc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_verifications: {
        Row: {
          business_id: string
          id_verified_at: string | null
          note: string
          phone_verified_at: string | null
          verified_by: string | null
          verified_phone: string | null
        }
        Insert: {
          business_id: string
          id_verified_at?: string | null
          note?: string
          phone_verified_at?: string | null
          verified_by?: string | null
          verified_phone?: string | null
        }
        Update: {
          business_id?: string
          id_verified_at?: string | null
          note?: string
          phone_verified_at?: string | null
          verified_by?: string | null
          verified_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cc_verifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "cc_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "cc_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          extracted_text: string
          filename: string
          id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          extracted_text: string
          filename: string
          id?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          extracted_text?: string
          filename?: string
          id?: string
          storage_path?: string
        }
        Relationships: []
      }
      quiz_rush_sessions: {
        Row: {
          answered_count: number
          best_streak: number
          completed_at: string | null
          created_at: string
          document_id: string
          expires_at: string
          id: string
          questions: Json
          responses: Json
          score: number
          streak: number
          xp: number
        }
        Insert: {
          answered_count?: number
          best_streak?: number
          completed_at?: string | null
          created_at?: string
          document_id: string
          expires_at: string
          id: string
          questions: Json
          responses?: Json
          score?: number
          streak?: number
          xp?: number
        }
        Update: {
          answered_count?: number
          best_streak?: number
          completed_at?: string | null
          created_at?: string
          document_id?: string
          expires_at?: string
          id?: string
          questions?: Json
          responses?: Json
          score?: number
          streak?: number
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_rush_sessions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cc_business_ratings: {
        Row: {
          average: number | null
          business_id: string | null
          count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cc_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "cc_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_product_ratings: {
        Row: {
          average: number | null
          count: number | null
          product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cc_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cc_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cc_manage_user: {
        Args: { is_blocked: boolean; new_role: string; target: string }
        Returns: undefined
      }
      cc_record_verification: {
        Args: {
          business: string
          id_checked: boolean
          phone_checked: boolean
          reason: string
        }
        Returns: undefined
      }
      cc_review_business: {
        Args: { business: string; decision: string; reason: string }
        Returns: undefined
      }
      cc_signup_slot: { Args: { bucket: string }; Returns: boolean }
      cc_vendor_trust: { Args: { business: string }; Returns: Json }
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

