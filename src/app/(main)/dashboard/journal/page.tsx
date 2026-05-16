import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

import { DeleteTradeButton } from "@/app/(main)/dashboard/trades/_components/delete-trade-button";
import { Mt5AccountSwitcher } from "@/components/mt5-account-switcher";
import { TradeOutcomeBadge, TradeReviewBadge, TradeStatusBadge } from "@/components/trade-lifecycle-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMt5AccountContext } from "@/lib/data/mt5";
import { getTrades } from "@/lib/data/trades";
import { formatTradeDateTime } from "@/lib/format-trade-time";
import { getMt5ConnectionLabel } from "@/lib/mt5-label";

const filters = [
  { label: "All", value: "all" },
  { label: "Needs Review", value: "needs-review" },
  { label: "MT5 Synced", value: "mt5" },
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
  { label: "Wins", value: "wins" },
  { label: "Losses", value: "losses" },
];

export const dynamic = "force-dynamic";

function filterTrades(trades: Awaited<ReturnType<typeof getTrades>>, filter: string) {
  switch (filter) {
    case "needs-review":
      return trades.filter((trade) => trade.review_status === "needs_review");
    case "mt5":
      return trades.filter((trade) => trade.synced_from_mt5);
    case "open":
      return trades.filter((trade) => trade.status === "open");
    case "closed":
      return trades.filter((trade) => trade.status === "closed");
    case "wins":
      return trades.filter((trade) => trade.outcome === "win");
    case "losses":
      return trades.filter((trade) => trade.outcome === "loss");
    default:
      return trades;
  }
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  noStore();

  const [trades, accountContext] = await Promise.all([getTrades(), getMt5AccountContext()]);
  const { connections, selectedConnection, selectedConnectionId } = accountContext;
  const { filter = "all" } = await searchParams;
  const currentFilter = filters.find((item) => item.value === filter) ?? filters[0];
  const accountTrades = selectedConnectionId
    ? trades.filter((trade) => trade.mt5_connection_id === selectedConnectionId)
    : trades;
  const visibleTrades = filterTrades(accountTrades, filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">Journal</div>
          <h1 className="font-semibold text-4xl tracking-tight">Trade journal</h1>
          <p className="max-w-2xl text-muted-foreground text-sm">
            Review trades, notes, emotions, and AI discipline feedback for the active account.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <Mt5AccountSwitcher connections={connections} selectedConnectionId={selectedConnectionId} />
          <Button asChild>
            <Link href="/dashboard/upload">Log trade</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{currentFilter.label}</CardTitle>
              <p className="mt-1 text-muted-foreground text-sm">
                {selectedConnection ? getMt5ConnectionLabel(selectedConnection) : "All journal trades"}
              </p>
            </div>
            <Badge variant="outline">{visibleTrades.length} shown</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <Button
                key={item.value}
                asChild
                size="sm"
                variant={filter === item.value ? "default" : "outline"}
                className="rounded-full"
              >
                <Link href={item.value === "all" ? "/dashboard/journal" : `/dashboard/journal?filter=${item.value}`}>
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleTrades.length ? (
            visibleTrades.map((trade) => {
              return (
                <div
                  key={trade.id}
                  className="grid gap-4 rounded-2xl border border-border/80 bg-secondary/40 p-4 transition-colors hover:border-primary/30 hover:bg-card xl:grid-cols-[1.2fr_auto_auto_auto_auto_auto_auto]"
                >
                  <div>
                    <div className="font-medium">
                      {trade.pair} <span className="text-muted-foreground text-xs uppercase">{trade.direction}</span>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {formatTradeDateTime(trade.trade_taken_at, trade.trade_timezone)}
                    </div>
                    <div className="mt-1 text-muted-foreground text-xs">
                      Risk {trade.risk_percent}% - planned {trade.rr}R
                      {trade.status === "closed" && trade.final_rr !== null ? ` - final ${trade.final_rr}R` : ""}
                    </div>
                  </div>
                  <TradeStatusBadge status={trade.status} />
                  <TradeOutcomeBadge outcome={trade.outcome} />
                  <TradeReviewBadge status={trade.review_status} />
                  {trade.synced_from_mt5 ? (
                    <Badge variant="outline">
                      {trade.mt5_broker ?? "MT5"} {trade.mt5_account ? `/ ${trade.mt5_account}` : ""}
                    </Badge>
                  ) : null}
                  <Badge variant="outline">{trade.discipline_score ?? 0}% discipline</Badge>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/trades/${trade.id}`}>
                        {trade.review_status === "needs_review" ? "Review" : "Open"}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/trades/${trade.id}/edit`}>Edit</Link>
                    </Button>
                    <DeleteTradeButton tradeId={trade.id} compact />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <div className="font-medium">
                {accountTrades.length ? "No trades match this filter" : "No trades logged for this account yet"}
              </div>
              <p className="mt-2 text-muted-foreground text-sm">
                {accountTrades.length
                  ? "Try a different journal view or complete more trade reviews."
                  : "Trades for the active account will appear here after sync or manual logging."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
