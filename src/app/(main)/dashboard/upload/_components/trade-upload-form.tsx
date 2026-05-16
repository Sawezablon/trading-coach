"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Mt5ConnectionStatus } from "@/lib/data/mt5";
import { emotionOptions, parseEmotionValues } from "@/lib/emotions";
import { getMt5ConnectionLabel } from "@/lib/mt5-label";
import type { RuleSettings, Trade, TradeDirection, TradeResult, TradeStatus } from "@/lib/supabase/types";
import { evaluateTradeChecklist } from "@/lib/trade-rules";

type TradeResponse = {
  trade?: { id: string };
  error?: string;
};

type TradeFormProps = {
  rules: RuleSettings;
  tradeTimestamps: string[];
  connections: Mt5ConnectionStatus[];
  selectedConnectionId: string | null;
  initialTrade?: Trade;
};

function toDatetimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function sameLocalDate(a: string, b: string) {
  const left = new Date(a);
  const right = new Date(b);
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) {
    return false;
  }

  return left.toDateString() === right.toDateString();
}

function manualIdsFromTrade(trade: Trade | undefined) {
  return (trade?.checklist_results ?? [])
    .filter((item) => item.type === "manual" && item.status === "passed")
    .map((item) => item.id);
}

function optionalDateTimeValue(value: string | null | undefined) {
  return value ? toDatetimeLocalValue(new Date(value)) : "";
}

export function TradeUploadForm({
  rules,
  tradeTimestamps,
  connections,
  selectedConnectionId,
  initialTrade,
}: TradeFormProps) {
  const router = useRouter();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialTrade?.screenshot_url ?? null);
  const [pending, setPending] = useState(false);
  const [pair, setPair] = useState(initialTrade?.pair ?? "");
  const [direction, setDirection] = useState<TradeDirection>(initialTrade?.direction ?? "long");
  const [mt5ConnectionId, setMt5ConnectionId] = useState(initialTrade?.mt5_connection_id ?? selectedConnectionId ?? "");
  const [tradeTakenAt, setTradeTakenAt] = useState(() =>
    initialTrade ? toDatetimeLocalValue(new Date(initialTrade.trade_taken_at)) : toDatetimeLocalValue(new Date()),
  );
  const [riskPercent, setRiskPercent] = useState(Number(initialTrade?.risk_percent ?? 0));
  const [rr, setRr] = useState(Number(initialTrade?.rr ?? 0));
  const [session, setSession] = useState(initialTrade?.session ?? "London");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(() =>
    parseEmotionValues(initialTrade?.emotions ?? ""),
  );
  const [confirmation, setConfirmation] = useState(initialTrade?.confirmation ?? false);
  const [status, setStatus] = useState<TradeStatus>(initialTrade?.status ?? "open");
  const [outcome, setOutcome] = useState<TradeResult>(initialTrade?.outcome ?? "pending");
  const [closedAt, setClosedAt] = useState(() => optionalDateTimeValue(initialTrade?.closed_at));
  const [manualRuleIds, setManualRuleIds] = useState<string[]>(() => manualIdsFromTrade(initialTrade));
  const tradeTimezone = initialTrade?.trade_timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  const tradesToday = tradeTimestamps.filter((timestamp) => sameLocalDate(timestamp, tradeTakenAt)).length;
  const emotions = selectedEmotions.join(",");
  const tradeTakenAtIso = Number.isNaN(new Date(tradeTakenAt).getTime())
    ? new Date().toISOString()
    : new Date(tradeTakenAt).toISOString();

  const checklist = evaluateTradeChecklist(
    {
      pair,
      direction,
      risk_percent: riskPercent,
      rr,
      session,
      emotions,
      confirmation,
      hasScreenshot: Boolean(file || initialTrade?.screenshot_url),
      trade_taken_at: tradeTakenAtIso,
      tradesToday,
      manualRuleIds,
    },
    rules,
  );
  const hasRequiredFailures = checklist.requiredFailures.length > 0;

  useEffect(() => {
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (status === "open") {
      setOutcome("pending");
      setClosedAt("");
    } else if (outcome === "pending") {
      setOutcome("win");
      setClosedAt((current) => current || toDatetimeLocalValue(new Date()));
    }
  }, [outcome, status]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const submittedAt = new Date(tradeTakenAt);
    if (Number.isNaN(submittedAt.getTime())) {
      toast.error("Trade date & time is required.");
      setPending(false);
      return;
    }

    const dayStart = new Date(submittedAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    formData.set("trade_taken_at", submittedAt.toISOString());
    formData.set("trade_timezone", tradeTimezone);
    formData.set("trade_day_start", dayStart.toISOString());
    formData.set("trade_day_end", dayEnd.toISOString());
    formData.set("emotions", emotions);
    formData.set("status", status);
    formData.set("outcome", status === "open" ? "pending" : outcome);
    formData.set("manual_rule_ids", manualRuleIds.join(","));
    formData.set("mt5_connection_id", mt5ConnectionId);
    if (file) {
      formData.set("screenshot", file);
    }

    if (status === "closed") {
      const closedDate = new Date(closedAt);
      if (outcome === "pending" || Number.isNaN(closedDate.getTime())) {
        toast.error("Closed trades need an outcome and closed date & time.");
        setPending(false);
        return;
      }
      formData.set("closed_at", closedDate.toISOString());
    }

    if (rules.strict_mode && hasRequiredFailures) {
      toast.error("Strict mode is on. This trade violates your rules.");
      setPending(false);
      return;
    }

    const response = await fetch(initialTrade ? `/api/trades/${initialTrade.id}` : "/api/trades", {
      method: initialTrade ? "PATCH" : "POST",
      body: formData,
    });
    const payload = (await response.json()) as TradeResponse;
    setPending(false);

    if (!response.ok || payload.error || !payload.trade) {
      toast.error(payload.error ?? "Trade could not be saved.");
      return;
    }

    toast.success(initialTrade ? "Trade updated." : "Trade logged and analyzed.");
    router.push(`/dashboard/trades/${payload.trade.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 xl:grid-cols-12">
      <div className="space-y-4 xl:col-span-7">
        {initialTrade?.review_status === "needs_review" ? (
          <Card className="border-[#F59E0B]/25 bg-[#F59E0B]/10">
            <CardContent className="p-4">
              <div className="font-medium">Complete this MT5 review</div>
              <p className="mt-1 text-muted-foreground text-sm">
                Qyvex filled the broker facts. Add the missing trading context, emotions, screenshot, and checklist.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Trade context</CardTitle>
            <CardDescription>Capture the facts needed to audit your rule discipline.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pair">Pair</Label>
              <Input
                id="pair"
                name="pair"
                placeholder="XAUUSD"
                required
                value={pair}
                onChange={(event) => setPair(event.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direction">Direction</Label>
              <Select
                name="direction"
                value={direction}
                onValueChange={(value) => setDirection(value as TradeDirection)}
              >
                <SelectTrigger id="direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {connections.length ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="mt5_connection_id">Trading account</Label>
                <Select name="mt5_connection_id" value={mt5ConnectionId} onValueChange={setMt5ConnectionId}>
                  <SelectTrigger id="mt5_connection_id">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id}>
                        {getMt5ConnectionLabel(connection)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Manual entries saved here stay inside this same account view.
                </p>
              </div>
            ) : (
              <input type="hidden" name="mt5_connection_id" value="" />
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="trade_taken_at">Trade date &amp; time</Label>
              <Input
                id="trade_taken_at"
                name="trade_taken_at"
                type="datetime-local"
                required
                value={tradeTakenAt}
                onChange={(event) => setTradeTakenAt(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_price">Entry price</Label>
              <Input
                id="entry_price"
                name="entry_price"
                type="number"
                step="0.00001"
                min="0"
                placeholder="Optional"
                defaultValue={initialTrade?.entry_price ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stop_loss">Stop loss</Label>
              <Input
                id="stop_loss"
                name="stop_loss"
                type="number"
                step="0.00001"
                min="0"
                placeholder="Optional"
                defaultValue={initialTrade?.stop_loss ?? ""}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="take_profit">Take profit</Label>
              <Input
                id="take_profit"
                name="take_profit"
                type="number"
                step="0.00001"
                min="0"
                placeholder="Optional"
                defaultValue={initialTrade?.take_profit ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk_percent">Risk %</Label>
              <Input
                id="risk_percent"
                name="risk_percent"
                type="number"
                step="0.1"
                min="0"
                placeholder="1"
                required
                value={riskPercent || ""}
                onChange={(event) => setRiskPercent(Number(event.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rr">RR</Label>
              <Input
                id="rr"
                name="rr"
                type="number"
                step="0.1"
                min="0"
                placeholder="2.5"
                required
                value={rr || ""}
                onChange={(event) => setRr(Number(event.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session">Session</Label>
              <Select name="session" value={session} onValueChange={setSession}>
                <SelectTrigger id="session">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia">Asia</SelectItem>
                  <SelectItem value="London">London</SelectItem>
                  <SelectItem value="New York">New York</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 self-end rounded-lg border p-3">
              <Checkbox
                id="confirmation"
                name="confirmation"
                checked={confirmation}
                onCheckedChange={(checked) => setConfirmation(Boolean(checked))}
              />
              <Label htmlFor="confirmation" className="text-sm">
                Confirmation was present
              </Label>
            </div>

            <div className="space-y-3 md:col-span-2">
              <Label>Emotions before trade</Label>
              <div className="flex flex-wrap gap-2">
                {emotionOptions.map((emotion) => {
                  const selected = selectedEmotions.includes(emotion.value);

                  return (
                    <Button
                      key={emotion.value}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setSelectedEmotions((current) =>
                          current.includes(emotion.value)
                            ? current.filter((value) => value !== emotion.value)
                            : [...current, emotion.value],
                        );
                      }}
                    >
                      {emotion.label}
                    </Button>
                  );
                })}
              </div>
              <input type="hidden" name="emotions" value={emotions} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Trade notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Setup, entry reason, invalidation, management notes..."
                required
                defaultValue={initialTrade?.notes ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" value={status} onValueChange={(value) => setStatus(value as TradeStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Select
                name="outcome"
                value={outcome}
                disabled={status === "open"}
                onValueChange={(value) => setOutcome(value as TradeResult)}
              >
                <SelectTrigger id="outcome">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="win">Win</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="breakeven">Breakeven</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === "closed" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="closed_at">Closed date &amp; time</Label>
                  <Input
                    id="closed_at"
                    name="closed_at"
                    type="datetime-local"
                    required
                    value={closedAt}
                    onChange={(event) => setClosedAt(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="close_price">Close price</Label>
                  <Input
                    id="close_price"
                    name="close_price"
                    type="number"
                    step="0.00001"
                    min="0"
                    placeholder="Optional"
                    defaultValue={initialTrade?.close_price ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profit_loss_percent">Profit/loss %</Label>
                  <Input
                    id="profit_loss_percent"
                    name="profit_loss_percent"
                    type="number"
                    step="0.01"
                    placeholder="Optional"
                    defaultValue={initialTrade?.profit_loss_percent ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profit_loss_amount">Profit/loss amount</Label>
                  <Input
                    id="profit_loss_amount"
                    name="profit_loss_amount"
                    type="number"
                    step="0.01"
                    placeholder="Optional"
                    defaultValue={initialTrade?.profit_loss_amount ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="final_rr">Final RR achieved</Label>
                  <Input
                    id="final_rr"
                    name="final_rr"
                    type="number"
                    step="0.1"
                    placeholder="Optional"
                    defaultValue={initialTrade?.final_rr ?? ""}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="closing_notes">Closing notes</Label>
                  <Textarea
                    id="closing_notes"
                    name="closing_notes"
                    placeholder="Exit reason, management notes, lessons..."
                    defaultValue={initialTrade?.closing_notes ?? ""}
                  />
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chart screenshot</CardTitle>
            <CardDescription>PNG, JPG, or WEBP. Stored in Supabase when configured.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              id={inputId}
              ref={fileInputRef}
              type="file"
              name="screenshot"
              accept="image/*"
              className="sr-only"
              onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload />
                Choose image
              </Button>
              {file ? <Badge variant="secondary">{file.name}</Badge> : null}
            </div>

            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
              {previewUrl ? (
                // biome-ignore lint/performance/noImgElement: local object URLs are not supported by next/image.
                <img src={previewUrl} alt="Trade chart preview" className="h-full w-full object-cover" />
              ) : (
                <div className="text-muted-foreground text-sm">Screenshot preview</div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? "Saving..." : initialTrade ? "Save changes" : "Save trade and analyze"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="xl:sticky xl:top-20 xl:col-span-5 xl:self-start">
        <CardHeader>
          <CardTitle>Pre-Trade Checklist</CardTitle>
          <CardDescription>Live rule check before saving this trade.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasRequiredFailures ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm shadow-[0_0_40px_rgb(239_68_68/0.08)]">
              This trade violates your rules.
            </div>
          ) : null}
          <div className="space-y-2.5">
            {checklist.items.map((rule) => (
              <div
                key={rule.id}
                className={
                  rule.status === "passed"
                    ? "flex items-start gap-3 rounded-2xl border border-[#22C55E]/20 bg-[#22C55E]/10 p-3 text-sm shadow-[0_0_28px_rgb(34_197_94/0.08)] transition-all"
                    : rule.status === "failed"
                      ? "flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-sm shadow-[0_0_28px_rgb(239_68_68/0.06)] transition-all"
                      : "flex items-start gap-3 rounded-2xl border border-border/80 bg-secondary/50 p-3 text-sm transition-all"
                }
              >
                {rule.type === "manual" ? (
                  <Checkbox
                    checked={manualRuleIds.includes(rule.id)}
                    onCheckedChange={(checked) => {
                      setManualRuleIds((current) =>
                        checked ? [...current, rule.id] : current.filter((id) => id !== rule.id),
                      );
                    }}
                  />
                ) : (
                  <span
                    className={
                      rule.status === "passed"
                        ? "mt-0.5 flex size-5 items-center justify-center rounded-full bg-[#22C55E] text-[10px] text-white shadow-[0_0_18px_rgb(34_197_94/0.35)]"
                        : "mt-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground shadow-[0_0_18px_rgb(239_68_68/0.25)]"
                    }
                  >
                    {rule.status === "passed" ? "OK" : "!"}
                  </span>
                )}
                <div className="flex-1">
                  <div className="font-medium">{rule.label}</div>
                  <div className="text-muted-foreground text-xs capitalize">
                    {rule.type} - {rule.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border bg-secondary/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Checklist completion</span>
              <span className="font-semibold">{checklist.completionRate}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${checklist.completionRate}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
