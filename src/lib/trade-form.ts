import type { TradeDirection, TradeResult, TradeStatus } from "@/lib/supabase/types";

export type ParsedTradeForm = {
  pair: string;
  direction: TradeDirection;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_percent: number;
  rr: number;
  session: string;
  emotions: string;
  notes: string;
  confirmation: boolean;
  status: TradeStatus;
  outcome: TradeResult;
  trade_taken_at: string;
  closed_at: string | null;
  close_price: number | null;
  profit_loss_percent: number | null;
  profit_loss_amount: number | null;
  final_rr: number | null;
  closing_notes: string | null;
};

export function asNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asOptionalNumber(value: FormDataEntryValue | null) {
  if (value === null || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function asIsoDateTime(value: FormDataEntryValue | null) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseStatus(value: FormDataEntryValue | null): TradeStatus {
  return String(value ?? "open") === "closed" ? "closed" : "open";
}

function parseOutcome(value: FormDataEntryValue | null): TradeResult {
  const outcome = String(value ?? "pending");
  return outcome === "win" || outcome === "loss" || outcome === "breakeven" ? outcome : "pending";
}

export function parseTradeFormData(
  formData: FormData,
): { data: ParsedTradeForm; error: null } | { data: null; error: string } {
  const tradeTakenAt = asIsoDateTime(formData.get("trade_taken_at"));

  if (!tradeTakenAt) {
    return { data: null, error: "Trade date & time is required." };
  }

  const status = parseStatus(formData.get("status"));
  const outcome = status === "open" ? "pending" : parseOutcome(formData.get("outcome"));
  const closedAt = status === "closed" ? asIsoDateTime(formData.get("closed_at")) : null;

  if (status === "closed" && outcome === "pending") {
    return { data: null, error: "Choose win, loss, or breakeven before closing this trade." };
  }

  if (status === "closed" && !closedAt) {
    return { data: null, error: "Closed date & time is required for closed trades." };
  }

  return {
    data: {
      pair: String(formData.get("pair") ?? "XAUUSD").toUpperCase(),
      direction: (String(formData.get("direction") ?? "long") === "short" ? "short" : "long") as TradeDirection,
      entry_price: asOptionalNumber(formData.get("entry_price")),
      stop_loss: asOptionalNumber(formData.get("stop_loss")),
      take_profit: asOptionalNumber(formData.get("take_profit")),
      risk_percent: asNumber(formData.get("risk_percent")),
      rr: asNumber(formData.get("rr")),
      session: String(formData.get("session") ?? "London"),
      emotions: String(formData.get("emotions") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      confirmation: formData.get("confirmation") === "on" || formData.get("confirmation") === "true",
      status,
      outcome,
      trade_taken_at: tradeTakenAt,
      closed_at: closedAt,
      close_price: status === "closed" ? asOptionalNumber(formData.get("close_price")) : null,
      profit_loss_percent: status === "closed" ? asOptionalNumber(formData.get("profit_loss_percent")) : null,
      profit_loss_amount: status === "closed" ? asOptionalNumber(formData.get("profit_loss_amount")) : null,
      final_rr: status === "closed" ? asOptionalNumber(formData.get("final_rr")) : null,
      closing_notes: status === "closed" ? String(formData.get("closing_notes") ?? "") || null : null,
    },
    error: null,
  };
}
