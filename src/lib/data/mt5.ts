import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Mt5Connection } from "@/lib/supabase/types";

export type Mt5ConnectionStatus = Pick<
  Mt5Connection,
  "id" | "account_number" | "broker" | "last_sync_at" | "is_active" | "created_at" | "updated_at"
>;

export async function getMt5Connection(): Promise<Mt5ConnectionStatus | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("mt5_connections")
    .select("id, account_number, broker, last_sync_at, is_active, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Mt5ConnectionStatus | null;
}
