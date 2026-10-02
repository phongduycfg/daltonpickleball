/**
 * Kiểu dữ liệu Supabase, viết theo đúng định dạng của `supabase gen types typescript`.
 * Khớp với supabase/migrations/20261001000000_init.sql.
 * Khi đổi schema: chạy `npm run db:types` để sinh lại và đối chiếu.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = 'admin' | 'accountant' | 'scorer' | 'member';
export type MemberStatus = 'pending' | 'active' | 'rejected';
export type SessionStatus = 'scheduled' | 'live' | 'closed';
export type LedgerKind = 'expense' | 'income';
export type PayStatus = 'none' | 'pending' | 'done';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
          role: AppRole;
          status: MemberStatus;
          skill: number;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: { display_name?: string; avatar_url?: string | null };
        Relationships: [];
      };
      club_settings: {
        Row: {
          id: boolean;
          club_name: string;
          fixed_rate: number;
          min_sessions: number;
          bank_bin: string | null;
          bank_account_no: string | null;
          bank_owner: string | null;
          transfer_syntax: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      venues: {
        Row: { id: string; name: string; area: string; default_cost: number; is_active: boolean; sort_order: number; created_at: string };
        Insert: { id?: string; name: string; area?: string; default_cost: number; is_active?: boolean; sort_order?: number };
        Update: { name?: string; area?: string; default_cost?: number; is_active?: boolean; sort_order?: number };
        Relationships: [];
      };
      periods: {
        Row: {
          id: string;
          seq: number;
          start_date: string;
          end_date: string | null;
          plan: number;
          fixed_rate: number;
          opened_at: string;
          closed_at: string | null;
          closed_by: string | null;
          snapshot: Json | null;
        };
        Insert: never;
        Update: { plan?: number };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          period_id: string;
          venue_id: string;
          play_date: string;
          start_time: string;
          end_time: string;
          cost: number;
          status: SessionStatus;
          seq: number | null;
          started_at: string | null;
          ended_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          period_id: string;
          venue_id: string;
          play_date: string;
          start_time: string;
          end_time: string;
          cost: number;
          created_by?: string | null;
        };
        Update: { cost?: number; venue_id?: string; play_date?: string; start_time?: string; end_time?: string };
        Relationships: [];
      };
      session_results: {
        Row: { session_id: string; member_id: string; losses: number; updated_by: string | null; updated_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      ledger_items: {
        Row: {
          id: string;
          period_id: string;
          kind: LedgerKind;
          description: string;
          amount: number;
          member_id: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: { period_id: string; kind: LedgerKind; description: string; amount: number; member_id: string; created_by?: string | null };
        Update: never;
        Relationships: [];
      };
      period_exclusions: {
        Row: { period_id: string; member_id: string };
        Insert: { period_id: string; member_id: string };
        Update: never;
        Relationships: [];
      };
      payments: {
        Row: {
          period_id: string;
          member_id: string;
          status: PayStatus;
          reported_at: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; created_at: string };
        Insert: { user_id: string; endpoint: string; p256dh: string; auth: string };
        Update: { p256dh?: string; auth?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      my_role: { Args: Record<string, never>; Returns: AppRole | null };
      is_member: { Args: Record<string, never>; Returns: boolean };
      adjust_loss: { Args: { p_session: string; p_member: string; p_delta: number }; Returns: number };
      set_attendance: { Args: { p_session: string; p_member: string; p_present: boolean }; Returns: undefined };
      start_session: { Args: { p_session: string }; Returns: undefined };
      end_session: { Args: { p_session: string }; Returns: undefined };
      reopen_session: { Args: { p_session: string }; Returns: undefined };
      delete_session: { Args: { p_session: string }; Returns: undefined };
      create_past_session: {
        Args: { p_venue: string; p_date: string; p_start: string; p_end: string; p_cost: number };
        Returns: string;
      };
      report_payment: { Args: { p_period: string }; Returns: undefined };
      set_payment_status: { Args: { p_period: string; p_member: string; p_status: PayStatus }; Returns: undefined };
      admin_update_member: {
        Args: { p_member: string; p_role: AppRole; p_status: MemberStatus; p_skill: number };
        Returns: undefined;
      };
      update_bank_settings: {
        Args: { p_bin: string; p_account_no: string; p_owner: string; p_syntax: string };
        Returns: undefined;
      };
      update_general_settings: {
        Args: { p_club_name: string; p_fixed_rate: number; p_min_sessions: number };
        Returns: undefined;
      };
      close_period: { Args: { p_period: string; p_snapshot: Json }; Returns: string };
      app_snapshot: { Args: Record<string, never>; Returns: Json };
    };
    Enums: {
      app_role: AppRole;
      member_status: MemberStatus;
      session_status: SessionStatus;
      ledger_kind: LedgerKind;
      pay_status: PayStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
