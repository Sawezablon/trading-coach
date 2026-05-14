import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteTradeButton } from "@/app/(main)/dashboard/trades/_components/delete-trade-button";
import { TradeOutcomeBadge, TradeStatusBadge } from "@/components/trade-lifecycle-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getPrimaryAnalysis, getTrade } from "@/lib/data/trades";

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = await getTrade(id);

  if (!trade) {
    notFound();
  }

  const analysis = getPrimaryAnalysis(trade);
  const tradeTakenAt = new Date(trade.trade_taken_at);
  const closedAt = trade.closed_at ? new Date(trade.closed_at) : null;

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl tracking-tight">{trade.pair}</h1>
            <div className="flex flex-wrap gap-2">
              <TradeStatusBadge status={trade.status} />
              <TradeOutcomeBadge outcome={trade.outcome} />
            </div>
            <p className="text-muted-foreground text-sm">{tradeTakenAt.toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/trades/${trade.id}/edit`}>Edit</Link>
            </Button>
            <DeleteTradeButton tradeId={trade.id} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entry details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Info label="Pair" value={trade.pair} />
            <Info label="Direction" value={trade.direction} />
            <Info label="Entry date/time" value={tradeTakenAt.toLocaleString()} />
            <Info label="Entry price" value={trade.entry_price} />
            <Info label="Stop loss" value={trade.stop_loss} />
            <Info label="Take profit" value={trade.take_profit} />
            <Info label="Risk" value={`${trade.risk_percent}%`} />
            <Info label="Planned RR" value={`${trade.rr}R`} />
            <Info label="Session" value={trade.session} />
            <Info label="Confirmation" value={trade.confirmation ? "Yes" : "No"} />
            <div className="space-y-1 md:col-span-2">
              <div className="text-muted-foreground text-sm">Emotions before trade</div>
              <div>{trade.emotions}</div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-muted-foreground text-sm">Entry notes</div>
              <div className="leading-relaxed">{trade.notes}</div>
            </div>
          </CardContent>
        </Card>

        {trade.status === "closed" ? (
          <Card>
            <CardHeader>
              <CardTitle>Close details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="Outcome" value={trade.outcome} />
              <Info label="Close price" value={trade.close_price} />
              <Info label="Closed date/time" value={closedAt?.toLocaleString() ?? null} />
              <Info
                label="Profit/loss %"
                value={trade.profit_loss_percent === null ? null : `${trade.profit_loss_percent}%`}
              />
              <Info label="Profit/loss amount" value={trade.profit_loss_amount} />
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
