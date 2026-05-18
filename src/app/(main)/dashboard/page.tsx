import type React from "react";

import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

import { Mt5AccountSwitcher } from "@/components/mt5-account-switcher";
import { TradeOutcomeBadge, TradeReviewBadge, TradeStatusBadge } from "@/components/trade-lifecycle-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getMt5AccountContext, type Mt5ConnectionStatus } from "@/lib/data/mt5";
import { getActivePerformancePlan, getPerformancePlans } from "@/lib/data/performance-plans";
import { calculateDashboardMetrics, getPrimaryAnalysis, getTrades } from "@/lib/data/trades";
import { getEmotionRisk, parseEmotionValues } from "@/lib/emotions";
import { formatTradeDateTime } from "@/lib/format-trade-time";
import { getMt5ConnectionLabel } from "@/lib/mt5-label";
import type { PerformancePlan, TradeWithAnalysis } from "@/lib/supabase/types";
import { getSystemReviewItems, getSystemReviewScore } from "@/lib/system-review";

export const dynamic = "force-dynamic";

type CountItem = {
  label: string;
  count: number;
};

function getFilteredTrades({
  selectedConnectionId,
  trades,
}: {
  selectedConnectionId: string | null;
  trades: TradeWithAnalysis[];
}) {
  return trades.filter((trade) => !selectedConnectionId || trade.mt5_connection_id === selectedConnectionId);
}

function getTradeDiscipline(trade: TradeWithAnalysis) {
  return trade.discipline_score ?? getPrimaryAnalysis(trade)?.discipline_score ?? 0;
}

function getTradeIntelligenceScore(trade: TradeWithAnalysis) {
  const scores: number[] = [];
  const systemScore = getSystemReviewScore(trade.system_analysis);
  const checklistScore = trade.checklist_completion_rate ?? 0;

  if (systemScore > 0) {
    scores.push(systemScore);
  }

  if (checklistScore > 0) {
    scores.push(checklistScore);
  }

  scores.push(trade.review_status === "reviewed" ? 100 : 35);

  const emotionValues = parseEmotionValues(trade.emotions);
  if (emotionValues.length) {
    const emotionRisk = getEmotionRisk(trade.emotions);
    scores.push(emotionRisk === "high-risk" ? 35 : emotionRisk === "warning" ? 70 : 100);
  }

  return average(scores);
}

function getUserChecklistItems(trade: TradeWithAnalysis) {
  return (trade.checklist_results ?? []).filter((item) => item.type === "manual");
}

function getUserChecklistScore(trade: TradeWithAnalysis) {
  const items = getUserChecklistItems(trade);

  if (!items.length) {
    return null;
  }

  return Math.round((items.filter((item) => item.status === "passed").length / items.length) * 100);
}

function getDashboardUserChecklistState(trades: TradeWithAnalysis[]) {
  const scores = trades.map(getUserChecklistScore).filter((score): score is number => score !== null);

  return {
    hasData: scores.length > 0,
    reviewedCount: scores.length,
    score: scores.length ? average(scores) : 0,
    totalCount: trades.length,
  };
}

function weightedAverage(parts: { score: number; weight: number }[]) {
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round(parts.reduce((sum, part) => sum + part.score * part.weight, 0) / totalWeight);
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isToday(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toDateString() === new Date().toDateString();
}

function countBy(items: string[]) {
  return Object.entries(
    items.reduce<Record<string, number>>((counts, item) => {
      counts[item] = (counts[item] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function formatSignedPercent(value: number) {
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function formatSignedMoney(value: number) {
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function formatUnsignedPercent(value: number) {
  return `${Number(Math.abs(value).toFixed(2))}%`;
}

function getMonthLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date);
}

function isCurrentMonth(value: string) {
  const date = new Date(value);
  const now = new Date();

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function getTradeProfitPercent(trade: TradeWithAnalysis) {
  if (trade.profit_loss_percent !== null) {
    return Number(trade.profit_loss_percent);
  }

  const balance = Number(trade.account_balance_at_sync ?? 0);
  const profit = Number(trade.profit_loss_amount ?? 0);

  return balance > 0 ? (profit / balance) * 100 : 0;
}

function tradeHasRulePressure(trade: TradeWithAnalysis) {
  return getTradeRulePressureLabels(trade).length > 0;
}

function getTradeRulePressureLabels(trade: TradeWithAnalysis) {
  const systemItems = getSystemReviewItems(trade.system_analysis);
  const systemAlerts = systemItems
    .filter((item) => item.status === "failed" || item.status === "warning")
    .map((item) => item.label);
  const failedRules = trade.failed_rules ?? [];
  const aiViolations = getPrimaryAnalysis(trade)?.rule_violations ?? [];

  return [...systemAlerts, ...failedRules, ...aiViolations].filter(Boolean);
}

function getRulePressureSummary(trades: TradeWithAnalysis[]) {
  const rulePressureTrades = trades.filter(tradeHasRulePressure).length;
  const failedRuleCounts = countBy(trades.flatMap(getTradeRulePressureLabels));
  const adherence = trades.length ? Math.round(((trades.length - rulePressureTrades) / trades.length) * 100) : 100;

  return {
    adherence,
    failedRuleCounts,
    mostFailedRule: failedRuleCounts[0]?.label ?? "No recurring rule break",
    rulePressureTrades,
  };
}

function getLosingStreak(trades: TradeWithAnalysis[]) {
  let streak = 0;

  for (const trade of trades) {
    if (trade.status !== "closed") {
      continue;
    }

    if (trade.outcome !== "loss") {
      break;
    }

    streak += 1;
  }

  return streak;
}

function buildPairPerformance(trades: TradeWithAnalysis[]) {
  return Object.values(
    trades.reduce<
      Record<
        string,
        { label: string; losses: number; profit: number; rulePressureTrades: number; trades: number; wins: number }
      >
    >((pairs, trade) => {
      const label = trade.pair || "Unknown";
      pairs[label] ??= { label, losses: 0, profit: 0, rulePressureTrades: 0, trades: 0, wins: 0 };
      pairs[label].trades += 1;
      pairs[label].profit += Number(trade.profit_loss_amount ?? 0);
      if (tradeHasRulePressure(trade)) {
        pairs[label].rulePressureTrades += 1;
      }
      if (trade.outcome === "win") {
        pairs[label].wins += 1;
      }
      if (trade.outcome === "loss") {
        pairs[label].losses += 1;
      }
      return pairs;
    }, {}),
  ).sort((left, right) => right.profit - left.profit);
}

function getMonthlyPerformanceModel(trades: TradeWithAnalysis[], plan: PerformancePlan) {
  const monthTrades = trades.filter((trade) => isCurrentMonth(trade.trade_taken_at));
  const closedTrades = monthTrades.filter((trade) => trade.status === "closed");
  const wins = closedTrades.filter((trade) => trade.outcome === "win").length;
  const losses = closedTrades.filter((trade) => trade.outcome === "loss").length;
  const breakevens = closedTrades.filter((trade) => trade.outcome === "breakeven").length;
  const openTrades = monthTrades.filter((trade) => trade.status === "open").length;
  const winRate = closedTrades.length ? Math.round((wins / closedTrades.length) * 100) : 0;
  const profitAmount = Number(
    closedTrades.reduce((sum, trade) => sum + Number(trade.profit_loss_amount ?? 0), 0).toFixed(2),
  );
  const profitPercent = Number(closedTrades.reduce((sum, trade) => sum + getTradeProfitPercent(trade), 0).toFixed(2));
  const tradeProgress = plan.max_trades_per_month ? clamp((monthTrades.length / plan.max_trades_per_month) * 100) : 0;
  const profitProgress = plan.monthly_profit_target_percent
    ? clamp((profitPercent / plan.monthly_profit_target_percent) * 100)
    : 0;
  const lossProgress = plan.max_monthly_loss_percent
    ? clamp((Math.abs(Math.min(profitPercent, 0)) / plan.max_monthly_loss_percent) * 100)
    : 0;
  const reviewCompletion = monthTrades.length
    ? Math.round((monthTrades.filter((trade) => trade.review_status === "reviewed").length / monthTrades.length) * 100)
    : 0;
  const tradesRemaining = Math.max(0, plan.max_trades_per_month - monthTrades.length);
  const lossesRemaining = Math.max(0, plan.max_losses_per_month - losses);
  const profitGap = Number(Math.max(0, plan.monthly_profit_target_percent - profitPercent).toFixed(2));
  const estimatedWinPercent = plan.risk_per_trade_percent * plan.target_rr;
  const winsNeeded = estimatedWinPercent > 0 ? Math.ceil(profitGap / estimatedWinPercent) : 0;
  const avgWinPercent = wins
    ? closedTrades
        .filter((trade) => trade.outcome === "win")
        .reduce((sum, trade) => sum + getTradeProfitPercent(trade), 0) / wins
    : 0;
  const avgLossPercent = losses
    ? Math.abs(
        closedTrades
          .filter((trade) => trade.outcome === "loss")
          .reduce((sum, trade) => sum + getTradeProfitPercent(trade), 0) / losses,
      )
    : 0;
  const expectancy = Number(
    closedTrades.length ? ((winRate / 100) * avgWinPercent - ((100 - winRate) / 100) * avgLossPercent).toFixed(2) : 0,
  );
  const ruleFollowingProfit = Number(
    closedTrades
      .filter((trade) => !tradeHasRulePressure(trade))
      .reduce((sum, trade) => sum + Number(trade.profit_loss_amount ?? 0), 0)
      .toFixed(2),
  );
  const rulePressureProfit = Number(
    closedTrades
      .filter(tradeHasRulePressure)
      .reduce((sum, trade) => sum + Number(trade.profit_loss_amount ?? 0), 0)
      .toFixed(2),
  );
  const rulePressureTrades = closedTrades.filter(tradeHasRulePressure);
  const ruleFollowingTrades = closedTrades.filter((trade) => !tradeHasRulePressure(trade));
  const losingStreak = getLosingStreak(monthTrades);
  const pairPerformance = buildPairPerformance(closedTrades);
  const bestPair = pairPerformance[0];
  const worstPair = [...pairPerformance].sort((left, right) => left.profit - right.profit)[0];
  const reviewedTrades = monthTrades.filter((trade) => trade.review_status === "reviewed").length;
  const reviewRequiredCount = Math.max(0, monthTrades.length - reviewedTrades);
  const safeRemainingRiskPercent = Number(
    Math.max(0, plan.max_monthly_loss_percent - Math.abs(Math.min(profitPercent, 0))).toFixed(2),
  );
  const isPlanBroken =
    (plan.max_monthly_loss_percent > 0 && profitPercent <= -plan.max_monthly_loss_percent) ||
    (plan.max_trades_per_month > 0 && monthTrades.length > plan.max_trades_per_month) ||
    (plan.max_losses_per_month > 0 && losses >= plan.max_losses_per_month) ||
    (plan.max_losing_streak > 0 && losingStreak >= plan.max_losing_streak);
  const planRiskReasons = [
    ...(plan.max_losing_streak > 0 && losingStreak >= plan.max_losing_streak
      ? [`${losingStreak}-loss streak hit the max losing streak`]
      : []),
    ...(plan.max_monthly_loss_percent > 0 && profitPercent <= -plan.max_monthly_loss_percent
      ? [`monthly return reached the max loss limit (${formatSignedPercent(profitPercent)})`]
      : []),
    ...(plan.max_losses_per_month > 0 && losses >= plan.max_losses_per_month
      ? [`${losses} losses reached the monthly loss limit`]
      : []),
    ...(plan.max_trades_per_month > 0 && monthTrades.length > plan.max_trades_per_month
      ? [`${monthTrades.length} trades exceeded the monthly trade cap`]
      : []),
  ];
  const isBehind = profitProgress + 15 < tradeProgress || winRate + 5 < plan.target_win_rate_percent;
  const status = !monthTrades.length
    ? { label: "Ready", tone: "neutral" as const }
    : isPlanBroken
      ? { label: "Plan at risk", tone: "danger" as const }
      : profitProgress >= 100
        ? { label: "Target hit", tone: "healthy" as const }
        : isBehind
          ? { label: "Behind", tone: "warning" as const }
          : { label: "On track", tone: "healthy" as const };
  const insight = !monthTrades.length
    ? "Set the plan, take only qualified trades, then Qyvex will track the month automatically."
    : isPlanBroken
      ? `Stop chasing the target. ${planRiskReasons[0] ?? "Your plan limits are under pressure"}.`
      : profitGap > 0
        ? `You need ${formatSignedPercent(profitGap)} from ${tradesRemaining} remaining planned trade${tradesRemaining === 1 ? "" : "s"}.`
        : "Monthly target is reached. The priority is capital protection and clean execution.";
  const dataConfidence =
    reviewCompletion >= plan.min_review_completion_percent ? "High" : reviewCompletion > 0 ? "Medium" : "Low";
  const dataConfidenceReason = `${reviewedTrades}/${monthTrades.length} trades reviewed`;
  const riskEfficiencyInsight =
    expectancy < 0 && avgWinPercent > avgLossPercent
      ? "Average win is bigger than average loss, but win rate is below plan."
      : expectancy < 0
        ? "Expectancy is negative. Reduce risk until execution quality improves."
        : "Risk efficiency is positive. Protect the process that created it.";
  const performanceCause =
    rulePressureTrades.length && rulePressureProfit < 0
      ? `Rule-pressure trades are dragging the month: ${rulePressureTrades.length} trade${rulePressureTrades.length === 1 ? "" : "s"}, ${formatSignedMoney(rulePressureProfit)}.`
      : ruleFollowingProfit > 0
        ? `Clean trades are carrying performance: ${ruleFollowingTrades.length} trade${ruleFollowingTrades.length === 1 ? "" : "s"}, ${formatSignedMoney(ruleFollowingProfit)}.`
        : "Closed trades need more review context before Qyvex can explain the performance quality.";
  const pairDiagnosis =
    pairPerformance.length === 1
      ? `${pairPerformance[0].label} is the only active pair this month (${formatSignedMoney(pairPerformance[0].profit)}).`
      : worstPair && worstPair.profit < 0
        ? `${worstPair.label} is the weakest pair this month (${formatSignedMoney(worstPair.profit)}).`
        : bestPair
          ? `${bestPair.label} is leading the month (${formatSignedMoney(bestPair.profit)}).`
          : "No pair pattern yet.";

  return {
    avgLossPercent,
    avgWinPercent,
    bestPair,
    breakevens,
    closedTrades: closedTrades.length,
    dataConfidence,
    dataConfidenceReason,
    expectancy,
    insight,
    lossProgress,
    losses,
    lossesRemaining,
    losingStreak,
    monthLabel: getMonthLabel(),
    openTrades,
    pairPerformance,
    pairDiagnosis,
    plan,
    planRiskReasons,
    performanceCause,
    profitAmount,
    profitGap,
    profitPercent,
    profitProgress,
    reviewCompletion,
    reviewedTrades,
    reviewRequiredCount,
    ruleFollowingProfit,
    ruleFollowingTrades: ruleFollowingTrades.length,
    rulePressureProfit,
    rulePressureTrades: rulePressureTrades.length,
    riskEfficiencyInsight,
    safeRemainingRiskPercent,
    status,
    targetWinRate: plan.target_win_rate_percent,
    tradeProgress,
    tradesRemaining,
    totalTrades: monthTrades.length,
    winRate,
    wins,
    winsNeeded,
    worstPair,
  };
}

function getTrendLabel(scores: number[]) {
  if (scores.length < 4) {
    return {
      detail: "More reviewed trades will make the trend clearer.",
      label: "Building",
      tone: "neutral" as const,
    };
  }

  const midpoint = Math.floor(scores.length / 2);
  const older = average(scores.slice(0, midpoint));
  const recent = average(scores.slice(midpoint));
  const change = recent - older;

  if (change >= 8) {
    return {
      detail: `Recent discipline is up ${change} points.`,
      label: "Improving",
      tone: "healthy" as const,
    };
  }

  if (change <= -8) {
    return {
      detail: `Recent discipline is down ${Math.abs(change)} points.`,
      label: "Declining",
      tone: "warning" as const,
    };
  }

  return {
    detail: "Recent discipline is broadly stable.",
    label: "Stable",
    tone: "neutral" as const,
  };
}

function getDisciplineIntelligence({
  highRiskEmotionTrades,
  metrics,
  reviewCompletion,
  trades,
}: {
  highRiskEmotionTrades: TradeWithAnalysis[];
  metrics: ReturnType<typeof calculateDashboardMetrics>;
  reviewCompletion: number;
  trades: TradeWithAnalysis[];
}) {
  const reviewedTrades = trades.filter((trade) => trade.review_status === "reviewed");
  const unreviewedTrades = trades.filter((trade) => trade.review_status === "needs_review");
  const emotionReviewedTrades = trades.filter((trade) => parseEmotionValues(trade.emotions).length > 0);
  const emotionalControl = emotionReviewedTrades.length
    ? Math.round(((emotionReviewedTrades.length - highRiskEmotionTrades.length) / emotionReviewedTrades.length) * 100)
    : null;
  const systemScore = metrics.averageSystemScore || (metrics.mt5SyncedTrades ? 0 : 100);
  const userChecklist = getDashboardUserChecklistState(trades);
  const intelligenceParts = [
    { score: systemScore, weight: 0.45 },
    { score: reviewCompletion, weight: 0.35 },
    ...(userChecklist.hasData ? [{ score: userChecklist.score, weight: 0.15 }] : []),
    ...(emotionalControl === null ? [] : [{ score: emotionalControl, weight: 0.05 }]),
  ];
  const intelligenceScore = trades.length ? weightedAverage(intelligenceParts) : 0;
  const diagnosis =
    unreviewedTrades.length && systemScore >= 80
      ? {
          detail: `${unreviewedTrades.length} imported trade${unreviewedTrades.length === 1 ? "" : "s"} still need screenshot, emotion, and manual checklist review before psychology can be scored.`,
          label: "Trade facts look mostly healthy. Manual context is missing.",
          tone: "warning" as const,
        }
      : metrics.systemAlerts > 0
        ? {
            detail: `${metrics.systemAlerts} automatic system alert${metrics.systemAlerts === 1 ? "" : "s"} need attention from risk, RR, session, pair, direction, or stop/take-profit data.`,
            label: "System checks found measurable rule pressure.",
            tone: "warning" as const,
          }
        : userChecklist.hasData && userChecklist.score < 70
          ? {
              detail: "Manual confirmations are the weakest reviewed area. Tighten your checklist before entry.",
              label: "Checklist behavior is weakening discipline.",
              tone: "warning" as const,
            }
          : emotionalControl !== null && emotionalControl < 70
            ? {
                detail: "High-risk emotional tags are appearing in reviewed trades.",
                label: "Psychology is starting to affect execution quality.",
                tone: "warning" as const,
              }
            : {
                detail: "Keep reviewing imported trades so Qyvex can separate execution facts from trader behavior.",
                label: "Execution profile is balanced.",
                tone: "healthy" as const,
              };
  const leakCandidates = [
    {
      action: metrics.needsReviewTrades
        ? `Review ${metrics.needsReviewTrades} imported trade${metrics.needsReviewTrades === 1 ? "" : "s"}`
        : "Keep imported trades reviewed as they arrive",
      detail: `${metrics.needsReviewTrades} trade${metrics.needsReviewTrades === 1 ? "" : "s"} waiting for context.`,
      href: "/dashboard/journal?filter=needs-review",
      label: "Review debt",
      score: reviewCompletion,
    },
    {
      action: metrics.systemAlerts
        ? "Open the latest system alerts and fix the rule source"
        : "Keep system rules clean and measurable",
      detail: `${metrics.systemAlerts} automatic alert${metrics.systemAlerts === 1 ? "" : "s"} detected.`,
      href: "/dashboard/journal",
      label: "System rules",
      score: systemScore,
    },
    ...(userChecklist.hasData
      ? [
          {
            action: "Complete the user checklist before saving trades",
            detail: `${userChecklist.score}% user checklist discipline across reviewed trades.`,
            href: "/dashboard/upload",
            label: "User checklist",
            score: userChecklist.score,
          },
        ]
      : []),
    ...(emotionalControl === null
      ? []
      : [
          {
            action: highRiskEmotionTrades.length
              ? "Review high-risk emotional entries before the next session"
              : "Keep tagging emotions before entry",
            detail: `${highRiskEmotionTrades.length} high-risk emotional trade${highRiskEmotionTrades.length === 1 ? "" : "s"}.`,
            href: "/dashboard/journal",
            label: "Emotional control",
            score: emotionalControl,
          },
        ]),
  ];
  const primaryLeak = leakCandidates.sort((left, right) => left.score - right.score)[0];
  const recentScores = trades.slice(0, 8).reverse().map(getTradeIntelligenceScore);
  const trend = getTrendLabel(recentScores);

  return {
    diagnosis,
    emotionalControl,
    emotionReviewedCount: emotionReviewedTrades.length,
    intelligenceScore,
    primaryLeak,
    recentScores,
    reviewedCount: reviewedTrades.length,
    reviewCompletion,
    systemScore,
    trend,
    unreviewedCount: unreviewedTrades.length,
    userChecklist,
  };
}

function getDashboardModel(trades: TradeWithAnalysis[], performancePlan: PerformancePlan) {
  const metrics = calculateDashboardMetrics(trades);
  const todayTrades = trades.filter((trade) => isToday(trade.trade_taken_at));
  const todayDiscipline = average(todayTrades.map(getTradeDiscipline));
  const reviewCompletion = trades.length
    ? Math.round(((trades.length - metrics.needsReviewTrades) / trades.length) * 100)
    : 0;
  const rulePressureSummary = getRulePressureSummary(trades);
  const ruleAdherence = rulePressureSummary.adherence;
  const highRiskEmotionTrades = trades.filter((trade) => getEmotionRisk(trade.emotions) === "high-risk");
  const warningEmotionTrades = trades.filter((trade) => getEmotionRisk(trade.emotions) === "warning");
  const emotionCounts = countBy(trades.flatMap((trade) => parseEmotionValues(trade.emotions)));
  const sessionCounts = countBy(trades.map((trade) => trade.session).filter(Boolean));
  const failedRuleCounts = rulePressureSummary.failedRuleCounts;
  const mostFailedRule = rulePressureSummary.mostFailedRule;
  const dominantEmotion = emotionCounts[0]?.label ?? "No emotion data";
  const behaviorState =
    metrics.needsReviewTrades > 0
      ? "Review debt needs attention"
      : highRiskEmotionTrades.length > 0
        ? "Emotional risk is elevated"
        : metrics.avgDiscipline >= 80
          ? "Composed execution"
          : trades.length
            ? "Execution needs calibration"
            : "Ready to build discipline data";
  const behaviorTone: "healthy" | "neutral" | "warning" =
    metrics.needsReviewTrades > 0 || highRiskEmotionTrades.length > 0
      ? "warning"
      : metrics.avgDiscipline >= 80
        ? "healthy"
        : "neutral";
  const disciplineIntelligence = getDisciplineIntelligence({
    highRiskEmotionTrades,
    metrics,
    reviewCompletion,
    trades,
  });
  const monthlyPerformance = getMonthlyPerformanceModel(trades, performancePlan);

  return {
    behaviorState,
    behaviorTone,
    dominantEmotion,
    disciplineIntelligence,
    emotionCounts,
    failedRuleCounts,
    highRiskEmotionTrades,
    metrics,
    monthlyPerformance,
    mostFailedRule,
    reviewCompletion,
    ruleAdherence,
    sessionCounts,
    todayDiscipline,
    todayTrades,
    warningEmotionTrades,
  };
}

export default async function Page() {
  noStore();

  const [allTrades, accountContext, performancePlans] = await Promise.all([
    getTrades(),
    getMt5AccountContext(),
    getPerformancePlans(),
  ]);
  const { connections, selectedConnection, selectedConnectionId } = accountContext;
  const trades = getFilteredTrades({
    selectedConnectionId,
    trades: allTrades,
  });
  const performancePlan = getActivePerformancePlan(performancePlans, selectedConnectionId);
  const model = getDashboardModel(trades, performancePlan);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <DashboardHeader
        connections={connections}
        selectedConnection={selectedConnection}
        selectedConnectionId={selectedConnectionId}
      />

      <DailySnapshotHero connection={selectedConnection} model={model} />

      {!trades.length ? (
        <EmptyDashboardState hasConnections={connections.length > 0} />
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-12">
            <DisciplineIntelligence model={model} />
            <PerformanceAnalytics model={model} />
          </section>

          <section className="grid gap-4 xl:grid-cols-12">
            <RiskMonitoring model={model} />
            <TradingTimeline connection={selectedConnection} model={model} trades={trades} />
            <BehaviorPatterns model={model} />
          </section>

          <RecentTrades trades={trades} />
        </>
      )}
    </div>
  );
}

function DashboardHeader({
  connections,
  selectedConnection,
  selectedConnectionId,
}: {
  connections: Mt5ConnectionStatus[];
  selectedConnection: Mt5ConnectionStatus | null;
  selectedConnectionId: string | null;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
          Qyvex Edge
        </Badge>
        <div>
          <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">Discipline command center</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
            Review the account you are trading today: execution quality, psychology, risk, and rule adherence.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-[0_24px_80px_rgb(0_0_0/0.18)] backdrop-blur sm:min-w-[340px]">
        <Mt5AccountSwitcher connections={connections} selectedConnectionId={selectedConnectionId} />
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <div className="truncate font-medium">
              {selectedConnection ? getMt5ConnectionLabel(selectedConnection) : "No active account"}
            </div>
            <div className="text-muted-foreground text-xs">
              {selectedConnection?.last_sync_at
                ? `Synced ${formatShortDate(selectedConnection.last_sync_at)}`
                : "Waiting for account data"}
            </div>
          </div>
          <Button asChild size="sm">
            <Link href="/dashboard/upload">Log trade</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function getCommandCenterState({
  connection,
  model,
}: {
  connection: Mt5ConnectionStatus | null;
  model: ReturnType<typeof getDashboardModel>;
}) {
  const { metrics, monthlyPerformance, todayDiscipline, todayTrades } = model;
  const hasTradesToday = todayTrades.length > 0;

  if (monthlyPerformance.status.tone === "danger") {
    return {
      badge: "Risk mode",
      ctaHref: "/dashboard/journal?filter=needs-review",
      ctaLabel: "Review losing streak",
      narrative: `${monthlyPerformance.planRiskReasons[0] ?? "Your plan limits are under pressure"}. Review before taking another setup.`,
      primaryLabel: "Protect the account",
      primaryValue: "Risk mode",
      tone: "danger" as const,
    };
  }

  if (metrics.needsReviewTrades > 0) {
    return {
      badge: "Review mode",
      ctaHref: "/dashboard/journal?filter=needs-review",
      ctaLabel: "Open review queue",
      narrative: "MT5 trades are synced, but manual context is missing. Review them before trusting discipline scores.",
      primaryLabel: "Reviews pending",
      primaryValue: String(metrics.needsReviewTrades),
      tone: "warning" as const,
    };
  }

  if (hasTradesToday) {
    return {
      badge: "Execution mode",
      ctaHref: "/dashboard/upload",
      ctaLabel: "Log trade",
      narrative:
        todayDiscipline >= 80
          ? "Clean execution today. Keep following the same plan and pace."
          : "Today has decisions worth reviewing. Slow the next trade down.",
      primaryLabel: "Today's discipline",
      primaryValue: `${todayDiscipline}%`,
      tone: todayDiscipline >= 80 ? ("healthy" as const) : ("warning" as const),
    };
  }

  if (monthlyPerformance.status.label === "Target hit") {
    return {
      badge: "Target hit",
      ctaHref: "/dashboard/settings/performance",
      ctaLabel: "Review plan",
      narrative: "Monthly target is reached. Protect gains and avoid unnecessary trades.",
      primaryLabel: "Monthly plan",
      primaryValue: "Target hit",
      tone: "healthy" as const,
    };
  }

  return {
    badge: connection ? "Calm mode" : "Setup mode",
    ctaHref: connection ? "/dashboard/settings/performance" : "/dashboard/settings/mt5",
    ctaLabel: connection ? "Open plan" : "Set up MT5",
    narrative: connection
      ? "No trades logged today. Use this calm window to review your plan before the next setup."
      : "Connect an account or log a trade to start building discipline data.",
    primaryLabel: "Today",
    primaryValue: connection ? "No trades" : "Connect",
    tone: "neutral" as const,
  };
}

function DailySnapshotHero({
  connection,
  model,
}: {
  connection: Mt5ConnectionStatus | null;
  model: ReturnType<typeof getDashboardModel>;
}) {
  const { metrics, monthlyPerformance, reviewCompletion, ruleAdherence, todayTrades } = model;
  const commandState = getCommandCenterState({ connection, model });
  const primaryValueClass =
    commandState.primaryValue.length > 8
      ? "font-semibold text-5xl tracking-tight sm:text-6xl"
      : "font-semibold text-7xl tracking-tight sm:text-8xl";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgb(124_92_255/0.20),transparent_32%),linear-gradient(135deg,rgb(23_24_28),rgb(10_10_11))] p-5 shadow-[0_30px_120px_rgb(0_0_0/0.28)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getStatusClass(commandState.tone)}>{commandState.badge}</Badge>
            <Badge variant="outline" className="rounded-full bg-background/40">
              {todayTrades.length} trades today
            </Badge>
            <Badge variant="outline" className="rounded-full bg-background/40">
              {monthlyPerformance.status.label}
            </Badge>
          </div>

          <div>
            <div className="text-muted-foreground text-sm">Trading command center</div>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <div>
                <div className={primaryValueClass}>{commandState.primaryValue}</div>
                <div className="mt-1 text-muted-foreground text-sm">{commandState.primaryLabel}</div>
              </div>
              <div className="mb-2 max-w-sm space-y-3 text-muted-foreground text-sm">
                <p>{commandState.narrative}</p>
                <Button asChild size="sm">
                  <Link href={commandState.ctaHref}>{commandState.ctaLabel}</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SnapshotPill label="Rule adherence" value={`${ruleAdherence}%`} icon={<IconMark text="RA" />} />
            <SnapshotPill label="Review completion" value={`${reviewCompletion}%`} icon={<IconMark text="RC" />} />
            <SnapshotPill
              label="Active account"
              value={connection ? "Synced" : "Not connected"}
              icon={<IconMark text="AC" />}
            />
          </div>
        </div>

        <div className="grid content-between gap-4 rounded-2xl border border-border/70 bg-background/35 p-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">Account health</div>
              <div className="text-muted-foreground text-xs">Current account and monthly context.</div>
            </div>
            <Badge variant="outline">{connection ? getMt5ConnectionLabel(connection) : "No account"}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetric label="Needs review" value={metrics.needsReviewTrades} tone="warning" />
            <HeroMetric label="System alerts" value={metrics.systemAlerts} tone="warning" />
            <HeroMetric label="Win rate" value={`${metrics.winRate}%`} tone="neutral" />
            <HeroMetric label="Total P/L" value={metrics.totalProfitLoss} tone="neutral" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Account discipline</span>
              <span className="font-medium">{metrics.avgDiscipline}%</span>
            </div>
            <Progress value={metrics.avgDiscipline} />
          </div>
        </div>
      </div>
    </section>
  );
}

function DisciplineIntelligence({ model }: { model: ReturnType<typeof getDashboardModel> }) {
  const { disciplineIntelligence, metrics, mostFailedRule, ruleAdherence } = model;
  const {
    diagnosis,
    emotionalControl,
    emotionReviewedCount,
    intelligenceScore,
    primaryLeak,
    recentScores,
    reviewedCount,
    systemScore,
    trend,
    unreviewedCount,
    userChecklist,
  } = disciplineIntelligence;

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-card to-secondary/50 xl:col-span-5">
      <CardHeader>
        <SectionEyebrow icon={<IconMark text="DI" />}>Discipline Intelligence</SectionEyebrow>
        <CardTitle>What is really weakening execution?</CardTitle>
        <CardDescription>System checks, review habits, psychology, and checklist behavior in one view.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <ScoreRing label="Intelligence score" value={intelligenceScore} />
          <div className="space-y-3">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-muted-foreground text-xs">Primary discipline leak</div>
                <Badge
                  className={primaryLeak.score < 65 ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-primary/10 text-primary"}
                >
                  {primaryLeak.score}%
                </Badge>
              </div>
              <div className="mt-2 font-semibold text-lg">{primaryLeak.label}</div>
              <p className="mt-1 text-muted-foreground text-sm">{primaryLeak.detail}</p>
              <Button asChild size="sm" className="mt-3">
                <Link href={primaryLeak.href}>{primaryLeak.action}</Link>
              </Button>
            </div>
            <div className="rounded-2xl border bg-secondary/35 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-muted-foreground text-xs">Recent trajectory</div>
                  <div className="mt-1 font-medium">{trend.label}</div>
                </div>
                <Badge className={getToneClass(trend.tone)}>{trend.label}</Badge>
              </div>
              <TrendDots scores={recentScores} />
              <div className="mt-2 text-muted-foreground text-xs">{trend.detail}</div>
            </div>
          </div>
        </div>

        <DiagnosisPanel diagnosis={diagnosis} reviewedCount={reviewedCount} unreviewedCount={unreviewedCount} />

        <div className="grid gap-3">
          <DisciplineSplitCard
            systemAlerts={metrics.systemAlerts}
            systemScore={systemScore}
            userChecklist={userChecklist}
          />
          <BreakdownRow label="System discipline" value={systemScore} detail={`${metrics.systemAlerts} alerts`} />
          <BreakdownRow
            label="Review progress"
            value={disciplineIntelligence.reviewCompletion}
            detail={`${reviewedCount}/${reviewedCount + unreviewedCount} reviewed`}
          />
          <BreakdownRow
            detail={
              userChecklist.hasData
                ? `${userChecklist.reviewedCount} reviewed trade${userChecklist.reviewedCount === 1 ? "" : "s"} with manual checklist data`
                : "Waiting for reviewed trades with manual confirmations"
            }
            label="User checklist discipline"
            value={userChecklist.hasData ? userChecklist.score : null}
          />
          <BreakdownRow
            detail={
              emotionalControl === null
                ? "Waiting for emotion tags from reviewed trades"
                : `${emotionReviewedCount} emotion-tagged trade${emotionReviewedCount === 1 ? "" : "s"}, ${model.highRiskEmotionTrades.length} high-risk`
            }
            label="Emotional context"
            value={emotionalControl}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <IntelligenceTile label="Rule adherence" value={`${ruleAdherence}%`} detail="All rule-break trades." />
          <IntelligenceTile
            label="Most failed rule"
            value={truncateText(mostFailedRule, 28)}
            detail="Current improvement target."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceAnalytics({ model }: { model: ReturnType<typeof getDashboardModel> }) {
  const { monthlyPerformance } = model;
  const plan = monthlyPerformance.plan;
  const isDamageControl = monthlyPerformance.status.tone === "danger";
  const riskReason = monthlyPerformance.planRiskReasons[0] ?? "Your plan limits are under pressure";

  return (
    <Card className="xl:col-span-7">
      <CardHeader>
        <SectionEyebrow icon={<IconMark text="PA" />}>Performance Analytics</SectionEyebrow>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{monthlyPerformance.monthLabel} plan tracker</CardTitle>
            <CardDescription>Performance measured against the trading plan, not just wins and losses.</CardDescription>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniMetric label="Status" value={monthlyPerformance.status.label} />
            <MiniMetric label="Profit" value={formatSignedPercent(monthlyPerformance.profitPercent)} />
            <MiniMetric label="Trades" value={`${monthlyPerformance.totalTrades}/${plan.max_trades_per_month}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-3xl border border-primary/20 bg-[linear-gradient(135deg,rgb(124_92_255/0.16),rgb(94_234_212/0.05))] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge className={getStatusClass(monthlyPerformance.status.tone)}>
                {monthlyPerformance.status.label}
              </Badge>
              <div className="mt-3 font-semibold text-2xl tracking-tight">
                {isDamageControl ? "Stop chasing the target." : monthlyPerformance.insight}
              </div>
              {isDamageControl ? <p className="mt-1 font-medium text-destructive text-sm">{riskReason}.</p> : null}
              <p className="mt-2 text-muted-foreground text-sm">
                Target: {formatSignedPercent(plan.monthly_profit_target_percent)} profit, {plan.max_trades_per_month}{" "}
                max trades,
                {` ${plan.target_win_rate_percent}%`} win rate, {plan.risk_per_trade_percent}% risk for {plan.target_rr}
                R.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/settings/performance">Edit plan</Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <PlanProgress
              label="Trades used"
              value={`${monthlyPerformance.totalTrades}/${plan.max_trades_per_month}`}
              progress={monthlyPerformance.tradeProgress}
            />
            <PlanProgress
              label={isDamageControl ? "Monthly return" : "Profit target"}
              value={
                isDamageControl
                  ? formatSignedPercent(monthlyPerformance.profitPercent)
                  : `${formatSignedPercent(monthlyPerformance.profitPercent)} / ${plan.monthly_profit_target_percent}%`
              }
              progress={monthlyPerformance.profitProgress}
            />
            <PlanProgress
              label={isDamageControl ? "Loss limit used" : "Drawdown pressure"}
              value={`${formatSignedPercent(Math.min(monthlyPerformance.profitPercent, 0))} / -${plan.max_monthly_loss_percent}%`}
              progress={monthlyPerformance.lossProgress}
              tone="danger"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <OutcomeTile label="Wins" value={monthlyPerformance.wins} className="border-[#22C55E]/20 bg-[#22C55E]/10" />
          <OutcomeTile
            label="Losses"
            value={monthlyPerformance.losses}
            className="border-destructive/20 bg-destructive/10"
          />
          <OutcomeTile
            label="Breakevens"
            value={monthlyPerformance.breakevens}
            className="border-[#F59E0B]/20 bg-[#F59E0B]/10"
          />
          <OutcomeTile
            label="Running"
            value={monthlyPerformance.openTrades}
            className="border-primary/20 bg-primary/10"
          />
        </div>

        {isDamageControl ? (
          <>
            <WhyItHappenedPanel monthlyPerformance={monthlyPerformance} />
            <DamageControlPanel monthlyPerformance={monthlyPerformance} />
            <div className="flex flex-col gap-3 rounded-2xl border border-destructive/25 bg-secondary/35 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">Rule-pressure trades are causing the damage.</div>
                <p className="mt-1 text-muted-foreground text-sm">
                  Review the losing streak before taking another setup.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/journal?filter=needs-review">Review losing streak</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-2xl border bg-secondary/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">Remaining path</div>
                    <div className="text-muted-foreground text-xs">What must happen without forcing trades.</div>
                  </div>
                  <Badge variant="outline">{monthlyPerformance.tradesRemaining} trades left</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <PlanTile label="Profit needed" value={formatSignedPercent(monthlyPerformance.profitGap)} />
                  <PlanTile label="Estimated wins needed" value={monthlyPerformance.winsNeeded} />
                  <PlanTile label="Losses remaining" value={monthlyPerformance.lossesRemaining} />
                  <PlanTile label="Current losing streak" value={monthlyPerformance.losingStreak} />
                </div>
              </div>

              <RiskEfficiencyPanel monthlyPerformance={monthlyPerformance} />
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <PerformanceQualityCard
                detail={`${monthlyPerformance.ruleFollowingTrades} clean trade${monthlyPerformance.ruleFollowingTrades === 1 ? "" : "s"} without saved rule pressure.`}
                label="Rule-following P/L"
                value={formatSignedMoney(monthlyPerformance.ruleFollowingProfit)}
                tone="healthy"
              />
              <PerformanceQualityCard
                detail={`${monthlyPerformance.rulePressureTrades} trade${monthlyPerformance.rulePressureTrades === 1 ? "" : "s"} with system alerts or failed rules.`}
                label="Rule-pressure P/L"
                value={formatSignedMoney(monthlyPerformance.rulePressureProfit)}
                tone={monthlyPerformance.rulePressureProfit < 0 ? "danger" : "neutral"}
              />
              <PerformanceQualityCard
                detail={monthlyPerformance.pairDiagnosis}
                label={monthlyPerformance.pairPerformance.length === 1 ? "Only active pair" : "Best pair"}
                value={monthlyPerformance.bestPair?.label ?? "Waiting"}
                tone="neutral"
              />
            </div>
          </>
        )}

        <div className="rounded-2xl border bg-background/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">Pair performance</div>
              <div className="text-muted-foreground text-xs">Where this month's outcome is coming from.</div>
            </div>
            {monthlyPerformance.worstPair ? (
              <Badge variant="outline">Weakest: {monthlyPerformance.worstPair.label}</Badge>
            ) : null}
          </div>
          {monthlyPerformance.pairPerformance.length ? (
            <div className="grid gap-2">
              {monthlyPerformance.pairPerformance.slice(0, 4).map((pair) => (
                <PairPerformanceRow key={pair.label} pair={pair} />
              ))}
            </div>
          ) : (
            <MiniEmptyState
              title="No monthly closed trades"
              description="Closed trades will build the monthly plan view."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RiskMonitoring({ model }: { model: ReturnType<typeof getDashboardModel> }) {
  const { highRiskEmotionTrades, metrics, warningEmotionTrades } = model;

  return (
    <Card className="xl:col-span-4">
      <CardHeader>
        <SectionEyebrow icon={<IconMark text="RM" />}>Risk Monitoring</SectionEyebrow>
        <CardTitle>Execution risk radar</CardTitle>
        <CardDescription>Catch preventable damage before it becomes a pattern.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <RiskRow
          label="Rule violation rate"
          value={`${metrics.ruleViolationRate}%`}
          severe={metrics.ruleViolationRate > 25}
        />
        <RiskRow
          label="No stop loss"
          value={metrics.tradesWithoutStopLoss}
          severe={metrics.tradesWithoutStopLoss > 0}
        />
        <RiskRow
          label="No take profit"
          value={metrics.tradesWithoutTakeProfit}
          severe={metrics.tradesWithoutTakeProfit > 0}
        />
        <RiskRow label="System alert trades" value={metrics.systemAlertTrades} severe={metrics.systemAlertTrades > 0} />
        <RiskRow
          label="Avg estimated risk"
          value={`${metrics.averageEstimatedRiskPercent}%`}
          severe={metrics.averageEstimatedRiskPercent > 2}
        />
        <RiskRow
          label="High-risk emotion trades"
          value={highRiskEmotionTrades.length}
          severe={highRiskEmotionTrades.length > 0}
        />
        <RiskRow label="Warning emotion trades" value={warningEmotionTrades.length} severe={false} />
      </CardContent>
    </Card>
  );
}

type TimelineEvent = {
  badge: string;
  detail: string;
  href: string;
  timeLabel: string;
  title: string;
  tone: "danger" | "healthy" | "neutral" | "warning";
};

function buildAccountTimelineEvents({
  connection,
  model,
  trades,
}: {
  connection: Mt5ConnectionStatus | null;
  model: ReturnType<typeof getDashboardModel>;
  trades: TradeWithAnalysis[];
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const { metrics, monthlyPerformance } = model;

  if (monthlyPerformance.status.tone === "danger") {
    events.push({
      badge: "Risk",
      detail: monthlyPerformance.planRiskReasons[0] ?? "Plan limits are under pressure.",
      href: "/dashboard/journal?filter=needs-review",
      timeLabel: "Now",
      title: "Risk mode triggered",
      tone: "danger",
    });
  }

  if (metrics.needsReviewTrades > 0) {
    events.push({
      badge: `${metrics.needsReviewTrades} pending`,
      detail: "Imported trades need screenshots, emotions, and manual checklist review.",
      href: "/dashboard/journal?filter=needs-review",
      timeLabel: "Now",
      title: "Review queue waiting",
      tone: "warning",
    });
  }

  if (metrics.systemAlerts > 0) {
    events.push({
      badge: `${metrics.systemAlerts} alerts`,
      detail: `${metrics.systemAlertTrades} trade${metrics.systemAlertTrades === 1 ? "" : "s"} have automatic rule pressure.`,
      href: "/dashboard/journal",
      timeLabel: "Now",
      title: "System alerts detected",
      tone: "warning",
    });
  }

  if (connection?.last_sync_at) {
    events.push({
      badge: "Synced",
      detail: `${getMt5ConnectionLabel(connection)} sent the latest account data.`,
      href: "/dashboard/settings/mt5",
      timeLabel: formatShortDate(connection.last_sync_at),
      title: "MT5 sync completed",
      tone: "healthy",
    });
  }

  for (const trade of trades.slice(0, 5)) {
    const isClosed = trade.status === "closed";
    const outcome = isClosed ? trade.outcome : "open";
    events.push({
      badge: isClosed ? outcome : "Open",
      detail: isClosed
        ? `${formatSignedMoney(Number(trade.profit_loss_amount ?? 0))} P/L${tradeHasRulePressure(trade) ? " with rule pressure" : ""}.`
        : "Open trade still needs close details after exit.",
      href: `/dashboard/trades/${trade.id}`,
      timeLabel: formatTradeDateTime(trade.closed_at ?? trade.trade_taken_at, trade.trade_timezone),
      title: `${trade.pair} ${isClosed ? `closed ${outcome}` : "opened"}`,
      tone: trade.outcome === "loss" ? "danger" : trade.outcome === "win" ? "healthy" : "neutral",
    });
  }

  return events.slice(0, 6);
}

function getTimelineToneClass(tone: TimelineEvent["tone"]) {
  if (tone === "danger") {
    return "bg-destructive shadow-[0_0_18px_rgb(239_68_68/0.35)]";
  }

  if (tone === "healthy") {
    return "bg-[#22C55E] shadow-[0_0_18px_rgb(34_197_94/0.35)]";
  }

  if (tone === "warning") {
    return "bg-[#F59E0B] shadow-[0_0_18px_rgb(245_158_11/0.35)]";
  }

  return "bg-primary shadow-[0_0_18px_rgb(124_92_255/0.45)]";
}

function TradingTimeline({
  connection,
  model,
  trades,
}: {
  connection: Mt5ConnectionStatus | null;
  model: ReturnType<typeof getDashboardModel>;
  trades: TradeWithAnalysis[];
}) {
  const events = buildAccountTimelineEvents({ connection, model, trades });

  return (
    <Card className="xl:col-span-4">
      <CardHeader>
        <SectionEyebrow icon={<IconMark text="AT" />}>Account Timeline</SectionEyebrow>
        <CardTitle>What changed recently</CardTitle>
        <CardDescription>Syncs, risk events, reviews, and trade closes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.map((event) => (
          <Link
            key={`${event.title}-${event.timeLabel}`}
            href={event.href}
            className="group grid grid-cols-[auto_1fr] gap-3"
          >
            <div className="mt-1 flex flex-col items-center">
              <div className={`size-2.5 rounded-full ${getTimelineToneClass(event.tone)}`} />
              <div className="mt-2 h-full min-h-10 w-px bg-border group-last:hidden" />
            </div>
            <div className="rounded-2xl border bg-secondary/35 p-3 transition-colors group-hover:border-primary/35 group-hover:bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{event.title}</div>
                <Badge variant="outline">{event.badge}</Badge>
              </div>
              <div className="mt-1 text-muted-foreground text-xs">{event.detail}</div>
              <div className="mt-2 text-[11px] text-muted-foreground">{event.timeLabel}</div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function BehaviorPatterns({ model }: { model: ReturnType<typeof getDashboardModel> }) {
  const { dominantEmotion, emotionCounts, failedRuleCounts, sessionCounts } = model;

  return (
    <Card className="xl:col-span-4">
      <CardHeader>
        <SectionEyebrow icon={<IconMark text="BP" />}>Behavior Patterns</SectionEyebrow>
        <CardTitle>Psychology and habits</CardTitle>
        <CardDescription>Find what repeats underneath the trade results.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <PatternBlock title="Dominant emotion" value={dominantEmotion} items={emotionCounts.slice(0, 3)} />
        <PatternBlock
          title="Session concentration"
          value={sessionCounts[0]?.label ?? "No session data"}
          items={sessionCounts.slice(0, 3)}
        />
        <PatternBlock
          title="Recurring mistake"
          value={failedRuleCounts[0]?.label ?? "No failed rules"}
          items={failedRuleCounts.slice(0, 3)}
        />
      </CardContent>
    </Card>
  );
}

function RecentTrades({ trades }: { trades: TradeWithAnalysis[] }) {
  const actionableTrades = [...trades]
    .sort((left, right) => {
      const leftPriority = left.review_status === "needs_review" ? 0 : left.status === "open" ? 1 : 2;
      const rightPriority = right.review_status === "needs_review" ? 0 : right.status === "open" ? 1 : 2;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(right.trade_taken_at).getTime() - new Date(left.trade_taken_at).getTime();
    })
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionEyebrow icon={<IconMark text="RT" />}>Recent Trades</SectionEyebrow>
          <CardTitle>Trades needing attention</CardTitle>
          <CardDescription>Review queue first, open trades second, latest closed trades after.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/journal">View journal</Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {actionableTrades.map((trade) => {
          const score = getTradeDiscipline(trade);
          return (
            <Link
              key={trade.id}
              href={`/dashboard/trades/${trade.id}`}
              className="grid gap-3 rounded-2xl border border-border/80 bg-secondary/35 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card hover:shadow-[0_18px_60px_rgb(0_0_0/0.22)] lg:grid-cols-[1.2fr_auto_auto_auto_auto]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{trade.pair}</div>
                  <Badge variant="outline" className="uppercase">
                    {trade.direction}
                  </Badge>
                </div>
                <div className="mt-1 text-muted-foreground text-sm">
                  {formatTradeDateTime(trade.trade_taken_at, trade.trade_timezone)} - {trade.session} -{" "}
                  {trade.risk_percent}% risk - {trade.rr}R planned
                </div>
              </div>
              <TradeStatusBadge status={trade.status} />
              <TradeOutcomeBadge outcome={trade.outcome} />
              <TradeReviewBadge status={trade.review_status} />
              <Badge className={score >= 80 ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-primary/10 text-primary"}>
                {score}% discipline
              </Badge>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

function EmptyDashboardState({ hasConnections }: { hasConnections: boolean }) {
  const steps = [
    {
      body: "Define risk, RR, session, pair, and checklist guardrails.",
      href: "/dashboard/settings",
      label: "Set rules",
      title: "1. Set your trading rules",
    },
    {
      body: hasConnections
        ? "Your account is connected. Keep MT5 open when you want fresh syncs."
        : "Import read-only MT5 history or keep logging manually.",
      href: "/dashboard/settings/mt5",
      label: hasConnections ? "View MT5" : "Connect MT5",
      title: "2. Connect or choose manual",
    },
    {
      body: "Add your first trade context so Qyvex can calculate discipline data.",
      href: "/dashboard/upload",
      label: "Log trade",
      title: "3. Log or review a trade",
    },
  ];

  return (
    <Card className="overflow-hidden border-dashed bg-gradient-to-br from-card to-secondary/50">
      <CardContent className="space-y-6 p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <span className="font-semibold text-xs">QX</span>
            </div>
            <h2 className="mt-4 font-semibold text-2xl tracking-tight">
              {hasConnections ? "This account is ready for review" : "Connect your first trading account"}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
              {hasConnections
                ? "Sync or log trades into this account to build discipline, psychology, and risk analytics."
                : "Use MT5 sync or add a manual journal entry. Qyvex Edge becomes more useful with every reviewed trade."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/upload">Log trade</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings/mt5">Set up MT5</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step) => (
            <Link
              key={step.title}
              href={step.href}
              className="rounded-2xl border bg-background/35 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card"
            >
              <h3 className="font-semibold text-sm">{step.title}</h3>
              <p className="mt-2 text-muted-foreground text-xs leading-5">{step.body}</p>
              <div className="mt-4 text-primary text-xs">{step.label}</div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SnapshotPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/35 p-3 backdrop-blur">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <span className="[&_svg]:size-3.5">{icon}</span>
        {label}
      </div>
      <div className="mt-2 font-semibold text-xl">{value}</div>
    </div>
  );
}

function HeroMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "danger" | "neutral" | "warning";
  value: number | string;
}) {
  const toneClass = tone === "danger" ? "text-destructive" : tone === "warning" ? "text-[#F59E0B]" : "text-foreground";

  return (
    <div className="rounded-2xl border border-border/70 bg-background/30 p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className={`mt-1 font-semibold text-2xl ${toneClass}`}>{value}</div>
    </div>
  );
}

function SectionEyebrow({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase">
      {icon}
      {children}
    </div>
  );
}

function IconMark({ text }: { text: string }) {
  return (
    <span className="flex size-6 items-center justify-center rounded-lg border bg-secondary font-semibold text-[10px] text-muted-foreground">
      {text}
    </span>
  );
}

function ScoreRing({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border bg-background/35 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-muted-foreground text-sm">{label}</div>
          <div className="mt-1 font-semibold text-5xl tracking-tight">{value}%</div>
        </div>
        <div className="flex size-24 items-center justify-center rounded-full border border-primary/25 bg-primary/10 shadow-[0_0_45px_rgb(124_92_255/0.15)]">
          <span className="font-semibold text-primary text-xl">DS</span>
        </div>
      </div>
      <Progress value={value} className="mt-4" />
    </div>
  );
}

function IntelligenceTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-secondary/35 p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 font-semibold text-lg">{value}</div>
      <div className="mt-2 text-muted-foreground text-xs">{detail}</div>
    </div>
  );
}

function DiagnosisPanel({
  diagnosis,
  reviewedCount,
  unreviewedCount,
}: {
  diagnosis: { detail: string; label: string; tone: "healthy" | "warning" };
  reviewedCount: number;
  unreviewedCount: number;
}) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-background/35 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-muted-foreground text-xs">Diagnosis</div>
          <div className="mt-1 font-semibold text-base">{diagnosis.label}</div>
          <p className="mt-2 text-muted-foreground text-sm">{diagnosis.detail}</p>
        </div>
        <Badge
          className={diagnosis.tone === "warning" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-[#22C55E]/10 text-[#22C55E]"}
        >
          {diagnosis.tone === "warning" ? "Needs context" : "Healthy"}
        </Badge>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <MiniMetric label="Reviewed" value={reviewedCount} />
        <MiniMetric label="Awaiting review" value={unreviewedCount} />
      </div>
    </div>
  );
}

function BreakdownRow({ detail, label, value }: { detail: string; label: string; value: number | null }) {
  const hasScore = value !== null;

  return (
    <div className="rounded-2xl border bg-secondary/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-sm">{label}</div>
          <div className="text-muted-foreground text-xs">{detail}</div>
        </div>
        <div className="font-semibold">{hasScore ? `${value}%` : "Waiting"}</div>
      </div>
      {hasScore ? (
        <Progress value={value} className="mt-3" />
      ) : (
        <div className="mt-3 h-2 rounded-full border bg-background/50" />
      )}
    </div>
  );
}

function DisciplineSplitCard({
  systemAlerts,
  systemScore,
  userChecklist,
}: {
  systemAlerts: number;
  systemScore: number;
  userChecklist: ReturnType<typeof getDashboardUserChecklistState>;
}) {
  const averageScore = userChecklist.hasData ? Math.round((systemScore + userChecklist.score) / 2) : systemScore;

  return (
    <div className="rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,rgb(124_92_255/0.12),rgb(94_234_212/0.05))] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-sm">Discipline split</div>
          <div className="text-muted-foreground text-xs">Automatic facts vs manual confirmations.</div>
        </div>
        <Badge variant="outline" className="rounded-full">
          {averageScore}% known
        </Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-background/35 p-3">
          <div className="text-muted-foreground text-xs">System discipline</div>
          <div className="mt-1 font-semibold text-3xl">{systemScore}%</div>
          <div className="mt-2 text-muted-foreground text-xs">
            {systemAlerts ? `${systemAlerts} system alert${systemAlerts === 1 ? "" : "s"}` : "No active system alerts"}
          </div>
          <Progress value={systemScore} className="mt-3" />
        </div>
        <div className="rounded-2xl border bg-background/35 p-3">
          <div className="text-muted-foreground text-xs">User checklist discipline</div>
          <div className="mt-1 font-semibold text-3xl">
            {userChecklist.hasData ? `${userChecklist.score}%` : "Waiting"}
          </div>
          <div className="mt-2 text-muted-foreground text-xs">
            {userChecklist.hasData
              ? `${userChecklist.reviewedCount} trade${userChecklist.reviewedCount === 1 ? "" : "s"} with manual confirmations.`
              : "Not scored until reviewed trades have manual checklist confirmations."}
          </div>
          {userChecklist.hasData ? (
            <Progress value={userChecklist.score} className="mt-3" />
          ) : (
            <div className="mt-3 h-2 rounded-full border bg-background/50" />
          )}
        </div>
      </div>
    </div>
  );
}

function TrendDots({ scores }: { scores: number[] }) {
  if (!scores.length) {
    return <div className="mt-3 text-muted-foreground text-xs">No trade scores yet.</div>;
  }

  const seenScores = new Map<number, number>();
  const dots = scores.map((score) => {
    const occurrence = seenScores.get(score) ?? 0;
    seenScores.set(score, occurrence + 1);
    return {
      key: `${score}-${occurrence}`,
      score,
    };
  });

  return (
    <div className="mt-3 flex items-end gap-1.5">
      {dots.map((dot) => (
        <div
          key={dot.key}
          className={
            dot.score >= 80
              ? "h-8 flex-1 rounded-full bg-[#22C55E]/80"
              : dot.score >= 60
                ? "h-8 flex-1 rounded-full bg-primary/80"
                : "h-8 flex-1 rounded-full bg-[#F59E0B]/80"
          }
          style={{ opacity: Math.max(0.35, dot.score / 100) }}
          title={`${dot.score}%`}
        />
      ))}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-secondary/35 px-3 py-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function OutcomeTile({ className, label, value }: { className: string; label: string; value: number }) {
  return (
    <div className={`rounded-2xl border p-3 ${className}`}>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 font-semibold text-2xl">{value}</div>
    </div>
  );
}

function DamageControlPanel({
  monthlyPerformance,
}: {
  monthlyPerformance: ReturnType<typeof getMonthlyPerformanceModel>;
}) {
  const primaryReason = monthlyPerformance.planRiskReasons[0] ?? "Plan limits are under pressure";

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-2xl border border-destructive/25 bg-secondary/35 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">Damage control</div>
            <div className="text-muted-foreground text-xs">Do not calculate the target. Stabilize execution first.</div>
          </div>
          <Badge className="bg-destructive/10 text-destructive">Risk mode</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PlanTile label="Reason" value={primaryReason} />
          <PlanTile
            label="Review required"
            value={`${monthlyPerformance.reviewRequiredCount}/${monthlyPerformance.totalTrades}`}
          />
          <PlanTile label="Next trade mode" value="Reduced risk / A+ only" />
          <PlanTile
            label="Loss buffer left"
            value={formatUnsignedPercent(monthlyPerformance.safeRemainingRiskPercent)}
          />
        </div>
      </div>

      <RiskEfficiencyPanel monthlyPerformance={monthlyPerformance} />
    </div>
  );
}

function WhyItHappenedPanel({
  monthlyPerformance,
}: {
  monthlyPerformance: ReturnType<typeof getMonthlyPerformanceModel>;
}) {
  return (
    <div className="rounded-2xl border bg-secondary/35 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-medium">Why it happened</div>
          <p className="mt-1 text-muted-foreground text-sm">{monthlyPerformance.performanceCause}</p>
        </div>
        <div className="rounded-2xl border bg-background/40 px-3 py-2 text-sm">
          <div className="font-medium">Confidence: {monthlyPerformance.dataConfidence}</div>
          <div className="text-muted-foreground text-xs">{monthlyPerformance.dataConfidenceReason}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <PlanTile
          label="Rule-pressure trades"
          value={`${monthlyPerformance.rulePressureTrades} / ${formatSignedMoney(monthlyPerformance.rulePressureProfit)}`}
        />
        <PlanTile
          label="Clean trades"
          value={`${monthlyPerformance.ruleFollowingTrades} / ${formatSignedMoney(monthlyPerformance.ruleFollowingProfit)}`}
        />
        <PlanTile label="Pair read" value={monthlyPerformance.pairDiagnosis} />
        <PlanTile label="Expectancy" value={formatSignedPercent(monthlyPerformance.expectancy)} />
      </div>
    </div>
  );
}

function RiskEfficiencyPanel({
  monthlyPerformance,
}: {
  monthlyPerformance: ReturnType<typeof getMonthlyPerformanceModel>;
}) {
  return (
    <div className="rounded-2xl border bg-secondary/35 p-4">
      <div className="font-medium">Risk efficiency</div>
      <p className="mt-1 text-muted-foreground text-xs">{monthlyPerformance.riskEfficiencyInsight}</p>
      <div className="mt-3 grid gap-2">
        <CompactMetric
          label="Win rate"
          value={`${monthlyPerformance.winRate}% / ${monthlyPerformance.targetWinRate}%`}
        />
        <CompactMetric label="Avg win" value={formatSignedPercent(monthlyPerformance.avgWinPercent)} />
        <CompactMetric label="Avg loss" value={formatSignedPercent(-monthlyPerformance.avgLossPercent)} />
        <CompactMetric label="Expectancy" value={formatSignedPercent(monthlyPerformance.expectancy)} />
        <CompactMetric
          label="Review completion"
          value={`${monthlyPerformance.reviewCompletion}% (${monthlyPerformance.reviewedTrades}/${monthlyPerformance.totalTrades})`}
        />
      </div>
    </div>
  );
}

function PlanProgress({
  label,
  progress,
  tone = "primary",
  value,
}: {
  label: string;
  progress: number;
  tone?: "danger" | "primary";
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/35 p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <Progress value={progress} className={tone === "danger" ? "mt-3 [&>div]:bg-destructive" : "mt-3"} />
    </div>
  );
}

function PlanTile({ label, value }: { label: string; value: number | string }) {
  const isLongText = typeof value === "string" && value.length > 24;

  return (
    <div className="rounded-2xl border bg-background/35 p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className={isLongText ? "mt-1 font-semibold text-sm leading-snug" : "mt-1 font-semibold text-xl"}>
        {value}
      </div>
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/35 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function PerformanceQualityCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "danger" | "healthy" | "neutral";
  value: string;
}) {
  const toneClass =
    tone === "healthy"
      ? "border-[#22C55E]/20 bg-[#22C55E]/10"
      : tone === "danger"
        ? "border-destructive/20 bg-destructive/10"
        : "border-border bg-secondary/35";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 truncate font-semibold text-xl">{value}</div>
      <p className="mt-2 text-muted-foreground text-xs">{detail}</p>
    </div>
  );
}

function PairPerformanceRow({
  pair,
}: {
  pair: { label: string; losses: number; profit: number; rulePressureTrades: number; trades: number; wins: number };
}) {
  const winRate = pair.trades ? Math.round((pair.wins / pair.trades) * 100) : 0;

  return (
    <div className="grid gap-3 rounded-2xl border bg-secondary/35 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center">
      <div>
        <div className="font-medium">{pair.label}</div>
        <div className="text-muted-foreground text-xs">
          {pair.trades} trades - {pair.wins}W/{pair.losses}L
        </div>
      </div>
      <Badge variant="outline">{winRate}% WR</Badge>
      <Badge variant="outline">
        {pair.rulePressureTrades} rule-pressure trade{pair.rulePressureTrades === 1 ? "" : "s"}
      </Badge>
      <Badge className={pair.profit >= 0 ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-destructive/10 text-destructive"}>
        {formatSignedMoney(pair.profit)}
      </Badge>
      <Progress value={clamp(Math.abs(pair.profit))} className="min-w-24" />
    </div>
  );
}

function RiskRow({ label, severe, value }: { label: string; severe: boolean; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border bg-secondary/35 p-3">
      <div className="text-sm">{label}</div>
      <Badge className={severe ? "bg-destructive/10 text-destructive" : "bg-[#22C55E]/10 text-[#22C55E]"}>
        {value}
      </Badge>
    </div>
  );
}

function PatternBlock({ items, title, value }: { items: CountItem[]; title: string; value: string }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-secondary/35 p-3">
      <div>
        <div className="text-muted-foreground text-xs">{title}</div>
        <div className="mt-1 font-semibold capitalize">{value}</div>
      </div>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground capitalize">{item.label}</span>
              <span className="font-medium">{item.count}</span>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground text-xs">More reviewed trades will reveal this pattern.</div>
        )}
      </div>
    </div>
  );
}

function MiniEmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed bg-secondary/25 text-center">
      <div className="flex size-10 items-center justify-center rounded-2xl border bg-secondary font-semibold text-muted-foreground text-xs">
        CH
      </div>
      <div className="mt-3 font-medium">{title}</div>
      <p className="mt-1 max-w-xs text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function getToneClass(tone: "healthy" | "neutral" | "warning") {
  if (tone === "healthy") {
    return "rounded-full bg-[#22C55E]/10 text-[#22C55E]";
  }

  if (tone === "warning") {
    return "rounded-full bg-[#F59E0B]/10 text-[#F59E0B]";
  }

  return "rounded-full bg-primary/10 text-primary";
}

function getStatusClass(tone: "danger" | "healthy" | "neutral" | "warning") {
  if (tone === "danger") {
    return "rounded-full bg-destructive/10 text-destructive";
  }

  return getToneClass(tone);
}

function truncateText(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
