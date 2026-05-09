import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LevelsCardProps = {
  hasAnalyzed: boolean;
  support: readonly string[];
  resistance: readonly string[];
};

export function LevelsCard({ hasAnalyzed, support, resistance }: LevelsCardProps) {
  return (
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
              {support.map((x) => (
                <Badge key={x} variant={hasAnalyzed ? "secondary" : "outline"}>
                  {x}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="text-muted-foreground text-xs">Resistance</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {resistance.map((x) => (
                <Badge key={x} variant={hasAnalyzed ? "outline" : "outline"}>
                  {x}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
