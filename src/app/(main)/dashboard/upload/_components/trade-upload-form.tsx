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
import type { RuleSettings, TradeDirection } from "@/lib/supabase/types";
import { evaluateTradeChecklist } from "@/lib/trade-rules";

type TradeResponse = {
  trade?: { id: string };
  error?: string;
};

export function TradeUploadForm({ rules, tradesToday }: { rules: RuleSettings; tradesToday: number }) {
  const router = useRouter();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pair, setPair] = useState("");
  const [direction, setDirection] = useState<TradeDirection>("long");
  const [riskPercent, setRiskPercent] = useState(0);
  const [rr, setRr] = useState(0);
  const [session, setSession] = useState("London");
  const [emotions, setEmotions] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [manualRuleIds, setManualRuleIds] = useState<string[]>([]);

  const checklist = evaluateTradeChecklist(
    {
      pair,
      direction,
      risk_percent: riskPercent,
      rr,
      session,
      emotions,
      confirmation,
      hasScreenshot: Boolean(file),
      tradesToday,
      manualRuleIds,
    },
    rules,
  );
  const hasRequiredFailures = checklist.requiredFailures.length > 0;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData(event.currentTarget);
    formData.set("manual_rule_ids", manualRuleIds.join(","));
    if (file) {
      formData.set("screenshot", file);
    }

    if (rules.strict_mode && hasRequiredFailures) {
      toast.error("Strict mode is on. This trade violates your rules.");
      setPending(false);
      return;
    }

    const response = await fetch("/api/trades", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as TradeResponse;
    setPending(false);

    if (!response.ok || payload.error || !payload.trade) {
      toast.error(payload.error ?? "Trade could not be saved.");
      return;
    }

    toast.success("Trade logged and analyzed.");
    router.push(`/dashboard/trades/${payload.trade.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-7">
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
            <Select name="direction" value={direction} onValueChange={(value) => setDirection(value as TradeDirection)}>
              <SelectTrigger id="direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="long">Long</SelectItem>
                <SelectItem value="short">Short</SelectItem>
              </SelectContent>
            </Select>
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

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="emotions">Emotions before trade</Label>
            <Input
              id="emotions"
              name="emotions"
              placeholder="Calm, focused, impatient..."
              required
              value={emotions}
              onChange={(event) => setEmotions(event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Trade notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Setup, entry reason, invalidation, management notes..."
              required
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 xl:col-span-5">
        <Card>
          <CardHeader>
            <CardTitle>Pre-Trade Checklist</CardTitle>
            <CardDescription>Live rule check before saving this trade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasRequiredFailures ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive text-sm">
                This trade violates your rules.
              </div>
            ) : null}
            <div className="space-y-2">
              {checklist.items.map((rule) => (
                <div key={rule.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
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
                          ? "mt-0.5 flex size-4 items-center justify-center rounded-full bg-green-600 text-[10px] text-white"
                          : "mt-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground"
                      }
                    >
                      {rule.status === "passed" ? "✓" : "!"}
                    </span>
                  )}
                  <div className="flex-1">
                    <div>{rule.label}</div>
                    <div className="text-muted-foreground text-xs capitalize">
                      {rule.type} · {rule.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-muted-foreground text-sm">Completion: {checklist.completionRate}%</div>
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
              {pending ? "Analyzing..." : "Save trade and analyze"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
