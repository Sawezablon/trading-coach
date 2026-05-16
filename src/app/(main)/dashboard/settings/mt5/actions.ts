"use server";

import { revalidatePath } from "next/cache";

import type { Mt5ConnectionStatus } from "@/lib/data/mt5";
import { hashMt5ApiKey } from "@/lib/mt5-sync/sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { randomBytes } from "node:crypto";

export type GenerateMt5ApiKeyState = {
  apiKey?: string;
  connection?: Mt5ConnectionStatus;
  error?: string;
};

export type RequestMt5HistoryResyncState = {
  ok?: boolean;
  error?: string;
  requestedAt?: string;
  connectionId?: string;
};

export type DisconnectMt5ConnectionState = {
  ok?: boolean;
  error?: string;
  connectionId?: string;
};

function generateApiKey() {
  return `qvx_mt5_${randomBytes(32).toString("base64url")}`;
}

export async function generateMt5ApiKeyAction(
  _previousState?: GenerateMt5ApiKeyState,
  formData?: FormData,
): Promise<GenerateMt5ApiKeyState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      apiKey: "qvx_mt5_demo_key_not_for_live_sync",
      error: "Supabase is not configured. This demo key will not sync MT5 data.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to generate an MT5 API key." };
  }

  const apiKey = generateApiKey();
  const apiKeyHash = hashMt5ApiKey(apiKey);
  const accountNickname = String(formData?.get("account_nickname") ?? "").trim() || "MT5 Account";
  const propFirm = String(formData?.get("prop_firm") ?? "").trim() || null;

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  const { data, error } = await supabase
    .from("mt5_connections")
    .insert({
      user_id: user.id,
      api_key_hash: apiKeyHash,
      account_nickname: accountNickname,
      prop_firm: propFirm,
      is_active: true,
    })
    .select("id, account_number, broker, account_nickname, prop_firm, last_sync_at, is_active, created_at, updated_at")
    .single();

  revalidatePath("/dashboard/settings/mt5");

  if (error || !data) {
    return { error: error?.message ?? "MT5 API key could not be generated." };
  }

  return {
    apiKey,
    connection: data as Mt5ConnectionStatus,
  };
}

export async function disconnectMt5ConnectionAction(
  _previousState?: DisconnectMt5ConnectionState,
  formData?: FormData,
): Promise<DisconnectMt5ConnectionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to disconnect an MT5 account." };
  }

  const connectionId = String(formData?.get("connection_id") ?? "").trim();

  if (!connectionId) {
    return { error: "Connection id is required." };
  }

  const { error } = await supabase
    .from("mt5_connections")
    .update({ is_active: false })
    .eq("id", connectionId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/settings/mt5");

  if (error) {
    return { error: error.message, connectionId };
  }

  return { ok: true, connectionId };
}

export async function requestMt5HistoryResyncAction(
  _previousState?: RequestMt5HistoryResyncState,
  formData?: FormData,
): Promise<RequestMt5HistoryResyncState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to request an MT5 history resync." };
  }

  const connectionId = String(formData?.get("connection_id") ?? "").trim();

  if (!connectionId) {
    return { error: "Choose an MT5 connection before requesting history." };
  }

  const { data: connection, error: connectionError } = await supabase
    .from("mt5_connections")
    .select("id, account_number")
    .eq("user_id", user.id)
    .eq("id", connectionId)
    .maybeSingle();

  if (connectionError) {
    return { error: connectionError.message };
  }

  if (!connection) {
    return { error: "Generate an MT5 API key before requesting a history resync." };
  }

  const { data: existingRequest, error: existingError } = await supabase
    .from("mt5_sync_requests")
    .select("requested_at")
    .eq("user_id", user.id)
    .eq("mt5_connection_id", connection.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }

  if (existingRequest) {
    return { ok: true, requestedAt: existingRequest.requested_at, connectionId: connection.id };
  }

  const { data, error } = await supabase
    .from("mt5_sync_requests")
    .insert({
      user_id: user.id,
      mt5_connection_id: connection.id,
      account_number: connection.account_number,
      lookback_days: 365,
      status: "pending",
    })
    .select("requested_at")
    .single();

  revalidatePath("/dashboard/settings/mt5");

  if (error || !data) {
    return { error: error?.message ?? "History resync could not be requested." };
  }

  return { ok: true, requestedAt: data.requested_at, connectionId: connection.id };
}
