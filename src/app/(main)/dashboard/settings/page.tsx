import { saveRulesAction } from "@/app/(main)/dashboard/settings/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getRules } from "@/lib/data/trades";

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
        <h1 className="text-3xl tracking-tight">Rules</h1>
        <p className="text-muted-foreground text-sm">
          Define the guardrails Qyvex Edge uses to detect discipline breaks.
        </p>
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
          <CardTitle>Trading rules</CardTitle>
          <CardDescription>Comma separate sessions, for example: London, New York.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveRulesAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max_risk_percent">Max risk %</Label>
              <Input
                id="max_risk_percent"
                name="max_risk_percent"
                type="number"
                step="0.1"
                defaultValue={rules.max_risk_percent}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_rr">Minimum RR</Label>
              <Input id="min_rr" name="min_rr" type="number" step="0.1" defaultValue={rules.min_rr} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowed_sessions">Allowed sessions</Label>
              <Input id="allowed_sessions" name="allowed_sessions" defaultValue={rules.allowed_sessions.join(", ")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowed_pairs">Allowed pairs</Label>
              <Input id="allowed_pairs" name="allowed_pairs" defaultValue={rules.allowed_pairs.join(", ")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_trades_per_day">Max trades per day</Label>
              <Input
                id="max_trades_per_day"
                name="max_trades_per_day"
                type="number"
                defaultValue={rules.max_trades_per_day}
              />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
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
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3 md:col-span-2">
              <Checkbox
                id="confirmation_required"
                name="confirmation_required"
                defaultChecked={rules.confirmation_required}
              />
              <Label htmlFor="confirmation_required">Confirmation required before entry</Label>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3 md:col-span-2">
              <Checkbox id="require_screenshot" name="require_screenshot" defaultChecked={rules.require_screenshot} />
              <Label htmlFor="require_screenshot">Screenshot required before saving a trade</Label>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3 md:col-span-2">
              <Checkbox id="strict_mode" name="strict_mode" defaultChecked={rules.strict_mode} />
              <Label htmlFor="strict_mode">Strict mode: block trades when required rules fail</Label>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="custom_rules">Your personal rules</Label>
              <Textarea
                id="custom_rules"
                name="custom_rules"
                defaultValue={(rules.custom_rules ?? []).join("\n")}
                placeholder={"One rule per line\nExample: No trades before my pre-market checklist is complete"}
                className="min-h-32"
              />
              <p className="text-muted-foreground text-xs">
                Add one rule per line. Qyvex Edge will include these in future AI reviews.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Rule notes</Label>
              <Textarea id="notes" name="notes" defaultValue={rules.notes ?? ""} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save rules</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
