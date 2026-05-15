import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { type Mt5SyncPayload, syncMt5Trades } from "@/lib/mt5-sync/sync";
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

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "ready",
    message: "POST MT5 sync payloads to this endpoint with a valid Qyvex Edge MT5 API key.",
  });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 500 });
  }

  let payload: Mt5SyncPayload;

  try {
    payload = (await request.json()) as Mt5SyncPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const result = await syncMt5Trades(supabase, payload);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
