import { redirect } from "next/navigation";

import { demoRules, demoTrades } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AiAnalysis, RuleSettings, TradeWithAnalysis } from "@/lib/supabase/types";
import { getSystemReviewItems, getSystemReviewScore } from "@/lib/system-review";

export type DashboardMetrics = {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  averageFinalRr: number;
  totalProfitLoss: number;
  ruleViolations: number;
  ruleViolationRate: number;
  bestSetup: string;
  avgDiscipline: number;
  avgChecklistCompletion: number;
  failedRuleTrades: number;
  mostFailedChecklistItem: string;
  needsReviewTrades: number;
  mt5SyncedTrades: number;
  tradesWithoutStopLoss: number;
  tradesWithoutTakeProfit: number;
  systemAlertTrades: number;
  systemAlerts: number;
  averageSystemScore: number;
  averageEstimatedRiskPercent: number;
};

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { id: "demo-user", email: "demo@qyvex.com", isDemo: true };
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
    .order("trade_taken_at", { ascending: false });

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
  const openTrades = trades.filter((trade) => trade.status === "open");
  const closedTrades = trades.filter((trade) => trade.status === "closed");
  const needsReviewTrades = trades.filter((trade) => trade.review_status === "needs_review").length;
  const mt5SyncedTrades = trades.filter((trade) => trade.synced_from_mt5).length;
  const tradesWithoutStopLoss = trades.filter(
    (trade) => trade.synced_from_mt5 && Number(trade.stop_loss ?? 0) <= 0,
  ).length;
  const tradesWithoutTakeProfit = trades.filter(
    (trade) => trade.synced_from_mt5 && Number(trade.take_profit ?? 0) <= 0,
  ).length;
  const systemItemsByTrade = trades.map((trade) => getSystemReviewItems(trade.system_analysis));
  const systemAlertTrades = systemItemsByTrade.filter((items) =>
    items.some((item) => item.status === "failed" || item.status === "warning"),
  ).length;
  const systemAlerts = systemItemsByTrade
    .flat()
    .filter((item) => item.status === "failed" || item.status === "warning").length;
  const tradesWithSystemScores = trades.filter((trade) => getSystemReviewScore(trade.system_analysis) > 0);
  const averageSystemScore = tradesWithSystemScores.length
    ? Math.round(
        tradesWithSystemScores.reduce((sum, trade) => sum + getSystemReviewScore(trade.system_analysis), 0) /
          tradesWithSystemScores.length,
      )
    : 0;
  const tradesWithEstimatedRisk = trades.filter((trade) => trade.estimated_risk_percent !== null);
  const averageEstimatedRiskPercent = tradesWithEstimatedRisk.length
    ? Number(
        (
          tradesWithEstimatedRisk.reduce((sum, trade) => sum + Number(trade.estimated_risk_percent ?? 0), 0) /
          tradesWithEstimatedRisk.length
        ).toFixed(2),
      )
    : 0;
  const wins = closedTrades.filter((trade) => trade.outcome === "win").length;
  const losses = closedTrades.filter((trade) => trade.outcome === "loss").length;
  const breakevens = closedTrades.filter((trade) => trade.outcome === "breakeven").length;
  const analyses = trades.map(getPrimaryAnalysis).filter(Boolean) as AiAnalysis[];
  const ruleViolations = analyses.reduce((sum, analysis) => sum + analysis.rule_violations.length, 0);
  const tradesWithViolations = trades.filter(
    (trade) => (trade.failed_rules?.length ?? 0) > 0 || (getPrimaryAnalysis(trade)?.rule_violations.length ?? 0) > 0,
  ).length;
  const pairCounts = trades.reduce<Record<string, number>>((acc, trade) => {
    acc[trade.pair] = (acc[trade.pair] ?? 0) + 1;
    return acc;
  }, {});
  const bestSetup = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No trades yet";
  const avgDiscipline = analyses.length
    ? Math.round(analyses.reduce((sum, analysis) => sum + analysis.discipline_score, 0) / analyses.length)
    : 0;
  const avgChecklistCompletion = trades.length
    ? Math.round(trades.reduce((sum, trade) => sum + (trade.checklist_completion_rate ?? 0), 0) / trades.length)
    : 0;
  const failedRuleTrades = trades.filter((trade) => (trade.failed_rules?.length ?? 0) > 0).length;
  const failedCounts = trades
    .flatMap((trade) => trade.failed_rules ?? [])
    .reduce<Record<string, number>>((acc, rule) => {
      acc[rule] = (acc[rule] ?? 0) + 1;
      return acc;
    }, {});
  const mostFailedChecklistItem = Object.entries(failedCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No failed rules";
  const closedWithFinalRr = closedTrades.filter((trade) => trade.final_rr !== null);
  const averageFinalRr = closedWithFinalRr.length
    ? Number(
        (
          closedWithFinalRr.reduce((sum, trade) => sum + Number(trade.final_rr ?? 0), 0) / closedWithFinalRr.length
        ).toFixed(2),
      )
    : 0;
  const totalProfitLoss = Number(
    closedTrades.reduce((sum, trade) => sum + Number(trade.profit_loss_amount ?? 0), 0).toFixed(2),
  );

  return {
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    wins,
    losses,
    breakevens,
    winRate: closedTrades.length ? Math.round((wins / closedTrades.length) * 100) : 0,
    averageFinalRr,
    totalProfitLoss,
    ruleViolations,
    ruleViolationRate: trades.length ? Math.round((tradesWithViolations / trades.length) * 100) : 0,
    bestSetup,
    avgDiscipline,
    avgChecklistCompletion,
    failedRuleTrades,
    mostFailedChecklistItem,
    needsReviewTrades,
    mt5SyncedTrades,
    tradesWithoutStopLoss,
    tradesWithoutTakeProfit,
    systemAlertTrades,
    systemAlerts,
    averageSystemScore,
    averageEstimatedRiskPercent,
  };
}
