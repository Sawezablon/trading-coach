"use server";

import { revalidatePath } from "next/cache";

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

  await supabase.from("trading_rules").upsert({
    user_id: user.id,
    max_risk_percent: Number(formData.get("max_risk_percent") ?? 1),
    min_rr: Number(formData.get("min_rr") ?? 2),
    allowed_sessions: allowedSessions,
    confirmation_required:
      formData.get("confirmation_required") === "on" || formData.get("confirmation_required") === "true",
    max_trades_per_day: Number(formData.get("max_trades_per_day") ?? 3),
    notes: String(formData.get("notes") ?? ""),
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/dashboard/settings");
}
