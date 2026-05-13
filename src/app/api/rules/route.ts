import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const allowedSessions = String(formData.get("allowed_sessions") ?? "London")
    .split(",")
    .map((session) => session.trim())
    .filter(Boolean);
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
      confirmation_required:
        formData.get("confirmation_required") === "on" || formData.get("confirmation_required") === "true",
      max_trades_per_day: Number(formData.get("max_trades_per_day") ?? 3),
      custom_rules: customRules,
      notes: String(formData.get("notes") ?? ""),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, demo: false });
}
