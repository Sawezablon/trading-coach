"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function numberValue(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function connectionValue(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw === "default" ? null : raw || null;
}

export async function savePerformancePlanAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    revalidatePath("/dashboard/settings/performance");
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const mt5ConnectionId = connectionValue(formData.get("mt5_connection_id"));
  const payload = {
    user_id: user.id,
    mt5_connection_id: mt5ConnectionId,
    name: String(formData.get("name") ?? "Default monthly plan").trim() || "Default monthly plan",
    monthly_profit_target_percent: numberValue(formData.get("monthly_profit_target_percent"), 6),
    max_monthly_loss_percent: numberValue(formData.get("max_monthly_loss_percent"), 6),
    max_trades_per_month: numberValue(formData.get("max_trades_per_month"), 10),
    target_win_rate_percent: Math.min(100, numberValue(formData.get("target_win_rate_percent"), 40)),
    target_rr: numberValue(formData.get("target_rr"), 3),
    risk_per_trade_percent: numberValue(formData.get("risk_per_trade_percent"), 1),
    max_losses_per_month: numberValue(formData.get("max_losses_per_month"), 6),
    max_losing_streak: numberValue(formData.get("max_losing_streak"), 3),
    max_daily_loss_percent: numberValue(formData.get("max_daily_loss_percent"), 3),
    min_review_completion_percent: Math.min(100, numberValue(formData.get("min_review_completion_percent"), 80)),
  };

  const query = supabase.from("performance_plans").select("id").eq("user_id", user.id).limit(1);
  const { data: existingPlan, error: lookupError } = mt5ConnectionId
    ? await query.eq("mt5_connection_id", mt5ConnectionId).maybeSingle()
    : await query.is("mt5_connection_id", null).maybeSingle();

  const { error } = lookupError
    ? { error: lookupError }
    : existingPlan
      ? await supabase.from("performance_plans").update(payload).eq("id", existingPlan.id)
      : await supabase.from("performance_plans").insert(payload);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings/performance");

  if (error) {
    redirect(`/dashboard/settings/performance?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard/settings/performance?saved=1");
}
