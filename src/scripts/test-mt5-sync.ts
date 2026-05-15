import { createClient } from "@supabase/supabase-js";

import { hashMt5ApiKey, syncMt5Trades } from "../lib/mt5-sync/sync";
import type { Database, Trade } from "../lib/supabase/types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Env = Record<string, string>;

type SyncResult = {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  error?: string;
};

const TEST_API_KEY = "qvx_mt5_dev_test_key";
const TEST_ACCOUNT = "QYVEX-MT5-DEV-001";
const TEST_BROKER = "Qyvex Demo Broker";
const TEST_TICKETS = ["QYX-OPEN-001", "QYX-WIN-001", "QYX-LOSS-001"];

function loadEnvFile(path: string) {
  try {
    const envFile = readFileSync(path, "utf8");

    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex);
      const value = trimmed
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^"|"$/g, "");
      process.env[key] ??= value;
    }
  } catch {
    // The script can still run when variables are provided by the shell.
  }
}

function readEnv(): Env {
  loadEnvFile(resolve(process.cwd(), ".env.local"));

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    testUserEmail: process.env.MT5_TEST_USER_EMAIL ?? process.env.TEST_USER_EMAIL ?? "",
    useHttp: process.env.MT5_TEST_HTTP ?? "",
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function makeFakeMt5Trades({ closeOpenTrade = false }: { closeOpenTrade?: boolean } = {}) {
  return [
    {
      ticket: TEST_TICKETS[0],
      symbol: "XAUUSD",
      type: "buy",
      status: closeOpenTrade ? "closed" : "open",
      openTime: "2026.05.14 09:15:00",
      closeTime: closeOpenTrade ? "2026.05.14 16:10:00" : "",
      entryPrice: 2378.25,
      stopLoss: 2370.0,
      takeProfit: 2395.0,
      closePrice: closeOpenTrade ? 2391.4 : 0,
      profit: closeOpenTrade ? 42 : 0,
      comment: "MT5 test open trade",
      closeComment: closeOpenTrade ? "Closed after manual management" : "",
    },
    {
      ticket: TEST_TICKETS[1],
      symbol: "EURUSD",
      type: "sell",
      status: "closed",
      openTime: "2026.05.14 10:30:00",
      closeTime: "2026.05.14 12:05:00",
      entryPrice: 1.0865,
      stopLoss: 1.0895,
      takeProfit: 1.0805,
      closePrice: 1.0807,
      profit: 185.5,
      comment: "MT5 test winning trade",
      closeComment: "Target reached",
    },
    {
      ticket: TEST_TICKETS[2],
      symbol: "GBPUSD",
      type: "buy",
      status: "closed",
      openTime: "2026.05.14 13:45:00",
      closeTime: "2026.05.14 14:20:00",
      entryPrice: 1.274,
      stopLoss: 1.271,
      takeProfit: 1.28,
      closePrice: 1.271,
      profit: -90.25,
      comment: "MT5 test losing trade",
      closeComment: "Stop loss hit",
    },
  ];
}

function calculateSyncedMetrics(trades: Trade[]) {
  const openTrades = trades.filter((trade) => trade.status === "open");
  const closedTrades = trades.filter((trade) => trade.status === "closed");
  const wins = closedTrades.filter((trade) => trade.outcome === "win").length;
  const losses = closedTrades.filter((trade) => trade.outcome === "loss").length;
  const totalProfitLoss = Number(
    closedTrades.reduce((sum, trade) => sum + Number(trade.profit_loss_amount ?? 0), 0).toFixed(2),
  );

  return {
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    wins,
    losses,
    winRate: closedTrades.length ? Math.round((wins / closedTrades.length) * 100) : 0,
    totalProfitLoss,
  };
}

async function getTestUserId(supabase: ReturnType<typeof createClient<Database>>, email: string) {
  if (email) {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      throw error;
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    assert(user, `No Supabase auth user found for ${email}. Create that user or set MT5_TEST_USER_EMAIL.`);
    return { id: user.id, email: user.email ?? email };
  }

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (error) {
    throw error;
  }

  const user = data.users[0];
  assert(user, "No Supabase auth users found. Create an account first, then rerun this script.");
  return { id: user.id, email: user.email ?? "mt5-test@example.com" };
}

function getSyncPayload({ closeOpenTrade = false }: { closeOpenTrade?: boolean } = {}) {
  return {
    apiKey: TEST_API_KEY,
    accountNumber: TEST_ACCOUNT,
    broker: TEST_BROKER,
    trades: makeFakeMt5Trades({ closeOpenTrade }),
  };
}

function getSyncPayloadWithRequest(syncRequestId: string) {
  return {
    ...getSyncPayload({ closeOpenTrade: true }),
    syncRequestId,
  };
}

async function postSync(appUrl: string, payload = getSyncPayload()) {
  const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/mt5/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as SyncResult;

  if (!response.ok) {
    throw new Error(`MT5 sync failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function runSync(
  supabase: ReturnType<typeof createClient<Database>>,
  appUrl: string,
  payload = getSyncPayload(),
  useHttp = false,
) {
  if (useHttp) {
    try {
      return await postSync(appUrl, payload);
    } catch (error) {
      console.warn(
        `HTTP sync was unavailable (${error instanceof Error ? error.message : "unknown error"}). Falling back to the shared sync handler.`,
      );
    }
  }

  const result = await syncMt5Trades(supabase, payload);

  if ("error" in result) {
    throw new Error(`Direct MT5 sync failed with ${result.status}: ${result.error}`);
  }

  return result;
}

async function main() {
  const env = readEnv();

  assert(env.supabaseUrl, "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.");
  assert(env.serviceRoleKey, "Missing SUPABASE_SERVICE_ROLE_KEY.");

  const supabase = createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const useHttp = env.useHttp === "1" || env.useHttp.toLowerCase() === "true";
  const user = await getTestUserId(supabase, env.testUserEmail);

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
  });
  await supabase
    .from("trades")
    .delete()
    .eq("user_id", user.id)
    .eq("mt5_account", TEST_ACCOUNT)
    .in("mt5_ticket", TEST_TICKETS);

  await supabase
    .from("mt5_connections")
    .update({ is_active: false })
    .eq("api_key_hash", hashMt5ApiKey(TEST_API_KEY))
    .neq("user_id", user.id);
  await supabase.from("mt5_sync_requests").delete().eq("user_id", user.id).eq("status", "pending");

  const { error: connectionError } = await supabase.from("mt5_connections").upsert(
    {
      user_id: user.id,
      api_key_hash: hashMt5ApiKey(TEST_API_KEY),
      account_number: TEST_ACCOUNT,
      broker: TEST_BROKER,
      is_active: true,
    },
    { onConflict: "user_id" },
  );

  if (connectionError) {
    throw connectionError;
  }

  const firstSync = await runSync(supabase, env.appUrl, getSyncPayload(), useHttp);
  assert(firstSync.created === 3, `Expected first sync to create 3 trades, got ${JSON.stringify(firstSync)}.`);
  assert(firstSync.updated === 0, `Expected first sync to update 0 trades, got ${JSON.stringify(firstSync)}.`);
  assert(firstSync.skipped === 0, `Expected first sync to skip 0 trades, got ${JSON.stringify(firstSync)}.`);

  const secondSync = await runSync(supabase, env.appUrl, getSyncPayload(), useHttp);
  assert(secondSync.created === 0, `Expected duplicate sync to create 0 trades, got ${JSON.stringify(secondSync)}.`);
  assert(secondSync.updated === 3, `Expected duplicate sync to update 3 trades, got ${JSON.stringify(secondSync)}.`);
  assert(secondSync.skipped === 0, `Expected duplicate sync to skip 0 trades, got ${JSON.stringify(secondSync)}.`);

  const closeOpenTradeSync = await runSync(supabase, env.appUrl, getSyncPayload({ closeOpenTrade: true }), useHttp);
  assert(
    closeOpenTradeSync.created === 0,
    `Expected open-to-closed sync to create 0 trades, got ${JSON.stringify(closeOpenTradeSync)}.`,
  );
  assert(
    closeOpenTradeSync.updated === 3,
    `Expected open-to-closed sync to update 3 trades, got ${JSON.stringify(closeOpenTradeSync)}.`,
  );
  assert(
    closeOpenTradeSync.skipped === 0,
    `Expected open-to-closed sync to skip 0 trades, got ${JSON.stringify(closeOpenTradeSync)}.`,
  );

  const { data: connectionForRequest, error: connectionForRequestError } = await supabase
    .from("mt5_connections")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (connectionForRequestError) {
    throw connectionForRequestError;
  }

  await supabase
    .from("trades")
    .delete()
    .eq("user_id", user.id)
    .eq("mt5_account", TEST_ACCOUNT)
    .in("mt5_ticket", TEST_TICKETS);

  const { data: syncRequest, error: syncRequestError } = await supabase
    .from("mt5_sync_requests")
    .insert({
      user_id: user.id,
      mt5_connection_id: connectionForRequest.id,
      account_number: TEST_ACCOUNT,
      lookback_days: 365,
      status: "pending",
    })
    .select("id")
    .single();

  if (syncRequestError) {
    throw syncRequestError;
  }

  const resyncAfterDelete = await runSync(supabase, env.appUrl, getSyncPayloadWithRequest(syncRequest.id), useHttp);
  assert(
    resyncAfterDelete.created === 3,
    `Expected resync after delete to recreate 3 trades, got ${JSON.stringify(resyncAfterDelete)}.`,
  );
  assert(
    resyncAfterDelete.updated === 0,
    `Expected resync after delete to update 0 trades, got ${JSON.stringify(resyncAfterDelete)}.`,
  );
  assert(
    resyncAfterDelete.skipped === 0,
    `Expected resync after delete to skip 0 trades, got ${JSON.stringify(resyncAfterDelete)}.`,
  );

  const { data: trades, error: tradesError } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .eq("mt5_account", TEST_ACCOUNT)
    .in("mt5_ticket", TEST_TICKETS);

  if (tradesError) {
    throw tradesError;
  }

  assert(trades?.length === 3, `Expected exactly 3 synced test trades in journal, found ${trades?.length ?? 0}.`);

  const byTicket = new Map((trades ?? []).map((trade) => [trade.mt5_ticket, trade]));

  assert(byTicket.get(TEST_TICKETS[0])?.status === "closed", "Open MT5 trade did not update to closed.");
  assert(byTicket.get(TEST_TICKETS[0])?.outcome === "win", "Open MT5 trade did not resolve to win after closing.");
  assert(byTicket.get(TEST_TICKETS[1])?.status === "closed", "Winning MT5 trade did not appear as closed.");
  assert(byTicket.get(TEST_TICKETS[1])?.outcome === "win", "Winning MT5 trade did not appear as win.");
  assert(byTicket.get(TEST_TICKETS[2])?.status === "closed", "Losing MT5 trade did not appear as closed.");
  assert(byTicket.get(TEST_TICKETS[2])?.outcome === "loss", "Losing MT5 trade did not appear as loss.");

  const metrics = calculateSyncedMetrics((trades ?? []) as Trade[]);

  assert(metrics.totalTrades === 3, `Dashboard total trades expected 3, got ${metrics.totalTrades}.`);
  assert(metrics.openTrades === 0, `Dashboard open trades expected 0, got ${metrics.openTrades}.`);
  assert(metrics.closedTrades === 3, `Dashboard closed trades expected 3, got ${metrics.closedTrades}.`);
  assert(metrics.wins === 2, `Dashboard wins expected 2, got ${metrics.wins}.`);
  assert(metrics.losses === 1, `Dashboard losses expected 1, got ${metrics.losses}.`);
  assert(metrics.winRate === 67, `Dashboard win rate expected 67, got ${metrics.winRate}.`);
  assert(metrics.totalProfitLoss === 137.25, `Dashboard total P/L expected 137.25, got ${metrics.totalProfitLoss}.`);

  const { data: connection, error: refreshedConnectionError } = await supabase
    .from("mt5_connections")
    .select("last_sync_at, account_number, broker")
    .eq("user_id", user.id)
    .single();

  if (refreshedConnectionError) {
    throw refreshedConnectionError;
  }

  assert(connection.last_sync_at, "Connection last_sync_at was not updated.");

  const { data: completedRequest, error: completedRequestError } = await supabase
    .from("mt5_sync_requests")
    .select("status, completed_at")
    .eq("id", syncRequest.id)
    .single();

  if (completedRequestError) {
    throw completedRequestError;
  }

  assert(completedRequest.status === "completed", "Manual resync request was not marked completed.");
  assert(completedRequest.completed_at, "Manual resync request completed_at was not set.");

  console.log("MT5 sync developer test passed.");
  console.table({
    firstSync,
    secondSync,
    closeOpenTradeSync,
    resyncAfterDelete,
    journal: {
      totalTrades: trades.length,
      openStatus: byTicket.get(TEST_TICKETS[0])?.status,
      winOutcome: byTicket.get(TEST_TICKETS[1])?.outcome,
      lossOutcome: byTicket.get(TEST_TICKETS[2])?.outcome,
    },
    dashboard: {
      totalTrades: metrics.totalTrades,
      openTrades: metrics.openTrades,
      closedTrades: metrics.closedTrades,
      wins: metrics.wins,
      losses: metrics.losses,
      winRate: metrics.winRate,
      totalProfitLoss: metrics.totalProfitLoss,
    },
    connection,
  });
  console.log(`Test API key: ${TEST_API_KEY}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
