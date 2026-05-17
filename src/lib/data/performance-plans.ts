import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PerformancePlan } from "@/lib/supabase/types";

import { getSessionUser } from "./trades";

export const demoPerformancePlan: PerformancePlan = {
  id: "demo-performance-plan",
  user_id: "demo-user",
  mt5_connection_id: null,
  name: "Default monthly plan",
  monthly_profit_target_percent: 6,
  max_monthly_loss_percent: 6,
  max_trades_per_month: 10,
  target_win_rate_percent: 40,
  target_rr: 3,
  risk_per_trade_percent: 1,
  max_losses_per_month: 6,
  max_losing_streak: 3,
  max_daily_loss_percent: 3,
  min_review_completion_percent: 80,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function getDefaultPerformancePlan(userId: string): PerformancePlan {
  return {
    ...demoPerformancePlan,
    user_id: userId,
  };
}

function isMissingPerformancePlansTable(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "PGRST204" ||
    message.includes("performance_plans") ||
    message.includes("schema cache")
  );
}

export async function getPerformancePlans(): Promise<PerformancePlan[]> {
  const user = await getSessionUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase || user.isDemo) {
    return [demoPerformancePlan];
  }

  const { data, error } = await supabase
    .from("performance_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("mt5_connection_id", { ascending: true, nullsFirst: true });

  if (error) {
    if (isMissingPerformancePlansTable(error)) {
      return [getDefaultPerformancePlan(user.id)];
    }

    throw new Error(error.message);
  }

  if (data?.length) {
    return data as PerformancePlan[];
  }

  const { data: createdPlan, error: createError } = await supabase
    .from("performance_plans")
    .insert({ user_id: user.id })
    .select("*")
    .single();

  if (createError) {
    if (isMissingPerformancePlansTable(createError)) {
      return [getDefaultPerformancePlan(user.id)];
    }

    throw new Error(createError.message);
  }

  return [createdPlan as PerformancePlan];
}

export function getActivePerformancePlan(plans: PerformancePlan[], selectedConnectionId: string | null) {
  return (
    plans.find((plan) => selectedConnectionId && plan.mt5_connection_id === selectedConnectionId) ??
    plans.find((plan) => plan.mt5_connection_id === null) ??
    plans[0] ??
    demoPerformancePlan
  );
}
