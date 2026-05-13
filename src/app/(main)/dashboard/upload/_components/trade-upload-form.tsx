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

type TradeResponse = {
  trade?: { id: string };
  error?: string;
};

export function TradeUploadForm() {
  const router = useRouter();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    if (file) {
      formData.set("screenshot", file);
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
            <Input id="pair" name="pair" placeholder="XAUUSD" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction">Direction</Label>
            <Select name="direction" defaultValue="long">
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
            <Input id="risk_percent" name="risk_percent" type="number" step="0.1" min="0" placeholder="1" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rr">RR</Label>
            <Input id="rr" name="rr" type="number" step="0.1" min="0" placeholder="2.5" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session">Session</Label>
            <Select name="session" defaultValue="London">
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
            <Checkbox id="confirmation" name="confirmation" />
            <Label htmlFor="confirmation" className="text-sm">
              Confirmation was present
            </Label>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="emotions">Emotions before trade</Label>
            <Input id="emotions" name="emotions" placeholder="Calm, focused, impatient..." required />
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

      <Card className="xl:col-span-5">
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
    </form>
  );
}
