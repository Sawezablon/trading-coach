import { NextResponse } from "next/server";

import { analyzeTrade } from "@/lib/ai/analyze-trade";
import { demoRules } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RuleSettings } from "@/lib/supabase/types";
import { asIsoDateTime, parseTradeFormData } from "@/lib/trade-form";
import { evaluateTradeChecklist } from "@/lib/trade-rules";

async function fileToDataUrl(file: File | null) {
  if (!file || file.size === 0) {
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const screenshotEntry = formData.get("screenshot");
  const screenshot = screenshotEntry instanceof File ? screenshotEntry : null;
  const imageDataUrl = await fileToDataUrl(screenshot);
  const parsed = parseTradeFormData(formData);

  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const tradeInput = parsed.data;
  const manualRuleIds = String(formData.get("manual_rule_ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!supabase) {
    const tradeId = crypto.randomUUID();
    const checklist = evaluateTradeChecklist(
      {
        ...tradeInput,
        hasScreenshot: Boolean(screenshot),
        tradesToday: 0,
        manualRuleIds,
      },
      demoRules,
    );
    const analysis = await analyzeTrade({
      ...tradeInput,
      tradeId,
      userId: "demo-user",
      imageDataUrl,
      rules: demoRules,
      checklist,
    });

    return NextResponse.json({
      trade: {
        id: tradeId,
        user_id: "demo-user",
        ...tradeInput,
        screenshot_url: null,
        checklist_results: checklist.items,
        passed_rules: checklist.passedRules,
        failed_rules: checklist.failedRules,
        checklist_completion_rate: checklist.completionRate,
        discipline_score: checklist.disciplineScore,
        created_at: now,
        updated_at: now,
      },
      analysis: { id: crypto.randomUUID(), ...analysis, created_at: now },
      demo: true,
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existingRules, error: rulesError } = await supabase
    .from("trading_rules")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 400 });
  }

  let rulesData = existingRules;

  if (!rulesData) {
    const { data: createdRules, error: createRulesError } = await supabase
      .from("trading_rules")
      .insert({ user_id: user.id })
      .select("*")
      .single();

    if (createRulesError || !createdRules) {
      return NextResponse.json(
        { error: createRulesError?.message ?? "Trading rules could not be loaded" },
        { status: 400 },
      );
    }

    rulesData = createdRules;
  }

  const startOfDay = new Date();
  const submittedDayStart = asIsoDateTime(formData.get("trade_day_start"));
  const submittedDayEnd = asIsoDateTime(formData.get("trade_day_end"));
  startOfDay.setTime(new Date(tradeInput.trade_taken_at).getTime());
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const { count: tradesToday } = await supabase
    .from("trades")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("trade_taken_at", submittedDayStart ?? startOfDay.toISOString())
    .lt("trade_taken_at", submittedDayEnd ?? endOfDay.toISOString());

  const rules = rulesData as RuleSettings;
  const checklist = evaluateTradeChecklist(
    {
      ...tradeInput,
      hasScreenshot: Boolean(screenshot),
      tradesToday: tradesToday ?? 0,
      manualRuleIds,
    },
    rules,
  );

  if (rules.strict_mode && checklist.requiredFailures.length > 0) {
    return NextResponse.json({ error: "Strict mode is on. This trade violates your rules." }, { status: 400 });
  }

  let screenshotUrl: string | null = null;

  if (screenshot && screenshot.size > 0) {
    const extension = screenshot.name.split(".").pop() ?? "png";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("chart-screenshots").upload(path, screenshot, {
      contentType: screenshot.type,
    });

    if (!uploadError) {
      const { data } = supabase.storage.from("chart-screenshots").getPublicUrl(path);
      screenshotUrl = data.publicUrl;
    }
  }

  const { data: trade, error: tradeError } = await supabase
    .from("trades")
    .insert({
      user_id: user.id,
      ...tradeInput,
      screenshot_url: screenshotUrl,
      checklist_results: checklist.items,
      passed_rules: checklist.passedRules,
      failed_rules: checklist.failedRules,
      checklist_completion_rate: checklist.completionRate,
      discipline_score: checklist.disciplineScore,
    })
    .select()
    .single();

  if (tradeError || !trade) {
    return NextResponse.json({ error: tradeError?.message ?? "Trade could not be saved" }, { status: 400 });
  }

  const analysisInput = await analyzeTrade({
    ...tradeInput,
    tradeId: trade.id,
    userId: user.id,
    imageDataUrl,
    rules,
    checklist,
  });

  const { data: analysis, error: analysisError } = await supabase
    .from("ai_analysis")
    .insert(analysisInput)
    .select()
    .single();

  if (analysisError) {
    return NextResponse.json({ error: analysisError.message }, { status: 400 });
  }

  return NextResponse.json({ trade, analysis, demo: false });
}
