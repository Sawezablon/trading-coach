import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { hashMt5ApiKey } from "@/lib/mt5-sync/sync";
import type { Database, RuleSettings } from "@/lib/supabase/types";

export const runtime = "nodejs";

function createSupabaseServiceClient() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    return null;
  }

  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function buildSystemChecklist(rules: RuleSettings | null) {
  if (!rules) {
    return [];
  }

  return [
    rules.max_risk_percent > 0 ? `Risk must be below ${rules.max_risk_percent}%` : null,
    rules.min_rr > 0 ? `RR must be at least 1:${rules.min_rr}` : null,
    rules.allowed_sessions.length ? `Session must be one of: ${rules.allowed_sessions.join(", ")}` : null,
    rules.allowed_pairs.length ? `Pair must be one of: ${rules.allowed_pairs.join(", ")}` : null,
    rules.allowed_directions.length
      ? `Direction must be one of: ${rules.allowed_directions.map((direction) => (direction === "long" ? "Buy" : "Sell")).join(", ")}`
      : null,
    rules.require_stop_loss ? "Stop loss must be set" : null,
    rules.require_take_profit ? "Take profit must be set" : null,
  ].filter((item): item is string => Boolean(item));
}

export async function GET(request: Request) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const apiKey = url.searchParams.get("apiKey")?.trim();

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

  const { data: rules, error: rulesError } = await supabase
    .from("trading_rules")
    .select("*")
    .eq("user_id", connection.user_id)
    .maybeSingle();

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 400 });
  }

  const ruleSettings = (rules as RuleSettings | null) ?? null;
  const customRules = ruleSettings?.custom_rules?.filter(Boolean) ?? [];
  const systemChecklist = buildSystemChecklist(ruleSettings);
  const checklist = [...customRules, ...systemChecklist].slice(0, 8);

  return NextResponse.json({
    success: true,
    checklist,
    checklistText: checklist.join("|"),
  });
}
