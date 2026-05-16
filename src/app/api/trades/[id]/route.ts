import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ChecklistItemResult, RuleSettings, Trade } from "@/lib/supabase/types";
import { evaluateSystemTradeReview } from "@/lib/system-review";
import { asIsoDateTime, type ParsedTradeForm, parseTradeFormData } from "@/lib/trade-form";
import { evaluateTradeChecklist } from "@/lib/trade-rules";

async function uploadScreenshot(userId: string, file: File | null) {
  const supabase = await createSupabaseServerClient();

  if (!supabase || !file || file.size === 0) {
    return null;
  }

  const extension = file.name.split(".").pop() ?? "png";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("chart-screenshots").upload(path, file, {
    contentType: file.type,
  });

  if (error) {
    return null;
  }

  const { data } = supabase.storage.from("chart-screenshots").getPublicUrl(path);
  return data.publicUrl;
}

function manualIdsFromChecklist(items: ChecklistItemResult[] | null | undefined) {
  return (items ?? []).filter((item) => item.type === "manual" && item.status === "passed").map((item) => item.id);
}

function sameNumber(left: number | null, right: number | null) {
  return Number(left ?? 0) === Number(right ?? 0);
}

async function getSelectedConnection(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userId: string,
  formData: FormData,
) {
  const connectionId = String(formData.get("mt5_connection_id") ?? "").trim();

  if (!connectionId) {
    return null;
  }

  const { data, error } = await supabase
    .from("mt5_connections")
    .select("id, account_number, broker")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Choose a valid active trading account.");
  }

  return data;
}

function entryFieldsChanged(existing: Trade, next: ParsedTradeForm, manualRuleIds: string[]) {
  const existingManualIds = manualIdsFromChecklist(existing.checklist_results).sort().join(",");
  const nextManualIds = [...manualRuleIds].sort().join(",");

  return (
    existing.pair !== next.pair ||
    existing.direction !== next.direction ||
    !sameNumber(existing.entry_price, next.entry_price) ||
    !sameNumber(existing.stop_loss, next.stop_loss) ||
    !sameNumber(existing.take_profit, next.take_profit) ||
    Number(existing.risk_percent) !== Number(next.risk_percent) ||
    Number(existing.rr) !== Number(next.rr) ||
    existing.session !== next.session ||
    existing.emotions !== next.emotions ||
    existing.notes !== next.notes ||
    existing.confirmation !== next.confirmation ||
    existing.trade_taken_at !== next.trade_taken_at ||
    existingManualIds !== nextManualIds
  );
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await request.formData();
  const parsed = parseTradeFormData(formData);

  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Trade editing requires Supabase." }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let selectedConnection: Awaited<ReturnType<typeof getSelectedConnection>>;

  try {
    selectedConnection = await getSelectedConnection(supabase, user.id, formData);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid trading account." },
      { status: 400 },
    );
  }

  const { data: existingTrade, error: tradeLoadError } = await supabase
    .from("trades")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (tradeLoadError || !existingTrade) {
    return NextResponse.json({ error: tradeLoadError?.message ?? "Trade not found" }, { status: 404 });
  }

  const manualRuleIds = String(formData.get("manual_rule_ids") ?? "")
    .split(",")
    .map((ruleId) => ruleId.trim())
    .filter(Boolean);
  const screenshotEntry = formData.get("screenshot");
  const screenshot = screenshotEntry instanceof File ? screenshotEntry : null;
  const screenshotUrl = (await uploadScreenshot(user.id, screenshot)) ?? existingTrade.screenshot_url;
  const shouldRerunRules =
    entryFieldsChanged(existingTrade as Trade, parsed.data, manualRuleIds) || Boolean(screenshot);
  const { data: rulesData, error: rulesLoadError } = await supabase
    .from("trading_rules")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (rulesLoadError) {
    return NextResponse.json({ error: rulesLoadError.message }, { status: 400 });
  }

  const rules = rulesData as RuleSettings | null;

  let checklistUpdate = {
    checklist_results: existingTrade.checklist_results,
    passed_rules: existingTrade.passed_rules,
    failed_rules: existingTrade.failed_rules,
    checklist_completion_rate: existingTrade.checklist_completion_rate,
    discipline_score: existingTrade.discipline_score,
  };

  if (shouldRerunRules) {
    const startOfDay = new Date(parsed.data.trade_taken_at);
    const submittedDayStart = asIsoDateTime(formData.get("trade_day_start"));
    const submittedDayEnd = asIsoDateTime(formData.get("trade_day_end"));
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    let tradesTodayQuery = supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("id", id)
      .gte("trade_taken_at", submittedDayStart ?? startOfDay.toISOString())
      .lt("trade_taken_at", submittedDayEnd ?? endOfDay.toISOString());
    tradesTodayQuery = selectedConnection
      ? tradesTodayQuery.eq("mt5_connection_id", selectedConnection.id)
      : tradesTodayQuery.is("mt5_connection_id", null);
    const { count: tradesToday } = await tradesTodayQuery;

    if (!rules) {
      return NextResponse.json({ error: "Trading rules could not be loaded." }, { status: 400 });
    }

    const checklist = evaluateTradeChecklist(
      {
        ...parsed.data,
        hasScreenshot: Boolean(screenshotUrl),
        tradesToday: tradesToday ?? 0,
        manualRuleIds,
      },
      rules,
    );

    if (rules.strict_mode && checklist.requiredFailures.length > 0) {
      return NextResponse.json({ error: "Strict mode is on. This trade violates your rules." }, { status: 400 });
    }

    checklistUpdate = {
      checklist_results: checklist.items,
      passed_rules: checklist.passedRules,
      failed_rules: checklist.failedRules,
      checklist_completion_rate: checklist.completionRate,
      discipline_score: checklist.disciplineScore,
    };
  }

  const { data: trade, error: updateError } = await supabase
    .from("trades")
    .update({
      ...parsed.data,
      mt5_connection_id: selectedConnection?.id ?? null,
      mt5_account: selectedConnection?.account_number ?? null,
      mt5_broker: selectedConnection?.broker ?? null,
      screenshot_url: screenshotUrl,
      ...checklistUpdate,
      system_analysis: evaluateSystemTradeReview(
        {
          ...(existingTrade as Trade),
          ...parsed.data,
        },
        rules,
      ),
      review_status: "reviewed",
      review_completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError || !trade) {
    return NextResponse.json({ error: updateError?.message ?? "Trade could not be updated" }, { status: 400 });
  }

  return NextResponse.json({ trade });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Trade deletion requires Supabase." }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("trades").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
