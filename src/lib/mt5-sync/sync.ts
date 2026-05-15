import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json, TradeDirection, TradeResult, TradeStatus } from "../supabase/types";
import { createHash } from "node:crypto";

export type Mt5TradePayload = Record<string, unknown>;

export type Mt5SyncPayload = {
  apiKey?: unknown;
  accountNumber?: unknown;
  broker?: unknown;
  trades?: unknown;
  syncRequestId?: unknown;
};

export type Mt5SyncResult = {
  success: true;
  created: number;
  updated: number;
  skipped: number;
};

export type Mt5SyncError = {
  error: string;
  status: number;
};

type TradeMutation = Database["public"]["Tables"]["trades"]["Insert"];
type AppSupabaseClient = SupabaseClient<Database>;

export function hashMt5ApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const parsed = stringValue(value);
  return parsed || null;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMt5Date(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 0) {
      return null;
    }

    const timestamp = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(timestamp).toISOString();
  }

  const raw = stringValue(value);

  if (!raw || raw === "0" || raw.startsWith("0000.") || raw.startsWith("1970.")) {
    return null;
  }

  const normalized = raw.replace(/^(\d{4})\.(\d{2})\.(\d{2})\s+/, "$1-$2-$3T");
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const timestamp = hasTimezone ? normalized : `${normalized}Z`;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeDirection(value: unknown): TradeDirection | null {
  const direction = stringValue(value).toLowerCase();

  if (direction === "buy" || direction === "long") {
    return "long";
  }

  if (direction === "sell" || direction === "short") {
    return "short";
  }

  return null;
}

function normalizeStatus(value: unknown, closedAt: string | null): TradeStatus {
  const status = stringValue(value).toLowerCase();
  return status === "closed" || closedAt ? "closed" : "open";
}

function resolveOutcome(status: TradeStatus, profit: number | null): TradeResult {
  if (status === "open") {
    return "pending";
  }

  if ((profit ?? 0) > 0) {
    return "win";
  }

  if ((profit ?? 0) < 0) {
    return "loss";
  }

  return "breakeven";
}

function getTicket(trade: Mt5TradePayload) {
  return optionalString(trade.ticket ?? trade.mt5_ticket ?? trade.orderTicket ?? trade.positionTicket);
}

function mapMt5Trade({
  accountNumber,
  broker,
  rawTrade,
  userId,
  syncedAt,
}: {
  accountNumber: string;
  broker: string | null;
  rawTrade: Mt5TradePayload;
  userId: string;
  syncedAt: string;
}): TradeMutation | null {
  const mt5Ticket = getTicket(rawTrade);
  const pair = stringValue(rawTrade.symbol).toUpperCase();
  const direction = normalizeDirection(rawTrade.type ?? rawTrade.direction);
  const tradeTakenAt = parseMt5Date(rawTrade.openTime);
  const closedAt = parseMt5Date(rawTrade.closeTime);

  if (!mt5Ticket || !pair || !direction || !tradeTakenAt) {
    return null;
  }

  const status = normalizeStatus(rawTrade.status, closedAt);
  const profit = numberValue(rawTrade.profit);

  return {
    user_id: userId,
    pair,
    direction,
    entry_price: numberValue(rawTrade.entryPrice),
    stop_loss: numberValue(rawTrade.stopLoss),
    take_profit: numberValue(rawTrade.takeProfit),
    risk_percent: 0,
    rr: 0,
    session: "MT5",
    emotions: "Imported from MT5",
    notes: optionalString(rawTrade.comment) ?? "Synced from MetaTrader 5.",
    confirmation: false,
    status,
    outcome: resolveOutcome(status, profit),
    trade_taken_at: tradeTakenAt,
    trade_timezone: "UTC",
    closed_at: status === "closed" ? closedAt : null,
    close_price: status === "closed" ? numberValue(rawTrade.closePrice) : null,
    profit_loss_percent: null,
    profit_loss_amount: status === "closed" ? profit : null,
    final_rr: null,
    closing_notes: status === "closed" ? optionalString(rawTrade.closeComment) : null,
    checklist_results: [],
    passed_rules: [],
    failed_rules: [],
    checklist_completion_rate: 0,
    discipline_score: 0,
    mt5_ticket: mt5Ticket,
    mt5_account: accountNumber,
    mt5_broker: broker,
    synced_from_mt5: true,
    last_synced_at: syncedAt,
    mt5_raw_data: rawTrade as Json,
  };
}

export async function syncMt5Trades(
  supabase: AppSupabaseClient,
  payload: Mt5SyncPayload,
): Promise<Mt5SyncResult | Mt5SyncError> {
  const apiKey = stringValue(payload.apiKey);

  if (!apiKey) {
    return { error: "Invalid API key.", status: 401 };
  }

  const accountNumber = stringValue(payload.accountNumber);
  const broker = optionalString(payload.broker);
  const syncRequestId = optionalString(payload.syncRequestId);

  if (!accountNumber) {
    return { error: "accountNumber is required.", status: 400 };
  }

  if (!Array.isArray(payload.trades)) {
    return { error: "trades must be an array.", status: 400 };
  }

  const { data: connection, error: connectionError } = await supabase
    .from("mt5_connections")
    .select("id, user_id")
    .eq("api_key_hash", hashMt5ApiKey(apiKey))
    .eq("is_active", true)
    .maybeSingle();

  if (connectionError || !connection) {
    return { error: "Invalid API key.", status: 401 };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const syncedAt = new Date().toISOString();

  for (const item of payload.trades) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      skipped += 1;
      continue;
    }

    const tradeInput = mapMt5Trade({
      accountNumber,
      broker,
      rawTrade: item as Mt5TradePayload,
      userId: connection.user_id,
      syncedAt,
    });

    if (!tradeInput?.mt5_ticket) {
      skipped += 1;
      continue;
    }

    const { data: existingTrade, error: existingTradeError } = await supabase
      .from("trades")
      .select("id")
      .eq("user_id", connection.user_id)
      .eq("mt5_account", accountNumber)
      .eq("mt5_ticket", tradeInput.mt5_ticket)
      .maybeSingle();

    if (existingTradeError) {
      skipped += 1;
      continue;
    }

    if (existingTrade) {
      const { error: updateError } = await supabase.from("trades").update(tradeInput).eq("id", existingTrade.id);

      if (updateError) {
        skipped += 1;
      } else {
        updated += 1;
      }

      continue;
    }

    const { error: insertError } = await supabase.from("trades").insert(tradeInput);

    if (insertError?.code === "23505") {
      const { error: retryUpdateError } = await supabase
        .from("trades")
        .update(tradeInput)
        .eq("user_id", connection.user_id)
        .eq("mt5_account", accountNumber)
        .eq("mt5_ticket", tradeInput.mt5_ticket);

      if (retryUpdateError) {
        skipped += 1;
      } else {
        updated += 1;
      }
    } else if (insertError) {
      skipped += 1;
    } else {
      created += 1;
    }
  }

  const { error: syncUpdateError } = await supabase
    .from("mt5_connections")
    .update({
      account_number: accountNumber,
      broker,
      last_sync_at: syncedAt,
      is_active: true,
    })
    .eq("id", connection.id);

  if (syncUpdateError) {
    return { error: syncUpdateError.message, status: 400 };
  }

  if (syncRequestId) {
    const { error: requestUpdateError } = await supabase
      .from("mt5_sync_requests")
      .update({
        status: "completed",
        completed_at: syncedAt,
      })
      .eq("id", syncRequestId)
      .eq("user_id", connection.user_id)
      .eq("status", "pending");

    if (requestUpdateError) {
      return { error: requestUpdateError.message, status: 400 };
    }
  }

  return {
    success: true,
    created,
    updated,
    skipped,
  };
}
