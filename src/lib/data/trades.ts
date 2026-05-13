import { redirect } from "next/navigation";

import { demoRules, demoTrades } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AiAnalysis, RuleSettings, TradeWithAnalysis } from "@/lib/supabase/types";

export type DashboardMetrics = {
  totalTrades: number;
  winRate: number;
  ruleViolations: number;
  bestSetup: string;
  avgDiscipline: number;
};

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { id: "demo-user", email: "demo@tradeguardian.ai", isDemo: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/v2/login");
  }

  return { id: user.id, email: user.email ?? "", isDemo: false };
}

export async function getTrades(): Promise<TradeWithAnalysis[]> {
  const user = await getSessionUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase || user.isDemo) {
    return demoTrades;
  }

  const { data, error } = await supabase
    .from("trades")
    .select("*, ai_analysis(*)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TradeWithAnalysis[];
}

export async function getTrade(id: string): Promise<TradeWithAnalysis | null> {
  const trades = await getTrades();
  return trades.find((trade) => trade.id === id) ?? null;
}

export async function getRules(): Promise<RuleSettings> {
  const user = await getSessionUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase || user.isDemo) {
    return demoRules;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data, error } = await supabase.from("trading_rules").select("*").eq("user_id", user.id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data as RuleSettings;
  }

  const { data: createdRules, error: createError } = await supabase
    .from("trading_rules")
    .insert({ user_id: user.id })
    .select("*")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return createdRules as RuleSettings;
}

export function getPrimaryAnalysis(trade: TradeWithAnalysis): AiAnalysis | null {
  return trade.ai_analysis?.[0] ?? null;
}

export function calculateDashboardMetrics(trades: TradeWithAnalysis[]): DashboardMetrics {
  const closedTrades = trades.filter((trade) => trade.outcome !== "open");
  const wins = closedTrades.filter((trade) => trade.outcome === "win").length;
  const analyses = trades.map(getPrimaryAnalysis).filter(Boolean) as AiAnalysis[];
  const ruleViolations = analyses.reduce((sum, analysis) => sum + analysis.rule_violations.length, 0);
  const pairCounts = trades.reduce<Record<string, number>>((acc, trade) => {
    acc[trade.pair] = (acc[trade.pair] ?? 0) + 1;
    return acc;
  }, {});
  const bestSetup = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No trades yet";
  const avgDiscipline = analyses.length
    ? Math.round(analyses.reduce((sum, analysis) => sum + analysis.discipline_score, 0) / analyses.length)
    : 0;

  return {
    totalTrades: trades.length,
    winRate: closedTrades.length ? Math.round((wins / closedTrades.length) * 100) : 0,
    ruleViolations,
    bestSetup,
    avgDiscipline,
  };
}
