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
  const allowedDirections = rules.allowed_directions.length ? rules.allowed_directions : ["long", "short"];
  const manualRuleIds = new Set(trade.manualRuleIds ?? []);

  const items: ChecklistItemResult[] = [
    item("risk", `Risk must be below ${rules.max_risk_percent}%`, trade.risk_percent <= rules.max_risk_percent),
    item("rr", `RR must be at least 1:${rules.min_rr}`, trade.rr >= rules.min_rr),
    item(
      "session",
      `Session must be one of: ${rules.allowed_sessions.join(", ") || "Any"}`,
      allowedSessions.length === 0 || allowedSessions.includes(normalize(trade.session)),
    ),
    item(
      "pair",
      allowedPairs.length ? `Pair must be one of: ${rules.allowed_pairs.join(", ")}` : "Pair is allowed",
      allowedPairs.length === 0 || allowedPairs.includes(normalize(trade.pair)),
    ),
    item(
      "direction",
      `Direction must be one of: ${allowedDirections.join(", ")}`,
      allowedDirections.includes(trade.direction),
    ),
    item(
      "screenshot",
      rules.require_screenshot ? "Screenshot required" : "Screenshot optional",
      !rules.require_screenshot || trade.hasScreenshot,
    ),
    item(
      "trades-per-day",
      `Max trades per day: ${rules.max_trades_per_day}`,
      (trade.tradesToday ?? 0) < rules.max_trades_per_day,
    ),
  ];

  if (rules.confirmation_required) {
    items.push(item("confirmation", "Confirmation candle closed", trade.confirmation));
  }

  if (/revenge|frustrated|angry|tilt|chasing|impatient/i.test(trade.emotions)) {
    items.push(item("emotional-control", "No revenge trading", false));
  } else {
    items.push(item("emotional-control", "No revenge trading", true));
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
