export type SystemReviewStatus = "passed" | "warning" | "failed" | "info";

export type SystemReviewItem = {
  id: string;
  label: string;
  status: SystemReviewStatus;
  severity: "low" | "medium" | "high";
  detail: string;
};

export type SystemTradeReview = {
  score: number;
  generated_at: string;
  items: SystemReviewItem[];
  summary: string;
};

type TradeFacts = {
  account_balance_at_sync?: number | null;
  account_currency?: string | null;
  estimated_risk_amount?: number | null;
  estimated_risk_percent?: number | null;
  profit_loss_amount?: number | null;
  risk_calculation_method?: string | null;
  status?: string | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  trade_taken_at?: string | null;
};

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined) {
    return "unknown";
  }

  return `${currency ? `${currency} ` : ""}${Number(value).toFixed(2)}`;
}

function item(
  id: string,
  label: string,
  status: SystemReviewStatus,
  severity: SystemReviewItem["severity"],
  detail: string,
): SystemReviewItem {
  return {
    id,
    label,
    status,
    severity,
    detail,
  };
}

export function evaluateSystemTradeReview(
  trade: TradeFacts,
  generatedAt = new Date().toISOString(),
): SystemTradeReview {
  const items: SystemReviewItem[] = [];
  const hasStopLoss = Number(trade.stop_loss ?? 0) > 0;
  const hasTakeProfit = Number(trade.take_profit ?? 0) > 0;
  const estimatedRisk = trade.estimated_risk_percent;

  items.push(
    item(
      "stop-loss",
      "Stop loss present",
      hasStopLoss ? "passed" : "failed",
      "high",
      hasStopLoss ? "MT5 reported a stop loss for this trade." : "No stop loss was reported by MT5.",
    ),
  );

  items.push(
    item(
      "take-profit",
      "Take profit present",
      hasTakeProfit ? "passed" : "warning",
      "medium",
      hasTakeProfit ? "MT5 reported a take profit for this trade." : "No take profit was reported by MT5.",
    ),
  );

  if (trade.risk_calculation_method === "mt5_symbol_specs" && estimatedRisk !== null && estimatedRisk !== undefined) {
    const status: SystemReviewStatus = estimatedRisk > 2 ? "warning" : "passed";
    items.push(
      item(
        "estimated-risk",
        "Estimated risk from MT5 facts",
        status,
        estimatedRisk > 2 ? "high" : "medium",
        `Estimated ${estimatedRisk.toFixed(2)}% risk (${money(
          trade.estimated_risk_amount,
          trade.account_currency,
        )}) using account balance ${money(trade.account_balance_at_sync, trade.account_currency)}.`,
      ),
    );
  } else {
    items.push(
      item(
        "estimated-risk",
        "Estimated risk from MT5 facts",
        "info",
        "medium",
        trade.risk_calculation_method === "missing_stop_loss"
          ? "Risk could not be estimated because the trade has no stop loss."
          : "Risk could not be estimated because MT5 did not provide enough symbol/account data.",
      ),
    );
  }

  if (trade.status === "closed") {
    const profit = Number(trade.profit_loss_amount ?? 0);
    items.push(
      item(
        "closed-outcome",
        "Closed trade outcome captured",
        "passed",
        "low",
        `MT5 captured the closed outcome with P/L ${money(profit, trade.account_currency)}.`,
      ),
    );
  } else {
    items.push(
      item(
        "open-trade",
        "Open trade still active",
        "info",
        "low",
        "This trade is still open, so outcome quality should be reviewed after close.",
      ),
    );
  }

  const penalty = items.reduce((sum, reviewItem) => {
    if (reviewItem.status === "failed") {
      return sum + (reviewItem.severity === "high" ? 28 : 18);
    }

    if (reviewItem.status === "warning") {
      return sum + (reviewItem.severity === "high" ? 16 : 10);
    }

    return sum;
  }, 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const failedOrWarning = items.filter(
    (reviewItem) => reviewItem.status === "failed" || reviewItem.status === "warning",
  );

  return {
    score,
    generated_at: generatedAt,
    items,
    summary: failedOrWarning.length
      ? failedOrWarning.map((reviewItem) => reviewItem.label).join(", ")
      : "MT5 facts look clean before journal review.",
  };
}

export function getSystemReviewItems(systemAnalysis: unknown): SystemReviewItem[] {
  if (!systemAnalysis || typeof systemAnalysis !== "object" || Array.isArray(systemAnalysis)) {
    return [];
  }

  const items = (systemAnalysis as { items?: unknown }).items;
  return Array.isArray(items) ? (items as SystemReviewItem[]) : [];
}

export function getSystemReviewScore(systemAnalysis: unknown) {
  if (!systemAnalysis || typeof systemAnalysis !== "object" || Array.isArray(systemAnalysis)) {
    return 0;
  }

  const score = (systemAnalysis as { score?: unknown }).score;
  return typeof score === "number" && Number.isFinite(score) ? score : 0;
}
