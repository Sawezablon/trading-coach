import type { RuleSettings } from "@/lib/supabase/types";

type TradeRuleInput = {
  risk_percent: number;
  rr: number;
  session: string;
  confirmation: boolean;
  emotions: string;
  tradesToday?: number;
};

export function detectRuleViolations(trade: TradeRuleInput, rules: RuleSettings) {
  const violations: string[] = [];

  if (trade.risk_percent > rules.max_risk_percent) {
    violations.push(`Risk too high: ${trade.risk_percent}% exceeds ${rules.max_risk_percent}% max`);
  }

  if (trade.rr < rules.min_rr) {
    violations.push(`Minimum RR not met: ${trade.rr}R is below ${rules.min_rr}R`);
  }

  if (!rules.allowed_sessions.includes(trade.session)) {
    violations.push(`Entered outside allowed session: ${trade.session}`);
  }

  if (rules.confirmation_required && !trade.confirmation) {
    violations.push("Confirmation required before entry");
  }

  if ((trade.tradesToday ?? 0) >= rules.max_trades_per_day) {
    violations.push(`Max trades per day reached: ${rules.max_trades_per_day}`);
  }

  if (/revenge|frustrated|angry|tilt|chasing|impatient/i.test(trade.emotions)) {
    violations.push("Possible revenge trading behavior");
  }

  return violations;
}
