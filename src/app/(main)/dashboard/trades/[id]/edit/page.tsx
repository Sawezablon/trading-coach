import { notFound } from "next/navigation";

import { TradeUploadForm } from "@/app/(main)/dashboard/upload/_components/trade-upload-form";
import { getRules, getTrade, getTrades } from "@/lib/data/trades";

export default async function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [trade, rules, trades] = await Promise.all([getTrade(id), getRules(), getTrades()]);

  if (!trade) {
    notFound();
  }

  const tradeTimestamps = trades.filter((item) => item.id !== trade.id).map((item) => item.trade_taken_at);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Edit trade</h1>
        <p className="text-muted-foreground text-sm">Update the entry plan, close details, or journal notes.</p>
      </div>
      <TradeUploadForm rules={rules} tradeTimestamps={tradeTimestamps} initialTrade={trade} />
    </div>
  );
}
