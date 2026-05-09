import type React from "react";

import { Loader2, Sparkles, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { PreviewPanel } from "./PreviewPanel";

type UploadCardProps = {
  inputId: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  file: File | null;
  previewUrl: string | null;
  analyzing: boolean;
  onPickClick: () => void;
  onAnalyze: () => void;
  onFileChange: (file: File | null) => void;
  formatBytes: (bytes: number) => string;
};

export function UploadCard({
  inputId,
  fileInputRef,
  file,
  previewUrl,
  analyzing,
  onPickClick,
  onAnalyze,
  onFileChange,
  formatBytes,
}: UploadCardProps) {
  return (
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
                {/* biome-ignore lint/nursery/useSortedClasses: keep original className ordering */}
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

          <PreviewPanel previewUrl={previewUrl} />
        </div>
      </CardContent>
    </Card>
  );
}
