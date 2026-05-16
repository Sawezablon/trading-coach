import { getEmotionRisk } from "@/lib/emotions";
import type { ChecklistItemResult, RuleSettings, TradeDirection } from "@/lib/supabase/types";

export type TradeRuleInput = {
  pair: string;
  direction: TradeDirection;
  risk_percent: number;
  rr: number;
  session: string;
  confirmation: boolean;
  emotions: string;
  hasScreenshot: boolean;
  trade_taken_at: string;
  tradesToday?: number;
  manualRuleIds?: string[];
};

export type ChecklistEvaluation = {
  items: ChecklistItemResult[];
  passedRules: string[];
  failedRules: string[];
  requiredFailures: ChecklistItemResult[];
  completionRate: number;
  disciplineScore: number;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function item(
  id: string,
  label: string,
  passed: boolean,
  required = true,
  type: "auto" | "manual" = "auto",
): ChecklistItemResult {
  return {
    id,
    label,
    required,
    type,
    status: passed ? "passed" : type === "manual" ? "unchecked" : "failed",
  };
}

export function evaluateTradeChecklist(trade: TradeRuleInput, rules: RuleSettings): ChecklistEvaluation {
  const allowedPairs = rules.allowed_pairs.map(normalize).filter(Boolean);
  const allowedSessions = rules.allowed_sessions.map(normalize).filter(Boolean);
  const allowedDirections = rules.allowed_directions.map(normalize).filter(Boolean);
  const manualRuleIds = new Set(trade.manualRuleIds ?? []);

  const items: ChecklistItemResult[] = [];

  if (rules.max_risk_percent > 0) {
    items.push(
      item("risk", `Risk must be below ${rules.max_risk_percent}%`, trade.risk_percent <= rules.max_risk_percent),
    );
  }

  if (rules.min_rr > 0) {
    items.push(item("rr", `RR must be at least 1:${rules.min_rr}`, trade.rr >= rules.min_rr));
  }

  if (allowedSessions.length > 0) {
    items.push(
      item(
        "session",
        `Session must be one of: ${rules.allowed_sessions.join(", ")}`,
        allowedSessions.includes(normalize(trade.session)),
      ),
    );
  }

  if (allowedPairs.length > 0) {
    items.push(
      item(
        "pair",
        `Pair must be one of: ${rules.allowed_pairs.join(", ")}`,
        allowedPairs.includes(normalize(trade.pair)),
      ),
    );
  }

  if (allowedDirections.length > 0) {
    items.push(
      item(
        "direction",
        `Direction must be one of: ${allowedDirections.join(", ")}`,
        allowedDirections.includes(trade.direction),
      ),
    );
  }

  if (rules.require_screenshot) {
    items.push(item("screenshot", "Screenshot required", trade.hasScreenshot));
  }

  if (rules.max_trades_per_day > 0) {
    items.push(
      item(
        "trades-per-day",
        `Max trades per day: ${rules.max_trades_per_day}`,
        (trade.tradesToday ?? 0) < rules.max_trades_per_day,
      ),
    );
  }

  if (rules.confirmation_required) {
    items.push(item("confirmation", "Confirmation candle closed", trade.confirmation));
  }

  if (rules.check_emotional_state) {
    const emotionRisk = getEmotionRisk(trade.emotions);

    if (emotionRisk === "high-risk") {
      items.push(item("emotional-control", "Emotional state supports disciplined execution", false));
    } else {
      items.push(item("emotional-control", "Emotional state supports disciplined execution", true));
    }
  }

  for (const [index, label] of rules.custom_rules.entries()) {
    const id = `custom-${index}`;
    items.push({
      id,
      label,
      required: true,
      type: "manual",
      status: manualRuleIds.has(id) ? "passed" : "unchecked",
    });
  }

  const passedRules = items.filter((rule) => rule.status === "passed").map((rule) => rule.label);
  const failedRules = items
    .filter((rule) => rule.status === "failed" || (rule.required && rule.status === "unchecked"))
    .map((rule) => rule.label);
  const requiredFailures = items.filter((rule) => rule.required && rule.status !== "passed");
  const completionRate = items.length ? Math.round((passedRules.length / items.length) * 100) : 100;
  const disciplineScore = Math.max(0, Math.min(100, completionRate - requiredFailures.length * 5));

  return {
    items,
    passedRules,
    failedRules,
    requiredFailures,
    completionRate,
    disciplineScore,
  };
}

export function detectRuleViolations(trade: TradeRuleInput, rules: RuleSettings) {
  return evaluateTradeChecklist(trade, rules).failedRules;
}
