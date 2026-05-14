"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveRulesAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    revalidatePath("/dashboard/settings");
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const allowedSessions = String(formData.get("allowed_sessions") ?? "London")
    .split(",")
    .map((session) => session.trim())
    .filter(Boolean);
  const allowedPairs = String(formData.get("allowed_pairs") ?? "")
    .split(",")
    .map((pair) => pair.trim().toUpperCase())
    .filter(Boolean);
  const allowedDirections = formData
    .getAll("allowed_directions")
    .map((direction) => String(direction))
    .filter((direction) => direction === "long" || direction === "short");
  const customRules = String(formData.get("custom_rules") ?? "")
    .split(/\r?\n/)
    .map((rule) => rule.trim())
    .filter(Boolean);

  const { error } = await supabase.from("trading_rules").upsert(
    {
      user_id: user.id,
      max_risk_percent: Number(formData.get("max_risk_percent") ?? 1),
      min_rr: Number(formData.get("min_rr") ?? 2),
      allowed_sessions: allowedSessions.length ? allowedSessions : ["London"],
      allowed_pairs: allowedPairs,
      allowed_directions: allowedDirections.length ? allowedDirections : ["long", "short"],
      confirmation_required:
        formData.get("confirmation_required") === "on" || formData.get("confirmation_required") === "true",
      require_screenshot: formData.get("require_screenshot") === "on" || formData.get("require_screenshot") === "true",
      max_trades_per_day: Number(formData.get("max_trades_per_day") ?? 3),
      strict_mode: formData.get("strict_mode") === "on" || formData.get("strict_mode") === "true",
      custom_rules: customRules,
      notes: String(formData.get("notes") ?? ""),
    },
    { onConflict: "user_id" },
  );

  revalidatePath("/dashboard/settings");

  if (error) {
    redirect(`/dashboard/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard/settings?saved=1");
}
