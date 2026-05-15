"use server";

import { revalidatePath } from "next/cache";

import { randomBytes } from "crypto";

import type { Mt5ConnectionStatus } from "@/lib/data/mt5";
import { hashMt5ApiKey } from "@/lib/mt5-sync/sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type GenerateMt5ApiKeyState = {
  apiKey?: string;
  connection?: Mt5ConnectionStatus;
  error?: string;
};

function generateApiKey() {
  return `qvx_mt5_${randomBytes(32).toString("base64url")}`;
}

export async function generateMt5ApiKeyAction(
  _previousState?: GenerateMt5ApiKeyState,
  _formData?: FormData,
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

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  const { data, error } = await supabase
    .from("mt5_connections")
    .upsert(
      {
        user_id: user.id,
        api_key_hash: apiKeyHash,
        is_active: true,
      },
      { onConflict: "user_id" },
    )
    .select("id, account_number, broker, last_sync_at, is_active, created_at, updated_at")
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
