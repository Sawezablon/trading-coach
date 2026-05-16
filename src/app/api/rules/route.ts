import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function optionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return 0;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
  const allowedSessions = String(formData.get("allowed_sessions") ?? "")
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
      max_risk_percent: optionalNumber(formData.get("max_risk_percent")),
      min_rr: optionalNumber(formData.get("min_rr")),
      allowed_sessions: allowedSessions,
      allowed_pairs: allowedPairs,
      allowed_directions: allowedDirections,
      confirmation_required:
        formData.get("confirmation_required") === "on" || formData.get("confirmation_required") === "true",
      require_screenshot: formData.get("require_screenshot") === "on" || formData.get("require_screenshot") === "true",
      max_trades_per_day: optionalNumber(formData.get("max_trades_per_day")),
      require_stop_loss: formData.get("require_stop_loss") === "on" || formData.get("require_stop_loss") === "true",
      require_take_profit:
        formData.get("require_take_profit") === "on" || formData.get("require_take_profit") === "true",
      check_emotional_state: false,
      strict_mode: formData.get("strict_mode") === "on" || formData.get("strict_mode") === "true",
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
