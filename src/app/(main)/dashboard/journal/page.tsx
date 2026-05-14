import Link from "next/link";

import { DeleteTradeButton } from "@/app/(main)/dashboard/trades/_components/delete-trade-button";
import { TradeOutcomeBadge, TradeStatusBadge } from "@/components/trade-lifecycle-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrades } from "@/lib/data/trades";

export default async function JournalPage() {
  const trades = await getTrades();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Trade journal</h1>
          <p className="text-muted-foreground text-sm">Review trades, notes, emotions, and AI discipline feedback.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/upload">Log trade</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All trades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trades.map((trade) => {
            return (
              <div
                key={trade.id}
                className="grid gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 xl:grid-cols-[1.2fr_auto_auto_auto_auto]"
              >
                <div>
                  <div className="font-medium">
                    {trade.pair} <span className="text-muted-foreground text-xs uppercase">{trade.direction}</span>
                  </div>
                  <div className="text-muted-foreground text-sm">{new Date(trade.trade_taken_at).toLocaleString()}</div>
                  <div className="mt-1 text-muted-foreground text-xs">
                    Risk {trade.risk_percent}% - planned {trade.rr}R
                    {trade.status === "closed" && trade.final_rr !== null ? ` - final ${trade.final_rr}R` : ""}
                  </div>
                </div>
                <TradeStatusBadge status={trade.status} />
                <TradeOutcomeBadge outcome={trade.outcome} />
                <Badge variant="outline">{trade.discipline_score ?? 0}% discipline</Badge>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/trades/${trade.id}`}>Open</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/trades/${trade.id}/edit`}>Edit</Link>
                  </Button>
                  <DeleteTradeButton tradeId={trade.id} compact />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
