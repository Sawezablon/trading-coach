import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrimaryAnalysis, getTrades } from "@/lib/data/trades";

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
            const analysis = getPrimaryAnalysis(trade);
            return (
              <Link
                key={trade.id}
                href={`/dashboard/trades/${trade.id}`}
                className="grid gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 lg:grid-cols-[1fr_auto_auto_auto]"
              >
                <div>
                  <div className="font-medium">{trade.pair}</div>
                  <div className="text-muted-foreground text-sm">{new Date(trade.trade_taken_at).toLocaleString()}</div>
                </div>
                <Badge variant="outline">{trade.session}</Badge>
                <Badge
                  variant={trade.outcome === "win" ? "default" : trade.outcome === "loss" ? "destructive" : "secondary"}
                >
                  {trade.outcome}
                </Badge>
                <Badge variant={analysis?.rule_violations.length ? "destructive" : "secondary"}>
                  {analysis?.rule_violations.length ?? 0} violations
                </Badge>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
