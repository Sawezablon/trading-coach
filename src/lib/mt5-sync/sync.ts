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
  received: number;
  created: number;
  updated: number;
  skipped: number;
};

export type Mt5SyncError = {
  error: string;
  status: number;
};

type TradeMutation = Database["public"]["Tables"]["trades"]["Insert"];
type TradeUpdate = Database["public"]["Tables"]["trades"]["Update"];
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

function positiveNumberValue(value: unknown) {
  const parsed = numberValue(value);
  return parsed && parsed > 0 ? parsed : null;
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
  connectionId,
  rawTrade,
  userId,
  syncedAt,
}: {
  accountNumber: string;
  broker: string | null;
  connectionId: string;
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
    entry_price: positiveNumberValue(rawTrade.entryPrice),
    stop_loss: positiveNumberValue(rawTrade.stopLoss),
    take_profit: positiveNumberValue(rawTrade.takeProfit),
    lot_size: numberValue(rawTrade.lotSize ?? rawTrade.volume),
    risk_percent: 0,
    rr: 0,
    session: "MT5",
    emotions: "unreviewed",
    notes: optionalString(rawTrade.comment) ?? "Synced from MetaTrader 5. Complete the journal review.",
    confirmation: false,
    status,
    outcome: resolveOutcome(status, profit),
    trade_taken_at: tradeTakenAt,
    trade_timezone: "UTC",
    closed_at: status === "closed" ? closedAt : null,
    close_price: status === "closed" ? positiveNumberValue(rawTrade.closePrice) : null,
    profit_loss_percent: null,
    profit_loss_amount: status === "closed" ? profit : null,
    commission: numberValue(rawTrade.commission),
    swap: numberValue(rawTrade.swap),
    final_rr: null,
    closing_notes: status === "closed" ? optionalString(rawTrade.closeComment) : null,
    review_status: "needs_review",
    review_completed_at: null,
    checklist_results: [],
    passed_rules: [],
    failed_rules: [],
    checklist_completion_rate: 0,
    discipline_score: 0,
    mt5_ticket: mt5Ticket,
    mt5_account: accountNumber,
    mt5_broker: broker,
    mt5_connection_id: connectionId,
    synced_from_mt5: true,
    last_synced_at: syncedAt,
    mt5_raw_data: rawTrade as Json,
  };
}

function getMt5FactUpdate(
  tradeInput: TradeMutation,
  reviewUpdate: Pick<TradeUpdate, "review_status" | "review_completed_at">,
) {
  return {
    pair: tradeInput.pair,
    direction: tradeInput.direction,
    entry_price: tradeInput.entry_price,
    stop_loss: tradeInput.stop_loss,
    take_profit: tradeInput.take_profit,
    lot_size: tradeInput.lot_size,
    status: tradeInput.status,
    outcome: tradeInput.outcome,
    trade_taken_at: tradeInput.trade_taken_at,
    closed_at: tradeInput.closed_at,
    close_price: tradeInput.close_price,
    profit_loss_amount: tradeInput.profit_loss_amount,
    commission: tradeInput.commission,
    swap: tradeInput.swap,
    mt5_account: tradeInput.mt5_account,
    mt5_broker: tradeInput.mt5_broker,
    mt5_connection_id: tradeInput.mt5_connection_id,
    synced_from_mt5: true,
    last_synced_at: tradeInput.last_synced_at,
    mt5_raw_data: tradeInput.mt5_raw_data,
    ...reviewUpdate,
  } satisfies TradeUpdate;
}

function mt5CloseFactsChanged(
  existingTrade: Pick<TradeUpdate, "status" | "closed_at" | "close_price" | "profit_loss_amount">,
  tradeInput: TradeMutation,
) {
  return (
    existingTrade.status !== tradeInput.status ||
    existingTrade.closed_at !== tradeInput.closed_at ||
    Number(existingTrade.close_price ?? 0) !== Number(tradeInput.close_price ?? 0) ||
    Number(existingTrade.profit_loss_amount ?? 0) !== Number(tradeInput.profit_loss_amount ?? 0)
  );
}

async function deactivateDuplicateConnections({
  accountNumber,
  broker,
  connectionId,
  supabase,
  userId,
}: {
  accountNumber: string;
  broker: string | null;
  connectionId: string;
  supabase: AppSupabaseClient;
  userId: string;
}) {
  let duplicateQuery = supabase
    .from("mt5_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("account_number", accountNumber)
    .eq("is_active", true)
    .neq("id", connectionId);

  duplicateQuery = broker ? duplicateQuery.eq("broker", broker) : duplicateQuery.is("broker", null);

  const { data: duplicateConnections, error: duplicateError } = await duplicateQuery;

  if (duplicateError) {
    return duplicateError.message;
  }

  const duplicateIds = (duplicateConnections ?? []).map((connection) => connection.id);

  if (!duplicateIds.length) {
    return null;
  }

  const { error: requestUpdateError } = await supabase
    .from("mt5_sync_requests")
    .update({ mt5_connection_id: connectionId })
    .in("mt5_connection_id", duplicateIds);

  if (requestUpdateError) {
    return requestUpdateError.message;
  }

  const { error: deactivateError } = await supabase
    .from("mt5_connections")
    .update({ is_active: false })
    .in("id", duplicateIds)
    .eq("user_id", userId);

  return deactivateError?.message ?? null;
}

async function findExistingMt5Trade({
  accountNumber,
  broker,
  connectionId,
  mt5Ticket,
  supabase,
  userId,
}: {
  accountNumber: string;
  broker: string | null;
  connectionId: string;
  mt5Ticket: string;
  supabase: AppSupabaseClient;
  userId: string;
}) {
  const selection = "id, review_status, status, closed_at, close_price, profit_loss_amount";
  const { data: connectionTrade, error: connectionTradeError } = await supabase
    .from("trades")
    .select(selection)
    .eq("user_id", userId)
    .eq("mt5_connection_id", connectionId)
    .eq("mt5_ticket", mt5Ticket)
    .maybeSingle();

  if (connectionTradeError || connectionTrade) {
    return { data: connectionTrade, error: connectionTradeError };
  }

  let accountTradeQuery = supabase
    .from("trades")
    .select(selection)
    .eq("user_id", userId)
    .eq("mt5_account", accountNumber)
    .eq("mt5_ticket", mt5Ticket)
    .order("last_synced_at", { ascending: false, nullsFirst: false })
    .limit(1);

  accountTradeQuery = broker ? accountTradeQuery.eq("mt5_broker", broker) : accountTradeQuery.is("mt5_broker", null);

  const { data: accountTrades, error: accountTradeError } = await accountTradeQuery;
  return { data: accountTrades?.[0] ?? null, error: accountTradeError };
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

  const duplicateError = await deactivateDuplicateConnections({
    accountNumber,
    broker,
    connectionId: connection.id,
    supabase,
    userId: connection.user_id,
  });

  if (duplicateError) {
    return { error: duplicateError, status: 400 };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let processed = 0;
  let attemptedWrites = 0;
  let firstSkipReason: string | null = null;
  let lastTicket: string | null = null;
  const syncedAt = new Date().toISOString();

  function skip(reason: string) {
    skipped += 1;
    firstSkipReason ??= reason;
  }

  for (const item of payload.trades) {
    processed += 1;

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      skip("Trade payload item is not an object.");
      continue;
    }

    const tradeInput = mapMt5Trade({
      accountNumber,
      broker,
      connectionId: connection.id,
      rawTrade: item as Mt5TradePayload,
      userId: connection.user_id,
      syncedAt,
    });

    if (!tradeInput?.mt5_ticket) {
      skip("Trade payload is missing ticket, symbol, direction, or open time.");
      continue;
    }

    lastTicket = tradeInput.mt5_ticket;

    const { data: existingTrade, error: existingTradeError } = await findExistingMt5Trade({
      accountNumber,
      broker,
      connectionId: connection.id,
      mt5Ticket: tradeInput.mt5_ticket,
      supabase,
      userId: connection.user_id,
    });

    if (existingTradeError) {
      skip(existingTradeError.message);
      continue;
    }

    if (existingTrade) {
      const shouldRequestReview = mt5CloseFactsChanged(existingTrade, tradeInput);
      const reviewUpdate = shouldRequestReview
        ? { review_status: "needs_review" as const, review_completed_at: null }
        : {
            review_status: existingTrade.review_status ?? "needs_review",
            review_completed_at: undefined,
          };
      const { error: updateError } = await supabase
        .from("trades")
        .update(getMt5FactUpdate(tradeInput, reviewUpdate))
        .eq("id", existingTrade.id);
      attemptedWrites += 1;

      if (updateError) {
        skip(updateError.message);
      } else {
        updated += 1;
      }

      continue;
    }

    const { error: insertError } = await supabase.from("trades").insert(tradeInput);
    attemptedWrites += 1;

    if (insertError?.code === "23505") {
      const { error: retryUpdateError } = await supabase
        .from("trades")
        .update(getMt5FactUpdate(tradeInput, { review_status: "needs_review", review_completed_at: null }))
        .eq("user_id", connection.user_id)
        .eq("mt5_connection_id", connection.id)
        .eq("mt5_ticket", tradeInput.mt5_ticket);

      if (retryUpdateError) {
        skip(retryUpdateError.message);
      } else {
        updated += 1;
      }
    } else if (insertError) {
      skip(insertError.message);
    } else {
      created += 1;
    }
  }

  if (payload.trades.length > 0 && created + updated === 0) {
    return {
      error: `MT5 sync received ${payload.trades.length} trade(s), but none were saved. First error: ${
        firstSkipReason ??
        `No insert/update completed. Processed: ${processed}. Attempted writes: ${attemptedWrites}. Last ticket: ${
          lastTicket ?? "none"
        }. Skipped: ${skipped}.`
      }`,
      status: 400,
    };
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

  await supabase
    .from("profiles")
    .update({ selected_mt5_connection_id: connection.id })
    .eq("id", connection.user_id)
    .is("selected_mt5_connection_id", null);

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
    received: payload.trades.length,
    created,
    updated,
    skipped,
  };
}
