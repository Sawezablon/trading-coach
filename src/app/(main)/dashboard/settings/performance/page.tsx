import Link from "next/link";

import { savePerformancePlanAction } from "@/app/(main)/dashboard/settings/performance/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMt5AccountContext } from "@/lib/data/mt5";
import { getActivePerformancePlan, getPerformancePlans } from "@/lib/data/performance-plans";
import { getMt5ConnectionLabel } from "@/lib/mt5-label";

export default async function PerformancePlanSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const [plans, accountContext] = await Promise.all([getPerformancePlans(), getMt5AccountContext()]);
  const selectedPlanConnectionId = params.account === "default" ? null : (params.account ?? null);
  const plan = getActivePerformancePlan(plans, selectedPlanConnectionId);
  const formConnectionId = selectedPlanConnectionId ?? plan.mt5_connection_id ?? "default";

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="space-y-1">
        <div className="text-muted-foreground text-sm">Settings</div>
        <h1 className="font-semibold text-4xl tracking-tight">Performance plan</h1>
        <p className="text-muted-foreground text-sm">
          Set the monthly targets Qyvex Edge uses to judge whether performance is on track.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard/settings">Trading rules</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/settings/mt5">MT5 Sync settings</Link>
        </Button>
      </div>

      {params.saved ? (
        <Alert>
          <AlertDescription>Performance plan saved.</AlertDescription>
        </Alert>
      ) : null}

      {params.error ? (
        <Alert variant="destructive">
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant={formConnectionId === "default" ? "default" : "outline"}>
          <Link href="/dashboard/settings/performance?account=default">Default plan</Link>
        </Button>
        {accountContext.connections.map((connection) => (
          <Button
            asChild
            key={connection.id}
            size="sm"
            variant={formConnectionId === connection.id ? "default" : "outline"}
          >
            <Link href={`/dashboard/settings/performance?account=${connection.id}`}>
              {getMt5ConnectionLabel(connection)}
            </Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly performance targets</CardTitle>
          <CardDescription>
            Use a default plan for manual trades, or create account-specific targets for each prop firm or broker
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={savePerformancePlanAction} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mt5_connection_id">Plan applies to</Label>
                <select
                  id="mt5_connection_id"
                  name="mt5_connection_id"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  defaultValue={formConnectionId}
                >
                  <option value="default">Default plan and manual trades</option>
                  {accountContext.connections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {getMt5ConnectionLabel(connection)}
                    </option>
                  ))}
                </select>
              </div>
              <PlanInput
                defaultValue={plan.name}
                description="Example: FTMO challenge, Personal account, Conservative month"
                label="Plan name"
                name="name"
              />
            </div>

            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-4">
                <h2 className="font-semibold text-lg">Monthly target</h2>
                <p className="text-muted-foreground text-sm">
                  These numbers power the dashboard's current-month plan tracker.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <PlanInput
                  defaultValue={plan.monthly_profit_target_percent}
                  label="Profit target %"
                  name="monthly_profit_target_percent"
                  step="0.1"
                  type="number"
                />
                <PlanInput
                  defaultValue={plan.max_monthly_loss_percent}
                  label="Max monthly loss %"
                  name="max_monthly_loss_percent"
                  step="0.1"
                  type="number"
                />
                <PlanInput
                  defaultValue={plan.max_trades_per_month}
                  label="Max trades per month"
                  name="max_trades_per_month"
                  type="number"
                />
                <PlanInput
                  defaultValue={plan.target_win_rate_percent}
                  label="Target win rate %"
                  name="target_win_rate_percent"
                  step="0.1"
                  type="number"
                />
                <PlanInput defaultValue={plan.target_rr} label="Target RR" name="target_rr" step="0.1" type="number" />
                <PlanInput
                  defaultValue={plan.risk_per_trade_percent}
                  label="Risk per trade %"
                  name="risk_per_trade_percent"
                  step="0.1"
                  type="number"
                />
              </div>
            </section>

            <section className="rounded-2xl border bg-card/60 p-4">
              <div className="mb-4">
                <h2 className="font-semibold text-lg">Risk and review limits</h2>
                <p className="text-muted-foreground text-sm">
                  Qyvex uses these limits to flag overtrading, drawdown pressure, and poor review hygiene.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <PlanInput
                  defaultValue={plan.max_losses_per_month}
                  label="Max losses per month"
                  name="max_losses_per_month"
                  type="number"
                />
                <PlanInput
                  defaultValue={plan.max_losing_streak}
                  label="Max losing streak"
                  name="max_losing_streak"
                  type="number"
                />
                <PlanInput
                  defaultValue={plan.max_daily_loss_percent}
                  label="Max daily loss %"
                  name="max_daily_loss_percent"
                  step="0.1"
                  type="number"
                />
                <PlanInput
                  defaultValue={plan.min_review_completion_percent}
                  label="Minimum review completion %"
                  name="min_review_completion_percent"
                  step="0.1"
                  type="number"
                />
              </div>
            </section>

            <Button type="submit">Save performance plan</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PlanInput({
  defaultValue,
  description,
  label,
  name,
  step,
  type = "text",
}: {
  defaultValue: number | string;
  description?: string;
  label: string;
  name: string;
  step?: string;
  type?: "number" | "text";
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} step={step} defaultValue={defaultValue} />
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
    </div>
  );
}
