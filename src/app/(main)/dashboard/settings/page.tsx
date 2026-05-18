import Link from "next/link";

import { saveRulesAction } from "@/app/(main)/dashboard/settings/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getRules } from "@/lib/data/trades";

import { FeedbackActions } from "../_components/feedback/feedback-actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const rules = await getRules();
  const params = await searchParams;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="space-y-1">
        <div className="text-muted-foreground text-sm">Settings</div>
        <h1 className="font-semibold text-4xl tracking-tight">Rules</h1>
        <p className="text-muted-foreground text-sm">
          Define the guardrails Qyvex Edge uses to detect discipline breaks.
        </p>
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/settings/performance">Performance plan</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings/mt5">MT5 Sync settings</Link>
          </Button>
        </div>
      </div>

      {params.saved ? (
        <Alert>
          <AlertDescription>Rules saved.</AlertDescription>
        </Alert>
      ) : null}

      {params.error ? (
        <Alert variant="destructive">
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Feedback & reports</CardTitle>
          <CardDescription>
            Qyvex Edge is in V1. Send bugs, confusing moments, or product ideas directly from the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackActions />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trading rules</CardTitle>
          <CardDescription>
            Select the system rules Qyvex should check. Blank fields and unchecked toggles are ignored.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveRulesAction} className="space-y-6">
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-4">
                <h2 className="font-semibold text-lg">System rules</h2>
                <p className="text-muted-foreground text-sm">
                  Automatic checks Qyvex can run from form values and MT5 data. Leave a field blank to skip it.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max_risk_percent">Max risk %</Label>
                  <Input
                    id="max_risk_percent"
                    name="max_risk_percent"
                    type="number"
                    step="0.1"
                    defaultValue={optionalRuleValue(rules.max_risk_percent)}
                    placeholder="Blank = do not check"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_rr">Minimum RR</Label>
                  <Input
                    id="min_rr"
                    name="min_rr"
                    type="number"
                    step="0.1"
                    defaultValue={optionalRuleValue(rules.min_rr)}
                    placeholder="Blank = do not check"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowed_sessions">Allowed sessions</Label>
                  <Input
                    id="allowed_sessions"
                    name="allowed_sessions"
                    defaultValue={rules.allowed_sessions.join(", ")}
                    placeholder="London, New York"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowed_pairs">Allowed pairs</Label>
                  <Input
                    id="allowed_pairs"
                    name="allowed_pairs"
                    defaultValue={rules.allowed_pairs.join(", ")}
                    placeholder="XAUUSD, EURUSD"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_trades_per_day">Max trades per day</Label>
                  <Input
                    id="max_trades_per_day"
                    name="max_trades_per_day"
                    type="number"
                    defaultValue={optionalRuleValue(rules.max_trades_per_day)}
                    placeholder="Blank = do not check"
                  />
                </div>
                <div className="space-y-2 rounded-xl border bg-background/40 p-3">
                  <Label>Allowed directions</Label>
                  <div className="flex gap-4 pt-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id="allowed_direction_long"
                        name="allowed_directions"
                        value="long"
                        defaultChecked={rules.allowed_directions.includes("long")}
                      />
                      <Label htmlFor="allowed_direction_long" className="font-normal">
                        Buy
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id="allowed_direction_short"
                        name="allowed_directions"
                        value="short"
                        defaultChecked={rules.allowed_directions.includes("short")}
                      />
                      <Label htmlFor="allowed_direction_short" className="font-normal">
                        Sell
                      </Label>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">Leave both unchecked to skip direction checks.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <SystemToggle
                  id="require_stop_loss"
                  defaultChecked={rules.require_stop_loss}
                  label="Require stop loss"
                />
                <SystemToggle
                  id="require_take_profit"
                  defaultChecked={rules.require_take_profit}
                  label="Require take profit"
                />
                <SystemToggle
                  id="require_screenshot"
                  defaultChecked={rules.require_screenshot}
                  label="Screenshot required before saving a trade"
                />
                <SystemToggle
                  id="strict_mode"
                  defaultChecked={rules.strict_mode}
                  label="Strict mode: block trades when required rules fail"
                />
              </div>
            </section>

            <section className="rounded-2xl border bg-card/60 p-4">
              <div className="mb-4">
                <h2 className="font-semibold text-lg">User rules</h2>
                <p className="text-muted-foreground text-sm">
                  Manual checklist items that only you can confirm before saving a trade.
                </p>
              </div>

              <div className="space-y-4">
                <SystemToggle
                  id="confirmation_required"
                  defaultChecked={rules.confirmation_required}
                  label="Confirmation required before entry"
                />
                <div className="space-y-2">
                  <Label htmlFor="custom_rules">Your personal rules</Label>
                  <Textarea
                    id="custom_rules"
                    name="custom_rules"
                    defaultValue={(rules.custom_rules ?? []).join("\n")}
                    placeholder={"One rule per line\nExample: No trades before my pre-market checklist is complete"}
                    className="min-h-32"
                  />
                  <p className="text-muted-foreground text-xs">
                    Add one rule per line. These become the User Checklist on the trade page.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Rule notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={rules.notes ?? ""} />
                </div>
              </div>
            </section>

            <Button type="submit">Save rules</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function optionalRuleValue(value: number) {
  return value > 0 ? value : "";
}

function SystemToggle({ defaultChecked, id, label }: { defaultChecked: boolean; id: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-background/40 p-3">
      <Checkbox id={id} name={id} defaultChecked={defaultChecked} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
