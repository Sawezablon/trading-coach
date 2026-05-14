import Link from "next/link";

import { DisciplineChart } from "@/app/(main)/dashboard/_components/discipline-chart";
import { TradeOutcomeBadge, TradeStatusBadge } from "@/components/trade-lifecycle-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateDashboardMetrics, getPrimaryAnalysis, getTrades } from "@/lib/data/trades";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Discipline dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Track execution quality, rule adherence, and recent journal activity.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/upload">Log trade</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total trades" value={metrics.totalTrades} signal="TR" />
        <MetricCard title="Open trades" value={metrics.openTrades} signal="OP" />
        <MetricCard title="Closed trades" value={metrics.closedTrades} signal="CL" />
        <MetricCard title="Wins" value={metrics.wins} signal="W" />
        <MetricCard title="Losses" value={metrics.losses} signal="L" />
        <MetricCard title="Breakevens" value={metrics.breakevens} signal="BE" />
        <MetricCard title="Win rate" value={`${metrics.winRate}%`} signal="WR" />
        <MetricCard title="Avg final RR" value={`${metrics.averageFinalRr}R`} signal="RR" />
        <MetricCard title="Total P/L" value={metrics.totalProfitLoss} signal="PL" />
        <MetricCard title="Violation rate" value={`${metrics.ruleViolationRate}%`} signal="RV" />
        <MetricCard title="Discipline" value={`${metrics.avgDiscipline}%`} signal="DS" />
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

        <Card className="xl:col-span-5">
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
                className="grid gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 md:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <div className="font-medium">{trade.pair}</div>
                  <div className="text-muted-foreground text-sm">
                    {new Date(trade.trade_taken_at).toLocaleString()} - {trade.session} session - {trade.risk_percent}%
                    risk - {trade.rr}R
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

function MetricCard({ title, value, signal }: { title: string; value: string | number; signal: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-muted-foreground text-sm">{title}</div>
          <div className="mt-1 font-semibold text-2xl">{value}</div>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-muted font-medium text-muted-foreground text-xs">
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
