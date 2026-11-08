// GENERATED from lgn-development Supabase database; never add secrets here.
// Regenerate after changes to policies, tables, triggers or RPCs.

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
      ghost_contribution_reviews: {
        Row: {
          action: string
          contribution_id: string
          created_at: string
          id: string
          note: string
          reviewer_id: string
          version_reviewed: number
        }
        Insert: {
          action: string
          contribution_id: string
          created_at?: string
          id?: string
          note?: string
          reviewer_id: string
          version_reviewed: number
        }
        Update: {
          action?: string
          contribution_id?: string
          created_at?: string
          id?: string
          note?: string
          reviewer_id?: string
          version_reviewed?: number
        }
        Relationships: [
          {
            foreignKeyName: "ghost_contribution_reviews_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "ghost_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      ghost_contribution_reports: {
        Row: {
          id: string
          reporter_id: string
          contribution_id: string | null
          contribution_version: number | null
          subject: string
          body: string
          created_at: string
          outcome: string | null
          moderator_id: string | null
          decision_note: string | null
          decided_at: string | null
        }
        Insert: {
          id?: string
          reporter_id?: string
          contribution_id?: string | null
          contribution_version?: number | null
          subject: string
          body: string
          created_at?: string
          outcome?: string | null
          moderator_id?: string | null
          decision_note?: string | null
          decided_at?: string | null
        }
        Update: {
          id?: string
          reporter_id?: string
          contribution_id?: string | null
          contribution_version?: number | null
          subject?: string
          body?: string
          created_at?: string
          outcome?: string | null
          moderator_id?: string | null
          decision_note?: string | null
          decided_at?: string | null
        }
        Relationships: [{
          foreignKeyName: "ghost_contribution_reports_contribution_id_fkey"
          columns: ["contribution_id"]
          isOneToOne: false
          referencedRelation: "ghost_contributions"
          referencedColumns: ["id"]
        }]
      }
      ghost_contribution_revisions: {
        Row: {
          body: string
          code: string
          contribution_id: string
          created_at: string
          id: string
          owner_id: string
          reason: string
          status: string
          summary: string
          title: string
          version: number
        }
        Insert: {
          body: string
          code: string
          contribution_id: string
          created_at?: string
          id?: string
          owner_id: string
          reason: string
          status: string
          summary: string
          title: string
          version: number
        }
        Update: {
          body?: string
          code?: string
          contribution_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          reason?: string
          status?: string
          summary?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ghost_contribution_revisions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "ghost_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      ghost_contribution_triage: {
        Row: {
          contribution_id: string
          created_at: string
          policy_version: string
          recommendation: string
          resolution: string
          resolution_note: string
          resolved_at: string | null
          resolved_by: string | null
          signals: Json
          version: number
        }
        Insert: {
          contribution_id: string
          created_at?: string
          policy_version?: string
          recommendation: string
          resolution?: string
          resolution_note?: string
          resolved_at?: string | null
          resolved_by?: string | null
          signals?: Json
          version: number
        }
        Update: {
          contribution_id?: string
          created_at?: string
          policy_version?: string
          recommendation?: string
          resolution?: string
          resolution_note?: string
          resolved_at?: string | null
          resolved_by?: string | null
          signals?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ghost_contribution_triage_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "ghost_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      ghost_contribution_text_attachments: {
        Row: {
          id: string
          contribution_id: string
          version: number
          filename: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          contribution_id: string
          version: number
          filename: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          contribution_id?: string
          version?: number
          filename?: string
          content?: string
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_contribution_text_attachments_contribution_id_fkey"
          columns: ["contribution_id"]
          isOneToOne: false
          referencedRelation: "ghost_contributions"
          referencedColumns: ["id"]
        }]
      }
      ghost_contribution_translations: {
        Row: {
          id: string
          contribution_id: string
          version: number
          language: string
          title: string
          summary: string
          body: string
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          contribution_id: string
          version: number
          language: string
          title: string
          summary?: string
          body?: string
          source: string
          created_at?: string
        }
        Update: {
          id?: string
          contribution_id?: string
          version?: number
          language?: string
          title?: string
          summary?: string
          body?: string
          source?: string
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_contribution_translations_contribution_id_fkey"
          columns: ["contribution_id"]
          isOneToOne: false
          referencedRelation: "ghost_contributions"
          referencedColumns: ["id"]
        }]
      }
      ghost_contributions: {
        Row: {
          body: string
          code: string
          created_at: string
          deleted_at: string | null
          domain: string
          id: string
          kind: string
          language: string
          owner_id: string
          profile_id: string
          published_at: string | null
          source_url: string
          status: string
          submitted_at: string | null
          summary: string
          tags: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          body?: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          domain?: string
          id?: string
          kind?: string
          language?: string
          owner_id: string
          profile_id: string
          published_at?: string | null
          source_url?: string
          status?: string
          submitted_at?: string | null
          summary?: string
          tags?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          domain?: string
          id?: string
          kind?: string
          language?: string
          owner_id?: string
          profile_id?: string
          published_at?: string | null
          source_url?: string
          status?: string
          submitted_at?: string | null
          summary?: string
          tags?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ghost_contributions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "ghost_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ghost_profile_links: {
        Row: {
          created_at: string
          owner_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          owner_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghost_profile_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "ghost_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ghost_profile_preferences: {
        Row: {
          allow_recruiter_contact: boolean
          always_show_original: boolean
          auto_translate: boolean
          avatar_visibility: string
          created_at: string
          never_translate_technical: boolean
          preferred_publication_language: string
          preferred_translation_language: string
          show_external_identities: boolean
          show_language_proficiency: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_recruiter_contact?: boolean
          always_show_original?: boolean
          auto_translate?: boolean
          avatar_visibility?: string
          created_at?: string
          never_translate_technical?: boolean
          preferred_publication_language?: string
          preferred_translation_language?: string
          show_external_identities?: boolean
          show_language_proficiency?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_recruiter_contact?: boolean
          always_show_original?: boolean
          auto_translate?: boolean
          avatar_visibility?: string
          created_at?: string
          never_translate_technical?: boolean
          preferred_publication_language?: string
          preferred_translation_language?: string
          show_external_identities?: boolean
          show_language_proficiency?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ghost_projects: {
        Row: {
          id: string
          profile_id: string
          title: string
          summary: string
          visibility: string
          status: string
          recruiting: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          summary?: string
          visibility?: string
          status?: string
          recruiting?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          summary?: string
          visibility?: string
          status?: string
          recruiting?: boolean
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_projects_profile_id_fkey"
          columns: ["profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }]
      }
      ghost_project_roles: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string
          is_open: boolean
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string
          is_open?: boolean
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string
          is_open?: boolean
        }
        Relationships: [{
          foreignKeyName: "ghost_project_roles_project_id_fkey"
          columns: ["project_id"]
          isOneToOne: false
          referencedRelation: "ghost_projects"
          referencedColumns: ["id"]
        }]
      }
      ghost_project_milestones: {
        Row: {
          id: string
          project_id: string
          title: string
          due_on: string | null
          completed: boolean
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          due_on?: string | null
          completed?: boolean
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          due_on?: string | null
          completed?: boolean
        }
        Relationships: [{
          foreignKeyName: "ghost_project_milestones_project_id_fkey"
          columns: ["project_id"]
          isOneToOne: false
          referencedRelation: "ghost_projects"
          referencedColumns: ["id"]
        }]
      }
      ghost_project_watches: {
        Row: {
          project_id: string
          profile_id: string
        }
        Insert: {
          project_id: string
          profile_id: string
        }
        Update: {
          project_id?: string
          profile_id?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_project_watches_project_id_fkey"
          columns: ["project_id"]
          isOneToOne: false
          referencedRelation: "ghost_projects"
          referencedColumns: ["id"]
        }, {
          foreignKeyName: "ghost_project_watches_profile_id_fkey"
          columns: ["profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }]
      }
      ghost_project_members: {
        Row: {
          project_id: string
          profile_id: string
          status: string
          role_id: string | null
          created_at: string
        }
        Insert: {
          project_id: string
          profile_id: string
          status?: string
          role_id?: string | null
          created_at?: string
        }
        Update: {
          project_id?: string
          profile_id?: string
          status?: string
          role_id?: string | null
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_project_members_project_id_fkey"
          columns: ["project_id"]
          isOneToOne: false
          referencedRelation: "ghost_projects"
          referencedColumns: ["id"]
        }, {
          foreignKeyName: "ghost_project_members_profile_id_fkey"
          columns: ["profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }, {
          foreignKeyName: "ghost_project_members_role_fkey"
          columns: ["project_id", "role_id"]
          isOneToOne: false
          referencedRelation: "ghost_project_roles"
          referencedColumns: ["project_id", "id"]
        }]
      }
      ghost_project_tasks: {
        Row: {
          id: string
          project_id: string
          assigned_profile_id: string | null
          title: string
          description: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          assigned_profile_id?: string | null
          title: string
          description?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          assigned_profile_id?: string | null
          title?: string
          description?: string
          status?: string
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_project_tasks_project_id_fkey"
          columns: ["project_id"]
          isOneToOne: false
          referencedRelation: "ghost_projects"
          referencedColumns: ["id"]
        }, {
          foreignKeyName: "ghost_project_tasks_membership_fkey"
          columns: ["project_id", "assigned_profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_project_members"
          referencedColumns: ["project_id", "profile_id"]
        }]
      }
      ghost_project_updates: {
        Row: { id: string; project_id: string; title: string; body: string; created_at: string }
        Insert: { id?: string; project_id: string; title: string; body: string; created_at?: string }
        Update: { id?: string; project_id?: string; title?: string; body?: string; created_at?: string }
        Relationships: [{
          foreignKeyName: "ghost_project_updates_project_id_fkey"
          columns: ["project_id"]
          isOneToOne: false
          referencedRelation: "ghost_projects"
          referencedColumns: ["id"]
        }]
      }
      ghost_table_talks: {
        Row: {
          id: string
          profile_id: string
          title: string
          summary: string
          status: string
          scheduled_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          summary?: string
          status?: string
          scheduled_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          summary?: string
          status?: string
          scheduled_at?: string | null
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_table_talks_profile_id_fkey"
          columns: ["profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }]
      }
      ghost_table_talk_members: {
        Row: {
          talk_id: string
          profile_id: string
          role: string
        }
        Insert: {
          talk_id: string
          profile_id: string
          role?: string
        }
        Update: {
          talk_id?: string
          profile_id?: string
          role?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_table_talk_members_talk_id_fkey"
          columns: ["talk_id"]
          isOneToOne: false
          referencedRelation: "ghost_table_talks"
          referencedColumns: ["id"]
        }, {
          foreignKeyName: "ghost_table_talk_members_profile_id_fkey"
          columns: ["profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }]
      }
      ghost_table_talk_materials: {
        Row: {
          talk_id: string
          objectives: string
          scenario: string
          timeline: string
          injects: string
          evidence: string
          decision_points: string
        }
        Insert: {
          talk_id: string
          objectives?: string
          scenario?: string
          timeline?: string
          injects?: string
          evidence?: string
          decision_points?: string
        }
        Update: {
          talk_id?: string
          objectives?: string
          scenario?: string
          timeline?: string
          injects?: string
          evidence?: string
          decision_points?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_table_talk_materials_talk_id_fkey"
          columns: ["talk_id"]
          isOneToOne: true
          referencedRelation: "ghost_table_talks"
          referencedColumns: ["id"]
        }]
      }
      ghost_table_talk_debriefs: {
        Row: {
          talk_id: string
          body: string
        }
        Insert: {
          talk_id: string
          body: string
        }
        Update: {
          talk_id?: string
          body?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_table_talk_debriefs_talk_id_fkey"
          columns: ["talk_id"]
          isOneToOne: true
          referencedRelation: "ghost_table_talks"
          referencedColumns: ["id"]
        }]
      }
      ghost_table_talk_decisions: {
        Row: {
          id: string
          talk_id: string
          profile_id: string
          point: string
          decision: string
          rationale: string
          created_at: string
        }
        Insert: {
          id?: string
          talk_id: string
          profile_id: string
          point: string
          decision: string
          rationale?: string
          created_at?: string
        }
        Update: {
          id?: string
          talk_id?: string
          profile_id?: string
          point?: string
          decision?: string
          rationale?: string
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_table_talk_decisions_talk_id_fkey"
          columns: ["talk_id"]
          isOneToOne: false
          referencedRelation: "ghost_table_talks"
          referencedColumns: ["id"]
        }, {
          foreignKeyName: "ghost_table_talk_decisions_profile_id_fkey"
          columns: ["profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }]
      }
      ghost_collaboration_requests: {
        Row: {
          id: string
          sender_profile_id: string
          recipient_profile_id: string
          subject: string
          message: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_profile_id: string
          recipient_profile_id: string
          subject: string
          message: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_profile_id?: string
          recipient_profile_id?: string
          subject?: string
          message?: string
          status?: string
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_collaboration_requests_sender_profile_id_fkey"
          columns: ["sender_profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }, {
          foreignKeyName: "ghost_collaboration_requests_recipient_profile_id_fkey"
          columns: ["recipient_profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }]
      }
      ghost_saved_searches: {
        Row: {
          id: string
          profile_id: string
          name: string
          query: string
          collaboration_only: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          name: string
          query?: string
          collaboration_only?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          name?: string
          query?: string
          collaboration_only?: boolean
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_saved_searches_profile_id_fkey"
          columns: ["profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }]
      }
      ghost_notifications: {
        Row: {
          id: string
          profile_id: string
          category: string
          type: string
          title: string
          body: string
          link: string
          read: boolean
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          category: string
          type: string
          title: string
          body?: string
          link: string
          read?: boolean
          archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          category?: string
          type?: string
          title?: string
          body?: string
          link?: string
          read?: boolean
          archived?: boolean
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "ghost_notifications_profile_id_fkey"
          columns: ["profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }]
      }
      ghost_notification_preferences: {
        Row: {
          profile_id: string
          contributions: boolean
          projects: boolean
          table_talks: boolean
          collaboration: boolean
          following: boolean
        }
        Insert: {
          profile_id: string
          contributions?: boolean
          projects?: boolean
          table_talks?: boolean
          collaboration?: boolean
          following?: boolean
        }
        Update: {
          profile_id?: string
          contributions?: boolean
          projects?: boolean
          table_talks?: boolean
          collaboration?: boolean
          following?: boolean
        }
        Relationships: [{
          foreignKeyName: "ghost_notification_preferences_profile_id_fkey"
          columns: ["profile_id"]
          isOneToOne: true
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }]
      }
      ghost_follows: {
        Row: { follower_profile_id: string; followed_profile_id: string; created_at: string }
        Insert: { follower_profile_id: string; followed_profile_id: string; created_at?: string }
        Update: { follower_profile_id?: string; followed_profile_id?: string; created_at?: string }
        Relationships: [{
          foreignKeyName: "ghost_follows_follower_profile_id_fkey"
          columns: ["follower_profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }, {
          foreignKeyName: "ghost_follows_followed_profile_id_fkey"
          columns: ["followed_profile_id"]
          isOneToOne: false
          referencedRelation: "ghost_profiles"
          referencedColumns: ["id"]
        }]
      }
      ghost_profiles: {
        Row: {
          available_for_work: boolean
          avatar_template: string
          bio: string
          collaboration_interests: string
          created_at: string
          deleted_at: string | null
          developing_specialties: string
          display_name: string
          external_links: string
          featured_work: string
          handle: string
          id: string
          industry: string
          language: string
          languages: string
          location_country: string
          location_disclosure: string
          open_to_collaboration: boolean
          open_to_mentorship: boolean
          open_to_research: boolean
          open_to_speaking: boolean
          owner_id: string
          platform: string
          portfolio: string
          pronouns: string
          skills: string
          specialties: string
          tools: string
          updated_at: string
        }
        Insert: {
          available_for_work?: boolean
          avatar_template?: string
          bio?: string
          collaboration_interests?: string
          created_at?: string
          deleted_at?: string | null
          developing_specialties?: string
          display_name?: string
          external_links?: string
          featured_work?: string
          handle: string
          id?: string
          industry?: string
          language?: string
          languages?: string
          location_country?: string
          location_disclosure?: string
          open_to_collaboration?: boolean
          open_to_mentorship?: boolean
          open_to_research?: boolean
          open_to_speaking?: boolean
          owner_id: string
          platform?: string
          portfolio?: string
          pronouns?: string
          skills?: string
          specialties?: string
          tools?: string
          updated_at?: string
        }
        Update: {
          available_for_work?: boolean
          avatar_template?: string
          bio?: string
          collaboration_interests?: string
          created_at?: string
          deleted_at?: string | null
          developing_specialties?: string
          display_name?: string
          external_links?: string
          featured_work?: string
          handle?: string
          id?: string
          industry?: string
          language?: string
          languages?: string
          location_country?: string
          location_disclosure?: string
          open_to_collaboration?: boolean
          open_to_mentorship?: boolean
          open_to_research?: boolean
          open_to_speaking?: boolean
          owner_id?: string
          platform?: string
          portfolio?: string
          pronouns?: string
          skills?: string
          specialties?: string
          tools?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_assigned_project_task_status: {
        Args: { p_task_id: string; p_expected_status: string; p_status: string }
        Returns: boolean
      }
      can_moderate_reports: { Args: never; Returns: boolean }
      can_review_contributions: { Args: never; Returns: boolean }
      delete_ghost_contribution: {
        Args: { p_contribution_id: string; p_expected_version: number }
        Returns: boolean
      }
      resolve_contribution_report: {
        Args: { p_report_id: string; p_outcome: string; p_note: string }
        Returns: boolean
      }
      review_ghost_contribution: {
        Args: {
          p_action: string
          p_contribution_id: string
          p_expected_version: number
          p_note?: string
        }
        Returns: string
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
