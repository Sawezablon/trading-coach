import { ImageIcon } from "lucide-react";

type PreviewPanelProps = {
  previewUrl: string | null;
};

export function PreviewPanel({ previewUrl }: PreviewPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* biome-ignore lint/nursery/useSortedClasses: keep original className ordering */}
      <div className="text-sm font-medium">Preview</div>
      <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          // biome-ignore lint/performance/noImgElement: preview URL is a local object URL
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
  );
}
