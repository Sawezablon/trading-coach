export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TradeOutcome = "win" | "loss" | "breakeven" | "open";
export type TradeDirection = "long" | "short";

export type Trade = {
  id: string;
  user_id: string;
  pair: string;
  direction: TradeDirection;
  risk_percent: number;
  rr: number;
  session: string;
  emotions: string;
  notes: string;
  confirmation: boolean;
  outcome: TradeOutcome;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
};

export type RuleSettings = {
  id: string;
  user_id: string;
  max_risk_percent: number;
  min_rr: number;
  allowed_sessions: string[];
  confirmation_required: boolean;
  max_trades_per_day: number;
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

export type TradeWithAnalysis = Trade & {
  ai_analysis?: AiAnalysis[];
};

export type Database = {
  public: {
    Tables: {
      trades: {
        Row: Trade;
        Insert: Partial<Trade> &
          Pick<Trade, "user_id" | "pair" | "risk_percent" | "rr" | "session" | "emotions" | "notes">;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
