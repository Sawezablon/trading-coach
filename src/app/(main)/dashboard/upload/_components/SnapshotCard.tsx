import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SnapshotCardProps = {
  timeframe: string;
  pattern: string;
  notes: string;
  hasAnalyzed: boolean;
};

export function SnapshotCard({ timeframe, pattern, notes, hasAnalyzed }: SnapshotCardProps) {
  return (
    <Card className="shadow-xs xl:col-span-5">
      <CardHeader>
        <CardTitle className="leading-none">Snapshot</CardTitle>
        <CardDescription>High-level readout and context.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="text-muted-foreground text-xs">Timeframe</div>
            <div className="mt-1 font-medium">{timeframe}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="text-muted-foreground text-xs">Pattern</div>
            <div className="mt-1 font-medium">{pattern}</div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-muted-foreground text-xs">Model note</div>
            <Badge variant="secondary">Demo</Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            {hasAnalyzed ? notes : "Run analysis to populate this section with a quick narrative summary."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
