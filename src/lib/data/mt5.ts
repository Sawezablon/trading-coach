import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Mt5Connection, Mt5SyncRequest } from "@/lib/supabase/types";

export type Mt5ConnectionStatus = Pick<
  Mt5Connection,
  | "id"
  | "account_number"
  | "broker"
  | "account_nickname"
  | "prop_firm"
  | "last_sync_at"
  | "is_active"
  | "created_at"
  | "updated_at"
>;

export async function getMt5Connections(): Promise<Mt5ConnectionStatus[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("mt5_connections")
    .select("id, account_number, broker, account_nickname, prop_firm, last_sync_at, is_active, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Mt5ConnectionStatus[];
}

export async function getMt5Connection(): Promise<Mt5ConnectionStatus | null> {
  const connections = await getMt5Connections();
  return connections[0] ?? null;
}

export type Mt5PendingSyncRequest = Pick<
  Mt5SyncRequest,
  "id" | "mt5_connection_id" | "lookback_days" | "status" | "requested_at" | "completed_at"
>;

export async function getPendingMt5SyncRequests(): Promise<Mt5PendingSyncRequest[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("mt5_sync_requests")
    .select("id, mt5_connection_id, lookback_days, status, requested_at, completed_at")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Mt5PendingSyncRequest[];
}

export async function getPendingMt5SyncRequest(): Promise<Mt5PendingSyncRequest | null> {
  const requests = await getPendingMt5SyncRequests();
  return requests[0] ?? null;
}
