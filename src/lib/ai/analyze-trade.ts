import OpenAI from "openai";

import { getEmotionRisk } from "@/lib/emotions";
import { env } from "@/lib/env";
import type { AiAnalysis, ChecklistItemResult, RuleSettings, TradeDirection } from "@/lib/supabase/types";
import { detectRuleViolations } from "@/lib/trade-rules";

type AnalyzeTradeInput = {
  tradeId: string;
  userId: string;
  pair: string;
  direction: TradeDirection;
  risk_percent: number;
  rr: number;
  session: string;
  emotions: string;
  notes: string;
  confirmation: boolean;
  trade_taken_at: string;
  imageDataUrl?: string | null;
  rules: RuleSettings;
  checklist?: {
    items: ChecklistItemResult[];
    passedRules: string[];
    failedRules: string[];
    completionRate: number;
    disciplineScore: number;
  };
  tradesToday?: number;
};

function mockAnalysis(input: AnalyzeTradeInput): Omit<AiAnalysis, "id" | "created_at"> {
  const ruleViolations =
    input.checklist?.failedRules ??
    detectRuleViolations({ ...input, hasScreenshot: Boolean(input.imageDataUrl) }, input.rules);
  const emotionalRisk = getEmotionRisk(input.emotions);
  const baseDiscipline = 92 - ruleViolations.length * 14 - (emotionalRisk === "high-risk" ? 10 : 0);
  const disciplineScore = Math.max(20, Math.min(96, baseDiscipline));
  const setupQualityScore = Math.max(35, Math.min(90, 68 + (input.rr >= input.rules.min_rr ? 8 : -10)));

  return {
    trade_id: input.tradeId,
    user_id: input.userId,
    setup_quality_score: setupQualityScore,
    discipline_score: disciplineScore,
    strengths: [
      input.notes.length > 40 ? "Trade context was documented with useful detail" : "Trade was logged promptly",
      input.risk_percent <= input.rules.max_risk_percent
        ? "Risk stayed within the written plan"
        : "Risk was visible enough to audit",
    ],
    weaknesses: ruleViolations.length
      ? ["Execution drifted from at least one rule"]
      : ["Post-trade review can include clearer exit criteria"],
    detected_mistakes: ruleViolations.length
      ? ruleViolations
      : ["No major rule break detected in the submitted fields"],
    rule_violations: ruleViolations,
    emotional_observations:
      emotionalRisk === "high-risk"
        ? ["Selected emotions suggest a high-risk state before entry"]
        : emotionalRisk === "warning"
          ? ["Selected emotions suggest caution before entry"]
          : ["Emotional state appears stable from the submitted notes"],
    improvement_suggestions: [
      "Write the invalidation level before entry",
      "Check risk, session, RR, and confirmation as a final pre-trade gate",
      ...(input.rules.custom_rules.length ? ["Review your personal rules before taking the next setup"] : []),
    ],
    recurring_mistakes: ruleViolations.slice(0, 3),
    model: "mock",
  };
}

export async function analyzeTrade(input: AnalyzeTradeInput): Promise<Omit<AiAnalysis, "id" | "created_at">> {
  if (!env.openaiApiKey) {
    return mockAnalysis(input);
  }

  try {
    const client = new OpenAI({ apiKey: env.openaiApiKey });
    const response = await client.responses.create({
      model: "gpt-5.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `You are TradeGuardian AI, a discipline coach. Analyze this trade without giving signals or predictions. Return strict JSON with keys: setup_quality_score, discipline_score, strengths, weaknesses, detected_mistakes, rule_violations, emotional_observations, improvement_suggestions, recurring_mistakes.

Trade:
Pair: ${input.pair}
Trade taken at: ${input.trade_taken_at}
Risk: ${input.risk_percent}%
RR: ${input.rr}
Session: ${input.session}
Confirmation: ${input.confirmation ? "yes" : "no"}
Emotions: ${input.emotions}
Notes: ${input.notes}
Rules: ${JSON.stringify(input.rules)}
Checklist results: ${JSON.stringify(input.checklist ?? null)}`,
            },
            ...(input.imageDataUrl
              ? [{ type: "input_image" as const, image_url: input.imageDataUrl, detail: "low" as const }]
              : []),
          ],
        },
      ],
    });

    const text = response.output_text;
    const parsed = JSON.parse(text) as Partial<AiAnalysis>;
    const fallback = mockAnalysis(input);

    return {
      trade_id: input.tradeId,
      user_id: input.userId,
      setup_quality_score: Number(parsed.setup_quality_score ?? fallback.setup_quality_score),
      discipline_score: Number(parsed.discipline_score ?? fallback.discipline_score),
      strengths: parsed.strengths ?? fallback.strengths,
      weaknesses: parsed.weaknesses ?? fallback.weaknesses,
      detected_mistakes: parsed.detected_mistakes ?? fallback.detected_mistakes,
      rule_violations: parsed.rule_violations ?? fallback.rule_violations,
      emotional_observations: parsed.emotional_observations ?? fallback.emotional_observations,
      improvement_suggestions: parsed.improvement_suggestions ?? fallback.improvement_suggestions,
      recurring_mistakes: parsed.recurring_mistakes ?? fallback.recurring_mistakes,
      model: "gpt-5.1-mini",
    };
  } catch {
    return mockAnalysis(input);
  }
}
