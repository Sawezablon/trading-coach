import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { hashMt5ApiKey } from "@/lib/mt5-sync/sync";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

function createSupabaseServiceClient() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    return null;
  }

  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(request: Request) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const apiKey = url.searchParams.get("apiKey")?.trim();
  const accountNumber = url.searchParams.get("accountNumber")?.trim() || null;

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("mt5_connections")
    .select("id, user_id")
    .eq("api_key_hash", hashMt5ApiKey(apiKey))
    .eq("is_active", true)
    .maybeSingle();

  if (connectionError || !connection) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }

  const { data: requestData, error: requestError } = await supabase
    .from("mt5_sync_requests")
    .select("id, lookback_days")
    .eq("user_id", connection.user_id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 400 });
  }

  if (!requestData) {
    return NextResponse.json({ resyncRequired: false });
  }

  if (accountNumber) {
    await supabase
      .from("mt5_sync_requests")
      .update({ account_number: accountNumber, mt5_connection_id: connection.id })
      .eq("id", requestData.id)
      .eq("user_id", connection.user_id);
  }

  return NextResponse.json({
    resyncRequired: true,
    requestId: requestData.id,
    lookbackDays: requestData.lookback_days,
  });
}
