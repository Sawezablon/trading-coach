import Link from "next/link";

import { DisciplineChart } from "@/app/(main)/dashboard/_components/discipline-chart";
import { TradeOutcomeBadge, TradeStatusBadge } from "@/components/trade-lifecycle-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateDashboardMetrics, getPrimaryAnalysis, getTrades } from "@/lib/data/trades";
import { formatTradeDateTime } from "@/lib/format-trade-time";

export default async function Page() {
  const trades = await getTrades();
  const metrics = calculateDashboardMetrics(trades);
  const chartData = trades
    .slice(0, 7)
    .reverse()
    .map((trade) => ({
      pair: trade.pair,
      discipline: getPrimaryAnalysis(trade)?.discipline_score ?? 0,
    }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">Qyvex Edge</div>
          <h1 className="font-semibold text-4xl tracking-tight">Discipline dashboard</h1>
          <p className="max-w-2xl text-muted-foreground text-sm">
            Track execution quality, rule adherence, and recent journal activity.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/upload">Log trade</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Discipline" value={`${metrics.avgDiscipline}%`} signal="DS" featured />
        <MetricCard title="Win rate" value={`${metrics.winRate}%`} signal="WR" />
        <MetricCard title="Total P/L" value={metrics.totalProfitLoss} signal="PL" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total trades" value={metrics.totalTrades} signal="TR" compact />
        <MetricCard title="Open" value={metrics.openTrades} signal="OP" compact />
        <MetricCard title="Closed" value={metrics.closedTrades} signal="CL" compact />
        <MetricCard title="Avg final RR" value={`${metrics.averageFinalRr}R`} signal="RR" compact />
        <MetricCard title="Wins" value={metrics.wins} signal="W" compact />
        <MetricCard title="Losses" value={metrics.losses} signal="L" compact />
        <MetricCard title="Breakevens" value={metrics.breakevens} signal="BE" compact />
        <MetricCard title="Violation rate" value={`${metrics.ruleViolationRate}%`} signal="RV" compact />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader>
            <CardTitle>Discipline trend</CardTitle>
          </CardHeader>
          <CardContent>
            <DisciplineChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-secondary/80 xl:col-span-5">
          <CardHeader>
            <CardTitle>AI feedback panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FeedbackBlock label="Strengths" items={["Rules are explicit", "Most risk is documented before review"]} />
            <FeedbackBlock label="Weaknesses" items={["Early entries", "Occasional session drift"]} />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Current discipline score</span>
                <span className="font-medium">{metrics.avgDiscipline}%</span>
              </div>
              <Progress value={metrics.avgDiscipline} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent trades</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/journal">View journal</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          {trades.slice(0, 5).map((trade) => {
            const analysis = getPrimaryAnalysis(trade);
            return (
              <Link
                key={trade.id}
                href={`/dashboard/trades/${trade.id}`}
                className="grid gap-3 rounded-2xl border border-border/80 bg-secondary/40 p-4 transition-colors hover:border-primary/30 hover:bg-card md:grid-cols-[1fr_auto_auto_auto]"
              >
                <div>
                  <div className="font-medium">{trade.pair}</div>
                  <div className="text-muted-foreground text-sm">
                    {formatTradeDateTime(trade.trade_taken_at, trade.trade_timezone)} - {trade.session} session -{" "}
                    {trade.risk_percent}% risk - {trade.rr}R
                  </div>
                </div>
                <TradeStatusBadge status={trade.status} />
                <TradeOutcomeBadge outcome={trade.outcome} />
                <Badge variant="outline">{analysis?.discipline_score ?? 0}% discipline</Badge>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  signal,
  featured = false,
  compact = false,
}: {
  title: string;
  value: string | number;
  signal: string;
  featured?: boolean;
  compact?: boolean;
}) {
  return (
    <Card className={featured ? "border-primary/25 bg-gradient-to-br from-primary/15 to-card" : ""}>
      <CardContent
        className={
          compact ? "flex items-center justify-between gap-3 p-4" : "flex items-center justify-between gap-4 p-5"
        }
      >
        <div>
          <div className="text-muted-foreground text-sm">{title}</div>
          <div className={featured ? "mt-2 font-semibold text-4xl tracking-tight" : "mt-1 font-semibold text-2xl"}>
            {value}
          </div>
        </div>
        <div className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-secondary font-medium text-muted-foreground text-xs">
          {signal}
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="outline">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
