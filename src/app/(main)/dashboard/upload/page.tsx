"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ImageIcon, Loader2, Sparkles, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AnalysisSignal = "Bullish" | "Bearish" | "Neutral";

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"] as const;
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / 1024 ** idx;
  return `${val.toFixed(val >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function signalVariant(signal: AnalysisSignal): React.ComponentProps<typeof Badge>["variant"] {
  switch (signal) {
    case "Bullish":
      return "default";
    case "Bearish":
      return "destructive";
    case "Neutral":
      return "secondary";
  }
}

export default function Page() {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const dummy = useMemo(() => {
    const signal: AnalysisSignal = "Bullish";
    return {
      signal,
      confidence: 0.74,
      timeframe: "15m–1h",
      pattern: "Ascending triangle",
      notes:
        "Momentum is improving with higher lows into a compression zone. Wait for confirmation (break + retest) and avoid entries into major resistance.",
      levels: {
        support: ["1.0720", "1.0685"],
        resistance: ["1.0788", "1.0830"],
      },
      plan: {
        entry: "Break & retest above 1.0788",
        stop: "Below 1.0720",
        targets: ["1.0830", "1.0895"],
        risk: "1R max, reduce size if spread widens",
      },
    } as const;
  }, []);

  const onPickClick = () => fileInputRef.current?.click();

  const onFileChange = (f: File | null) => {
    setHasAnalyzed(false);
    setFile(f);
  };

  const onAnalyze = () => {
    if (!file || analyzing) return;
    setAnalyzing(true);
    setHasAnalyzed(false);

    window.setTimeout(() => {
      setAnalyzing(false);
      setHasAnalyzed(true);
    }, 900);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Upload chart screenshot</h1>
        <p className="text-muted-foreground text-sm">
          Drop in a trading view screenshot and get a quick, structured readout: trend, levels, and a sample plan.
        </p>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="leading-none">Image upload</CardTitle>
          <CardDescription>PNG, JPG, or WEBP. Preview stays local in your browser.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <input
                id={inputId}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onFileChange(e.currentTarget.files?.[0] ?? null)}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={onPickClick}>
                  <Upload />
                  Choose image
                </Button>
                <Button onClick={onAnalyze} disabled={!file || analyzing}>
                  {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {analyzing ? "Analyzing…" : "Analyze"}
                </Button>

                {file ? (
                  <div className="ml-auto flex items-center gap-2 text-muted-foreground text-xs">
                    <span className="truncate">{file.name}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{formatBytes(file.size)}</span>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">Tips</div>
                  <Badge variant="outline">Best results</Badge>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground text-xs">
                  <li>Include the timeframe and most recent candles.</li>
                  <li>Keep annotations minimal so levels are readable.</li>
                  <li>Use a clean crop (avoid side panels if possible).</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium">Preview</div>
              <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Uploaded chart preview" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 border border-border border-dashed bg-muted/20 p-6 text-center text-muted-foreground">
                    <ImageIcon className="size-5" />
                    <div className="text-sm">No image selected</div>
                    <div className="text-xs">Choose a file to see a preview here.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="font-heading text-lg font-medium leading-none">Analysis results</h2>
          <p className="text-muted-foreground text-sm">Dummy output for now—wire your AI endpoint later.</p>
        </div>
        <Badge variant={hasAnalyzed ? signalVariant(dummy.signal) : "outline"}>
          {hasAnalyzed ? `${dummy.signal} · ${Math.round(dummy.confidence * 100)}%` : "Waiting for analysis"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="shadow-xs xl:col-span-5">
          <CardHeader>
            <CardTitle className="leading-none">Snapshot</CardTitle>
            <CardDescription>High-level readout and context.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-muted-foreground text-xs">Timeframe</div>
                <div className="mt-1 font-medium">{dummy.timeframe}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-muted-foreground text-xs">Pattern</div>
                <div className="mt-1 font-medium">{dummy.pattern}</div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-muted-foreground text-xs">Model note</div>
                <Badge variant="secondary">Demo</Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed">
                {hasAnalyzed ? dummy.notes : "Run analysis to populate this section with a quick narrative summary."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs xl:col-span-4">
          <CardHeader>
            <CardTitle className="leading-none">Key levels</CardTitle>
            <CardDescription>Support and resistance zones.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-muted-foreground text-xs">Support</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dummy.levels.support.map((x) => (
                    <Badge key={x} variant={hasAnalyzed ? "secondary" : "outline"}>
                      {x}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-muted-foreground text-xs">Resistance</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dummy.levels.resistance.map((x) => (
                    <Badge key={x} variant={hasAnalyzed ? "outline" : "outline"}>
                      {x}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs xl:col-span-3">
          <CardHeader>
            <CardTitle className="leading-none">Sample plan</CardTitle>
            <CardDescription>Risk-first checklist.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-muted-foreground text-xs">Entry</div>
                <div className="mt-1 font-medium">{dummy.plan.entry}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-muted-foreground text-xs">Stop-loss</div>
                <div className="mt-1 font-medium">{dummy.plan.stop}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-muted-foreground text-xs">Targets</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dummy.plan.targets.map((t) => (
                    <Badge key={t} variant={hasAnalyzed ? "default" : "outline"}>
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-muted-foreground text-xs">Risk note</div>
                <div className="mt-1">{dummy.plan.risk}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
