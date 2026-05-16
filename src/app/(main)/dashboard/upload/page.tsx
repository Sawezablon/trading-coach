import { TradeUploadForm } from "@/app/(main)/dashboard/upload/_components/trade-upload-form";
import { getMt5AccountContext } from "@/lib/data/mt5";
import { getRules, getTrades } from "@/lib/data/trades";

export default async function Page() {
  const [rules, trades, accountContext] = await Promise.all([getRules(), getTrades(), getMt5AccountContext()]);
  const tradeTimestamps = accountContext.selectedConnectionId
    ? trades
        .filter((trade) => trade.mt5_connection_id === accountContext.selectedConnectionId)
        .map((trade) => trade.trade_taken_at)
    : trades.map((trade) => trade.trade_taken_at);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <div className="text-muted-foreground text-sm">Execution journal</div>
        <h1 className="font-semibold text-4xl tracking-tight">Log a trade</h1>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Upload a screenshot and journal the decision. Qyvex Edge checks the entry against your rules.
        </p>
      </div>
      <TradeUploadForm
        rules={rules}
        tradeTimestamps={tradeTimestamps}
        connections={accountContext.connections}
        selectedConnectionId={accountContext.selectedConnectionId}
      />
    </div>
  );
}
