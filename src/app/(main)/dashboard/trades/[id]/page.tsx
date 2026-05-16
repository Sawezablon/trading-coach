import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteTradeButton } from "@/app/(main)/dashboard/trades/_components/delete-trade-button";
import { TradeOutcomeBadge, TradeReviewBadge, TradeStatusBadge } from "@/components/trade-lifecycle-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getPrimaryAnalysis, getTrade } from "@/lib/data/trades";
import { formatEmotions } from "@/lib/emotions";
import { formatTradeDateTime, getTradeTimeZone } from "@/lib/format-trade-time";
import { getSystemReviewItems, getSystemReviewScore } from "@/lib/system-review";

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = await getTrade(id);

  if (!trade) {
    notFound();
  }

  const analysis = getPrimaryAnalysis(trade);
  const tradeDateTime = formatTradeDateTime(trade.trade_taken_at, trade.trade_timezone);
  const closedDateTime = trade.closed_at ? formatTradeDateTime(trade.closed_at, trade.trade_timezone) : null;
  const tradeTimezone = getTradeTimeZone(trade);
  const estimatedRiskPercent =
    trade.estimated_risk_percent === null ? null : `${Number(trade.estimated_risk_percent).toFixed(2)}%`;
  const estimatedRiskAmount =
    trade.estimated_risk_amount === null
      ? null
      : `${trade.account_currency ? `${trade.account_currency} ` : ""}${Number(trade.estimated_risk_amount).toFixed(2)}`;
  const systemReviewItems = getSystemReviewItems(trade.system_analysis);
  const systemReviewScore = getSystemReviewScore(trade.system_analysis);

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="text-muted-foreground text-sm">Trade details</div>
            <h1 className="font-semibold text-4xl tracking-tight">{trade.pair}</h1>
            <div className="flex flex-wrap gap-2">
              <TradeStatusBadge status={trade.status} />
              <TradeOutcomeBadge outcome={trade.outcome} />
              <TradeReviewBadge status={trade.review_status} />
              {trade.synced_from_mt5 ? <Badge variant="outline">MT5 synced</Badge> : null}
            </div>
            <p className="text-muted-foreground text-sm">
              {tradeDateTime} - {tradeTimezone}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/trades/${trade.id}/edit`}>
                {trade.review_status === "needs_review" ? "Complete Review" : "Edit"}
              </Link>
            </Button>
            <DeleteTradeButton tradeId={trade.id} />
          </div>
        </div>

        {trade.review_status === "needs_review" ? (
          <Card className="border-[#F59E0B]/25 bg-[#F59E0B]/10">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">This MT5 trade needs your review</div>
                <p className="mt-1 text-muted-foreground text-sm">
                  Broker facts are already filled. Add emotions, notes, screenshot, and checklist confirmations.
                </p>
              </div>
              <Button asChild>
                <Link href={`/dashboard/trades/${trade.id}/edit`}>Complete Review</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Entry details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Info label="Pair" value={trade.pair} />
            <Info label="Direction" value={trade.direction} />
            <Info label="Entry date/time" value={tradeDateTime} />
            <Info label="Entry price" value={trade.entry_price} />
            <Info label="Stop loss" value={trade.stop_loss} />
            <Info label="Take profit" value={trade.take_profit} />
            <Info label="Lot size" value={trade.lot_size} />
            <Info label="MT5 broker" value={trade.mt5_broker} />
            <Info label="MT5 account" value={trade.mt5_account} />
            <Info label="Risk" value={`${trade.risk_percent}%`} />
            <Info label="Estimated risk amount" value={estimatedRiskAmount} />
            <Info label="Estimated risk method" value={formatRiskMethod(trade.risk_calculation_method)} />
            <Info
              label="Account balance at sync"
              value={formatCurrency(trade.account_balance_at_sync, trade.account_currency)}
            />
            <Info label="Planned RR" value={`${trade.rr}R`} />
            <Info label="Session" value={trade.session} />
            <Info label="Confirmation" value={trade.confirmation ? "Yes" : "No"} />
            <Info label="Estimated risk %" value={estimatedRiskPercent} />
            <div className="space-y-1 md:col-span-2">
              <div className="text-muted-foreground text-sm">Emotions before trade</div>
              <div>{formatEmotions(trade.emotions)}</div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-muted-foreground text-sm">Entry notes</div>
              <div className="leading-relaxed">{trade.notes}</div>
            </div>
          </CardContent>
        </Card>

        {trade.status === "closed" ? (
          <Card className="border-primary/15 bg-gradient-to-br from-card to-secondary/80">
            <CardHeader>
              <CardTitle>Close details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="Outcome" value={trade.outcome} />
              <Info label="Close price" value={trade.close_price} />
              <Info label="Closed date/time" value={closedDateTime} />
              <Info
                label="Profit/loss %"
                value={trade.profit_loss_percent === null ? null : `${trade.profit_loss_percent}%`}
              />
              <Info label="Profit/loss amount" value={trade.profit_loss_amount} />
              <Info label="Commission" value={trade.commission} />
              <Info label="Swap" value={trade.swap} />
              <Info label="Final RR" value={trade.final_rr === null ? null : `${trade.final_rr}R`} />
              <div className="space-y-1 md:col-span-2">
                <div className="text-muted-foreground text-sm">Closing notes</div>
                <div className="leading-relaxed">{trade.closing_notes || "No closing notes recorded."}</div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Qyvex system review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemReviewItems.length ? (
              <>
                <Score label="System fact score" value={systemReviewScore} />
                <div className="grid gap-3">
                  {systemReviewItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border bg-secondary/30 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">{item.label}</div>
                        <Badge className={getSystemStatusClass(item.status)}>{item.status}</Badge>
                      </div>
                      <div className="mt-1 text-muted-foreground text-sm">{item.detail}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">
                No automatic system review has been generated for this trade yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Score label="Checklist completion" value={trade.checklist_completion_rate ?? 0} />
            <Score label="Discipline score" value={trade.discipline_score ?? analysis?.discipline_score ?? 0} />
            <ChecklistBlock
              label="Passed items"
              items={(trade.checklist_results ?? []).filter((item) => item.status === "passed")}
            />
            <ChecklistBlock
              label="Failed items"
              items={(trade.checklist_results ?? []).filter((item) => item.status === "failed")}
            />
            <ChecklistBlock
              label="Manual confirmations"
              items={(trade.checklist_results ?? []).filter((item) => item.type === "manual")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Screenshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
              {trade.screenshot_url ? (
                // biome-ignore lint/performance/noImgElement: screenshots can come from user-configured Supabase domains.
                <img
                  src={trade.screenshot_url}
                  alt={`${trade.pair} trade chart`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-muted-foreground text-sm">No screenshot stored for this trade</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 xl:col-span-5">
        <Card>
          <CardHeader>
            <CardTitle>AI analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Score label="Setup quality" value={analysis?.setup_quality_score ?? 0} />
            <Score label="Discipline" value={analysis?.discipline_score ?? 0} />
            <ListBlock label="Strengths" items={analysis?.strengths ?? []} />
            <ListBlock label="Rule violations" items={analysis?.rule_violations ?? []} />
            <ListBlock label="Improvement suggestions" items={analysis?.improvement_suggestions ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="capitalize">{value ?? "Not recorded"}</div>
    </div>
  );
}

function formatCurrency(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return `${currency ? `${currency} ` : ""}${Number(value).toFixed(2)}`;
}

function formatRiskMethod(method: string | null | undefined) {
  if (!method) {
    return null;
  }

  const labels: Record<string, string> = {
    insufficient_data: "Needs MT5 symbol specs",
    missing_stop_loss: "No stop loss set",
    mt5_symbol_specs: "MT5 balance and symbol specs",
  };

  return labels[method] ?? method.replaceAll("_", " ");
}

function getSystemStatusClass(status: string) {
  if (status === "passed") {
    return "bg-[#22C55E]/10 text-[#22C55E]";
  }

  if (status === "failed") {
    return "bg-destructive/10 text-destructive";
  }

  if (status === "warning") {
    return "bg-[#F59E0B]/10 text-[#F59E0B]";
  }

  return "bg-primary/10 text-primary";
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-medium text-sm">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <Badge key={item} variant="outline">
              {item}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground text-sm">No items recorded.</span>
        )}
      </div>
    </div>
  );
}

function ChecklistBlock({
  label,
  items,
}: {
  label: string;
  items: { id: string; label: string; status: string; type: string }[];
}) {
  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">{label}</div>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <span>{item.label}</span>
              <Badge variant={item.status === "passed" ? "secondary" : "destructive"}>{item.status}</Badge>
            </div>
          ))
        ) : (
          <span className="text-muted-foreground text-sm">No items recorded.</span>
        )}
      </div>
    </div>
  );
}
