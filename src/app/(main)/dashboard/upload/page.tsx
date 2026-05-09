"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";

import { LevelsCard } from "./_components/LevelsCard";
import { PlanCard } from "./_components/PlanCard";
import { SnapshotCard } from "./_components/SnapshotCard";
import { UploadCard } from "./_components/UploadCard";

type AnalysisSignal = "Bullish" | "Bearish" | "Neutral";

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"] as const;
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / 1024 ** idx;
  return `${val.toFixed(val >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function signalVariant(signal: AnalysisSignal): React.ComponentProps<typeof Badge>["variant"] {
  // biome-ignore lint/nursery/noUnnecessaryConditions: keep current structure for clarity
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

      <UploadCard
        inputId={inputId}
        fileInputRef={fileInputRef}
        file={file}
        previewUrl={previewUrl}
        analyzing={analyzing}
        onPickClick={onPickClick}
        onAnalyze={onAnalyze}
        onFileChange={onFileChange}
        formatBytes={formatBytes}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          {/* biome-ignore lint/nursery/useSortedClasses: keep original className ordering */}
          <h2 className="font-heading text-lg font-medium leading-none">Analysis results</h2>
          <p className="text-muted-foreground text-sm">Dummy output for now—wire your AI endpoint later.</p>
        </div>
        <Badge variant={hasAnalyzed ? signalVariant(dummy.signal) : "outline"}>
          {hasAnalyzed ? `${dummy.signal} · ${Math.round(dummy.confidence * 100)}%` : "Waiting for analysis"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SnapshotCard
          timeframe={dummy.timeframe}
          pattern={dummy.pattern}
          notes={dummy.notes}
          hasAnalyzed={hasAnalyzed}
        />
        <LevelsCard hasAnalyzed={hasAnalyzed} support={dummy.levels.support} resistance={dummy.levels.resistance} />
        <PlanCard
          hasAnalyzed={hasAnalyzed}
          entry={dummy.plan.entry}
          stop={dummy.plan.stop}
          targets={dummy.plan.targets}
          risk={dummy.plan.risk}
        />
      </div>
    </div>
  );
}
