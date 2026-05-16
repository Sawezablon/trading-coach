export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TradeStatus = "open" | "closed";
export type TradeResult = "pending" | "win" | "loss" | "breakeven";
export type TradeDirection = "long" | "short";
export type TradeReviewStatus = "needs_review" | "reviewed";

export type Trade = {
  id: string;
  user_id: string;
  pair: string;
  direction: TradeDirection;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_percent: number;
  rr: number;
  session: string;
  emotions: string;
  notes: string;
  confirmation: boolean;
  status: TradeStatus;
  outcome: TradeResult;
  closed_at: string | null;
  close_price: number | null;
  profit_loss_percent: number | null;
  profit_loss_amount: number | null;
  final_rr: number | null;
  closing_notes: string | null;
  review_status: TradeReviewStatus;
  review_completed_at: string | null;
  lot_size: number | null;
  commission: number | null;
  swap: number | null;
  screenshot_url: string | null;
  checklist_results: ChecklistItemResult[];
  passed_rules: string[];
  failed_rules: string[];
  checklist_completion_rate: number;
  discipline_score: number;
  trade_taken_at: string;
  trade_timezone: string;
  mt5_ticket: string | null;
  mt5_account: string | null;
  mt5_broker: string | null;
  mt5_connection_id: string | null;
  synced_from_mt5: boolean;
  last_synced_at: string | null;
  mt5_raw_data: Json | null;
  created_at: string;
  updated_at: string;
};

export type RuleSettings = {
  id: string;
  user_id: string;
  max_risk_percent: number;
  min_rr: number;
  allowed_sessions: string[];
  allowed_pairs: string[];
  allowed_directions: TradeDirection[];
  confirmation_required: boolean;
  require_screenshot: boolean;
  max_trades_per_day: number;
  strict_mode: boolean;
  custom_rules: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AiAnalysis = {
  id: string;
  trade_id: string;
  user_id: string;
  setup_quality_score: number;
  discipline_score: number;
  strengths: string[];
  weaknesses: string[];
  detected_mistakes: string[];
  rule_violations: string[];
  emotional_observations: string[];
  improvement_suggestions: string[];
  recurring_mistakes: string[];
  model: string;
  created_at: string;
};

export type Mt5Connection = {
  id: string;
  user_id: string;
  api_key_hash: string;
  account_number: string | null;
  broker: string | null;
  account_nickname: string;
  prop_firm: string | null;
  last_sync_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Mt5SyncRequest = {
  id: string;
  user_id: string;
  mt5_connection_id: string | null;
  account_number: string | null;
  lookback_days: number;
  status: "pending" | "completed";
  requested_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChecklistItemResult = {
  id: string;
  label: string;
  status: "passed" | "failed" | "unchecked";
  required: boolean;
  type: "auto" | "manual";
};

export type TradeWithAnalysis = Trade & {
  ai_analysis?: AiAnalysis[];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          selected_mt5_connection_id: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          selected_mt5_connection_id?: string | null;
          timezone?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          selected_mt5_connection_id?: string | null;
          timezone?: string;
        };
        Relationships: [];
      };
      trades: {
        Row: Trade;
        Insert: Partial<Trade> &
          Pick<
            Trade,
            | "user_id"
            | "pair"
            | "risk_percent"
            | "rr"
            | "session"
            | "emotions"
            | "notes"
            | "trade_taken_at"
            | "trade_timezone"
          >;
        Update: Partial<Trade>;
        Relationships: [];
      };
      trading_rules: {
        Row: RuleSettings;
        Insert: Partial<RuleSettings> & Pick<RuleSettings, "user_id">;
        Update: Partial<RuleSettings>;
        Relationships: [];
      };
      ai_analysis: {
        Row: AiAnalysis;
        Insert: Partial<AiAnalysis> &
          Pick<
            AiAnalysis,
            | "trade_id"
            | "user_id"
            | "setup_quality_score"
            | "discipline_score"
            | "strengths"
            | "weaknesses"
            | "detected_mistakes"
            | "rule_violations"
            | "emotional_observations"
            | "improvement_suggestions"
            | "recurring_mistakes"
          >;
        Update: Partial<AiAnalysis>;
        Relationships: [];
      };
      mt5_connections: {
        Row: Mt5Connection;
        Insert: Partial<Mt5Connection> & Pick<Mt5Connection, "user_id" | "api_key_hash">;
        Update: Partial<Mt5Connection>;
        Relationships: [];
      };
      mt5_sync_requests: {
        Row: Mt5SyncRequest;
        Insert: Partial<Mt5SyncRequest> & Pick<Mt5SyncRequest, "user_id" | "lookback_days">;
        Update: Partial<Mt5SyncRequest>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
