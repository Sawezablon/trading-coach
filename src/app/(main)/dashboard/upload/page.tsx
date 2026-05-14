import { TradeUploadForm } from "@/app/(main)/dashboard/upload/_components/trade-upload-form";
import { getRules, getTrades } from "@/lib/data/trades";

export default async function Page() {
  const [rules, trades] = await Promise.all([getRules(), getTrades()]);
  const tradeTimestamps = trades.map((trade) => trade.trade_taken_at);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Log a trade</h1>
        <p className="text-muted-foreground text-sm">
          Upload a screenshot and journal the decision. Qyvex Edge checks the entry against your rules.
        </p>
      </div>
      <TradeUploadForm rules={rules} tradeTimestamps={tradeTimestamps} />
    </div>
  );
}
