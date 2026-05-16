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
import { calculateDashboardMetrics, getPrimaryAnalysis, getTrades } from "@/lib/data/trades";
import { getEmotionRisk, parseEmotionValues } from "@/lib/emotions";
import { formatTradeDateTime } from "@/lib/format-trade-time";
import { getMt5ConnectionLabel } from "@/lib/mt5-label";
import type { TradeWithAnalysis } from "@/lib/supabase/types";
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

function getDashboardModel(trades: TradeWithAnalysis[]) {
  const metrics = calculateDashboardMetrics(trades);
  const todayTrades = trades.filter((trade) => isToday(trade.trade_taken_at));
  const todayDiscipline = average(todayTrades.map(getTradeDiscipline));
  const reviewCompletion = trades.length
    ? Math.round(((trades.length - metrics.needsReviewTrades) / trades.length) * 100)
    : 0;
  const ruleAdherence = Math.max(0, 100 - metrics.ruleViolationRate);
  const highRiskEmotionTrades = trades.filter((trade) => getEmotionRisk(trade.emotions) === "high-risk");
  const warningEmotionTrades = trades.filter((trade) => getEmotionRisk(trade.emotions) === "warning");
  const emotionCounts = countBy(trades.flatMap((trade) => parseEmotionValues(trade.emotions)));
  const sessionCounts = countBy(trades.map((trade) => trade.session).filter(Boolean));
  const failedRuleCounts = countBy(trades.flatMap((trade) => trade.failed_rules ?? []));
  const mostFailedRule = failedRuleCounts[0]?.label ?? "No recurring rule break";
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

  return {
    behaviorState,
    behaviorTone,
    dominantEmotion,
    disciplineIntelligence,
    emotionCounts,
    failedRuleCounts,
    highRiskEmotionTrades,
    metrics,
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

  const [allTrades, accountContext] = await Promise.all([getTrades(), getMt5AccountContext()]);
  const { connections, selectedConnection, selectedConnectionId } = accountContext;
  const trades = getFilteredTrades({
    selectedConnectionId,
    trades: allTrades,
  });
  const model = getDashboardModel(trades);
  const { metrics } = model;
  const chartData = trades
    .slice(0, 8)
    .reverse()
    .map((trade) => ({
      pair: trade.pair,
      discipline: getTradeDiscipline(trade),
    }));

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
            <PerformanceAnalytics chartData={chartData} model={model} />
          </section>

          <section className="grid gap-4 xl:grid-cols-12">
            <RiskMonitoring model={model} />
            <TradingTimeline trades={trades.slice(0, 6)} />
            <BehaviorPatterns model={model} />
          </section>

          <RecentTrades trades={trades.slice(0, 5)} />
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

function DailySnapshotHero({
  connection,
  model,
}: {
  connection: Mt5ConnectionStatus | null;
  model: ReturnType<typeof getDashboardModel>;
}) {
  const { behaviorState, behaviorTone, metrics, reviewCompletion, ruleAdherence, todayDiscipline, todayTrades } = model;
  const heroScore = todayTrades.length ? todayDiscipline : metrics.avgDiscipline;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgb(124_92_255/0.20),transparent_32%),linear-gradient(135deg,rgb(23_24_28),rgb(10_10_11))] p-5 shadow-[0_30px_120px_rgb(0_0_0/0.28)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getToneClass(behaviorTone)}>{behaviorState}</Badge>
            <Badge variant="outline" className="rounded-full bg-background/40">
              {todayTrades.length} trades today
            </Badge>
          </div>

          <div>
            <div className="text-muted-foreground text-sm">Daily discipline snapshot</div>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <div className="font-semibold text-7xl tracking-tight sm:text-8xl">{heroScore}%</div>
              <div className="mb-3 max-w-sm text-muted-foreground text-sm">
                {getHeroNarrative({ heroScore, todayTrades: todayTrades.length, violations: metrics.ruleViolations })}
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

function PerformanceAnalytics({
  chartData,
  model,
}: {
  chartData: { pair: string; discipline: number }[];
  model: ReturnType<typeof getDashboardModel>;
}) {
  const { metrics } = model;

  return (
    <Card className="xl:col-span-7">
      <CardHeader>
        <SectionEyebrow icon={<IconMark text="PA" />}>Performance Analytics</SectionEyebrow>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Performance without losing the plot</CardTitle>
            <CardDescription>Outcome metrics are useful, but only after behavior is clear.</CardDescription>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniMetric label="Closed" value={metrics.closedTrades} />
            <MiniMetric label="Avg RR" value={`${metrics.averageFinalRr}R`} />
            <MiniMetric label="P/L" value={metrics.totalProfitLoss} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {chartData.length ? (
          <PremiumDisciplineBars data={chartData} />
        ) : (
          <MiniEmptyState title="No trend yet" description="Review trades to build a discipline trend." />
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <OutcomeTile label="Wins" value={metrics.wins} className="border-[#22C55E]/20 bg-[#22C55E]/10" />
          <OutcomeTile label="Losses" value={metrics.losses} className="border-destructive/20 bg-destructive/10" />
          <OutcomeTile label="Breakevens" value={metrics.breakevens} className="border-[#F59E0B]/20 bg-[#F59E0B]/10" />
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

function TradingTimeline({ trades }: { trades: TradeWithAnalysis[] }) {
  return (
    <Card className="xl:col-span-4">
      <CardHeader>
        <SectionEyebrow icon={<IconMark text="TL" />}>Trading Timeline</SectionEyebrow>
        <CardTitle>Latest account actions</CardTitle>
        <CardDescription>A calm feed of your most recent execution behavior.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {trades.map((trade) => (
          <Link key={trade.id} href={`/dashboard/trades/${trade.id}`} className="group grid grid-cols-[auto_1fr] gap-3">
            <div className="mt-1 flex flex-col items-center">
              <div className="size-2.5 rounded-full bg-primary shadow-[0_0_18px_rgb(124_92_255/0.45)]" />
              <div className="mt-2 h-full min-h-10 w-px bg-border group-last:hidden" />
            </div>
            <div className="rounded-2xl border bg-secondary/35 p-3 transition-colors group-hover:border-primary/35 group-hover:bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{trade.pair}</div>
                <Badge variant="outline">{getTradeDiscipline(trade)}%</Badge>
              </div>
              <div className="mt-1 text-muted-foreground text-xs">
                {formatTradeDateTime(trade.trade_taken_at, trade.trade_timezone)} - {trade.session}
              </div>
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
  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionEyebrow icon={<IconMark text="RT" />}>Recent Trades</SectionEyebrow>
          <CardTitle>Review queue and latest decisions</CardTitle>
          <CardDescription>Compact trade cards built for fast scanning.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/journal">View journal</Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {trades.map((trade) => {
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
  return (
    <Card className="overflow-hidden border-dashed bg-gradient-to-br from-card to-secondary/50">
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
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

  return (
    <div className="mt-3 flex items-end gap-1.5">
      {scores.map((score, index) => (
        <div
          key={`${score}-${index}`}
          className={
            score >= 80
              ? "h-8 flex-1 rounded-full bg-[#22C55E]/80"
              : score >= 60
                ? "h-8 flex-1 rounded-full bg-primary/80"
                : "h-8 flex-1 rounded-full bg-[#F59E0B]/80"
          }
          style={{ opacity: Math.max(0.35, score / 100) }}
          title={`${score}%`}
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
              <span className="truncate capitalize text-muted-foreground">{item.label}</span>
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

function PremiumDisciplineBars({ data }: { data: { pair: string; discipline: number }[] }) {
  return (
    <div className="flex h-[260px] items-end gap-2 rounded-2xl border bg-secondary/25 p-4 sm:gap-3">
      {data.map((item) => (
        <div key={`${item.pair}-${item.discipline}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-44 w-full items-end rounded-full bg-background/60 p-1">
            <div
              className="w-full rounded-full bg-gradient-to-t from-primary to-[#5EEAD4] shadow-[0_0_28px_rgb(124_92_255/0.22)] transition-all"
              style={{ height: `${Math.max(8, Math.min(100, item.discipline))}%` }}
            />
          </div>
          <div className="w-full truncate text-center text-muted-foreground text-xs">{item.pair}</div>
          <div className="font-medium text-xs">{item.discipline}%</div>
        </div>
      ))}
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

function getHeroNarrative({
  heroScore,
  todayTrades,
  violations,
}: {
  heroScore: number;
  todayTrades: number;
  violations: number;
}) {
  if (!todayTrades) {
    return "No trades logged today. Use this calm window to review your plan before the next setup.";
  }

  if (heroScore >= 80 && violations === 0) {
    return "Strong discipline profile today. Keep the same patience and repeatable process.";
  }

  if (violations > 0) {
    return "There are rule breaks to review. Slow the next decision down and protect the plan.";
  }

  return "Execution is forming. Review the latest decisions and tighten any weak checklist items.";
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
