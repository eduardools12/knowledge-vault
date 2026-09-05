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
      areas: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          position: number
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          position?: number
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          position?: number
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_parent_fk"
            columns: ["user_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      embedding_jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          owner_id: string
          owner_type: Database["public"]["Enums"]["embedding_owner_type"]
          status: Database["public"]["Enums"]["embedding_job_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          owner_id: string
          owner_type: Database["public"]["Enums"]["embedding_owner_type"]
          status?: Database["public"]["Enums"]["embedding_job_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["embedding_owner_type"]
          status?: Database["public"]["Enums"]["embedding_job_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      embeddings: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string
          id: string
          model: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["embedding_owner_type"]
          token_count: number | null
          user_id: string
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          embedding: string
          id?: string
          model: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["embedding_owner_type"]
          token_count?: number | null
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          model?: string
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["embedding_owner_type"]
          token_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      inbox_items: {
        Row: {
          content: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["inbox_kind"]
          knowledge_id: string | null
          note: string | null
          processed_at: string | null
          status: Database["public"]["Enums"]["inbox_status"]
          storage_path: string | null
          title: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["inbox_kind"]
          knowledge_id?: string | null
          note?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["inbox_status"]
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["inbox_kind"]
          knowledge_id?: string | null
          note?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["inbox_status"]
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_knowledge_fk"
            columns: ["user_id", "knowledge_id"]
            isOneToOne: false
            referencedRelation: "knowledge"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      knowledge: {
        Row: {
          archived_at: string | null
          area_id: string | null
          confidence: number | null
          content: Json
          content_text: string
          created_at: string
          difficulty: number | null
          id: string
          last_reviewed_at: string | null
          level: Database["public"]["Enums"]["knowledge_level"]
          next_review_at: string | null
          review_count: number
          search_vector: unknown
          status: Database["public"]["Enums"]["knowledge_status"]
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          area_id?: string | null
          confidence?: number | null
          content?: Json
          content_text?: string
          created_at?: string
          difficulty?: number | null
          id?: string
          last_reviewed_at?: string | null
          level?: Database["public"]["Enums"]["knowledge_level"]
          next_review_at?: string | null
          review_count?: number
          search_vector?: unknown
          status?: Database["public"]["Enums"]["knowledge_status"]
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          area_id?: string | null
          confidence?: number | null
          content?: Json
          content_text?: string
          created_at?: string
          difficulty?: number | null
          id?: string
          last_reviewed_at?: string | null
          level?: Database["public"]["Enums"]["knowledge_level"]
          next_review_at?: string | null
          review_count?: number
          search_vector?: unknown
          status?: Database["public"]["Enums"]["knowledge_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_area_fk"
            columns: ["user_id", "area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      knowledge_projects: {
        Row: {
          created_at: string
          knowledge_id: string
          note: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          knowledge_id: string
          note?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          knowledge_id?: string
          note?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_projects_knowledge_fk"
            columns: ["user_id", "knowledge_id"]
            isOneToOne: false
            referencedRelation: "knowledge"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "knowledge_projects_project_fk"
            columns: ["user_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      knowledge_relations: {
        Row: {
          created_at: string
          from_id: string
          id: string
          note: string | null
          to_id: string
          type: Database["public"]["Enums"]["relation_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          note?: string | null
          to_id: string
          type?: Database["public"]["Enums"]["relation_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          note?: string | null
          to_id?: string
          type?: Database["public"]["Enums"]["relation_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_relations_from_fk"
            columns: ["user_id", "from_id"]
            isOneToOne: false
            referencedRelation: "knowledge"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "knowledge_relations_to_fk"
            columns: ["user_id", "to_id"]
            isOneToOne: false
            referencedRelation: "knowledge"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          created_at: string
          knowledge_id: string
          note: string | null
          source_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          knowledge_id: string
          note?: string | null
          source_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          knowledge_id?: string
          note?: string | null
          source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_knowledge_fk"
            columns: ["user_id", "knowledge_id"]
            isOneToOne: false
            referencedRelation: "knowledge"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "knowledge_sources_source_fk"
            columns: ["user_id", "source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      knowledge_tags: {
        Row: {
          created_at: string
          knowledge_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          knowledge_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          knowledge_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_tags_knowledge_fk"
            columns: ["user_id", "knowledge_id"]
            isOneToOne: false
            referencedRelation: "knowledge"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "knowledge_tags_tag_fk"
            columns: ["user_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          name: string
          slug: string
          started_at: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          name: string
          slug: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          name?: string
          slug?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          confidence: number | null
          difficulty: number | null
          id: string
          knowledge_id: string
          new_level: Database["public"]["Enums"]["knowledge_level"] | null
          next_review_at: string | null
          note: string | null
          previous_level: Database["public"]["Enums"]["knowledge_level"] | null
          reviewed_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          difficulty?: number | null
          id?: string
          knowledge_id: string
          new_level?: Database["public"]["Enums"]["knowledge_level"] | null
          next_review_at?: string | null
          note?: string | null
          previous_level?: Database["public"]["Enums"]["knowledge_level"] | null
          reviewed_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          difficulty?: number | null
          id?: string
          knowledge_id?: string
          new_level?: Database["public"]["Enums"]["knowledge_level"] | null
          next_review_at?: string | null
          note?: string | null
          previous_level?: Database["public"]["Enums"]["knowledge_level"] | null
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_knowledge_fk"
            columns: ["user_id", "knowledge_id"]
            isOneToOne: false
            referencedRelation: "knowledge"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      source_tags: {
        Row: {
          created_at: string
          source_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          source_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          source_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_tags_source_fk"
            columns: ["user_id", "source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "source_tags_tag_fk"
            columns: ["user_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      sources: {
        Row: {
          author: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          published_at: string | null
          search_vector: unknown
          storage_path: string | null
          title: string
          type: Database["public"]["Enums"]["source_type"]
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          author?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          published_at?: string | null
          search_vector?: unknown
          storage_path?: string | null
          title: string
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          author?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          published_at?: string | null
          search_vector?: unknown
          storage_path?: string | null
          title?: string
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dashboard_summary: { Args: never; Returns: Json }
      search_knowledge: {
        Args: {
          filter_area?: string
          filter_level?: Database["public"]["Enums"]["knowledge_level"]
          filter_status?: Database["public"]["Enums"]["knowledge_status"]
          filter_tag?: string
          q_raw?: string
          q_tsquery?: string
          result_limit?: number
        }
        Returns: {
          id: string
          level: Database["public"]["Enums"]["knowledge_level"]
          match_kind: string
          rank: number
          status: Database["public"]["Enums"]["knowledge_status"]
          summary: string
          title: string
          updated_at: string
        }[]
      }
      search_knowledge_semantic: {
        Args: {
          filter_area?: string
          filter_level?: Database["public"]["Enums"]["knowledge_level"]
          filter_status?: Database["public"]["Enums"]["knowledge_status"]
          filter_tag?: string
          query_embedding: string
          result_limit?: number
        }
        Returns: {
          distance: number
          id: string
          level: Database["public"]["Enums"]["knowledge_level"]
          status: Database["public"]["Enums"]["knowledge_status"]
          summary: string
          title: string
          updated_at: string
        }[]
      }
      search_sources: {
        Args: {
          filter_tag?: string
          filter_type?: Database["public"]["Enums"]["source_type"]
          q_raw?: string
          q_tsquery?: string
          result_limit?: number
        }
        Returns: {
          author: string
          created_at: string
          description: string
          id: string
          match_kind: string
          published_at: string
          rank: number
          title: string
          type: Database["public"]["Enums"]["source_type"]
        }[]
      }
      search_sources_semantic: {
        Args: {
          filter_tag?: string
          filter_type?: Database["public"]["Enums"]["source_type"]
          query_embedding: string
          result_limit?: number
        }
        Returns: {
          author: string
          created_at: string
          description: string
          distance: number
          id: string
          published_at: string
          title: string
          type: Database["public"]["Enums"]["source_type"]
        }[]
      }
    }
    Enums: {
      embedding_job_status: "pending" | "processing" | "done" | "error"
      embedding_owner_type: "knowledge" | "source" | "inbox_item"
      inbox_kind: "link" | "note" | "file" | "idea" | "reference"
      inbox_status: "unprocessed" | "in_review" | "processed" | "archived"
      knowledge_level: "discovered" | "understood" | "practiced" | "mastered"
      knowledge_status: "draft" | "active" | "archived"
      project_status: "idea" | "active" | "paused" | "done" | "archived"
      relation_type:
        | "related_to"
        | "depends_on"
        | "example_of"
        | "part_of"
        | "complements"
        | "contradicts"
        | "applies"
        | "originates_from"
      source_type:
        | "article"
        | "book"
        | "pdf"
        | "video"
        | "documentation"
        | "website"
        | "course"
        | "paper"
        | "podcast"
        | "news"
        | "post"
        | "other"
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
    Enums: {
      embedding_job_status: ["pending", "processing", "done", "error"],
      embedding_owner_type: ["knowledge", "source", "inbox_item"],
      inbox_kind: ["link", "note", "file", "idea", "reference"],
      inbox_status: ["unprocessed", "in_review", "processed", "archived"],
      knowledge_level: ["discovered", "understood", "practiced", "mastered"],
      knowledge_status: ["draft", "active", "archived"],
      project_status: ["idea", "active", "paused", "done", "archived"],
      relation_type: [
        "related_to",
        "depends_on",
        "example_of",
        "part_of",
        "complements",
        "contradicts",
        "applies",
        "originates_from",
      ],
      source_type: [
        "article",
        "book",
        "pdf",
        "video",
        "documentation",
        "website",
        "course",
        "paper",
        "podcast",
        "news",
        "post",
        "other",
      ],
    },
  },
} as const
