import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlanCardProps = {
  hasAnalyzed: boolean;
  entry: string;
  stop: string;
  targets: readonly string[];
  risk: string;
};

export function PlanCard({ hasAnalyzed, entry, stop, targets, risk }: PlanCardProps) {
  return (
    <Card className="shadow-xs xl:col-span-3">
      <CardHeader>
        <CardTitle className="leading-none">Sample plan</CardTitle>
        <CardDescription>Risk-first checklist.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="text-muted-foreground text-xs">Entry</div>
            <div className="mt-1 font-medium">{entry}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="text-muted-foreground text-xs">Stop-loss</div>
            <div className="mt-1 font-medium">{stop}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="text-muted-foreground text-xs">Targets</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {targets.map((t) => (
                <Badge key={t} variant={hasAnalyzed ? "default" : "outline"}>
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="text-muted-foreground text-xs">Risk note</div>
            <div className="mt-1">{risk}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
