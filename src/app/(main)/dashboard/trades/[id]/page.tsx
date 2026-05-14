import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getPrimaryAnalysis, getTrade } from "@/lib/data/trades";

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = await getTrade(id);

  if (!trade) {
    notFound();
  }

  const analysis = getPrimaryAnalysis(trade);

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-7">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">{trade.pair}</h1>
          <p className="text-muted-foreground text-sm">{new Date(trade.created_at).toLocaleString()}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trade notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Info label="Direction" value={trade.direction} />
            <Info label="Session" value={trade.session} />
            <Info label="Risk" value={`${trade.risk_percent}%`} />
            <Info label="RR" value={`${trade.rr}R`} />
            <Info label="Outcome" value={trade.outcome} />
            <Info label="Confirmation" value={trade.confirmation ? "Yes" : "No"} />
            <div className="space-y-1 md:col-span-2">
              <div className="text-muted-foreground text-sm">Emotions</div>
              <div>{trade.emotions}</div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-muted-foreground text-sm">Notes</div>
              <div className="leading-relaxed">{trade.notes}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Score label="Checklist completion" value={trade.checklist_completion_rate ?? 0} />
            <Score label="Discipline score" value={trade.discipline_score ?? analysis?.discipline_score ?? 0} />
            <ChecklistBlock
              label="Passed items"
              items={(trade.checklist_results ?? []).filter((item) => item.status === "passed")}
            />
            <ChecklistBlock
              label="Failed items"
              items={(trade.checklist_results ?? []).filter((item) => item.status === "failed")}
            />
            <ChecklistBlock
              label="Manual confirmations"
              items={(trade.checklist_results ?? []).filter((item) => item.type === "manual")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Screenshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
              {trade.screenshot_url ? (
                // biome-ignore lint/performance/noImgElement: screenshots can come from user-configured Supabase domains.
                <img
                  src={trade.screenshot_url}
                  alt={`${trade.pair} trade chart`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-muted-foreground text-sm">No screenshot stored for this trade</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 xl:col-span-5">
        <Card>
          <CardHeader>
            <CardTitle>AI analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Score label="Setup quality" value={analysis?.setup_quality_score ?? 0} />
            <Score label="Discipline" value={analysis?.discipline_score ?? 0} />
            <ListBlock label="Strengths" items={analysis?.strengths ?? []} />
            <ListBlock label="Rule violations" items={analysis?.rule_violations ?? []} />
            <ListBlock label="Improvement suggestions" items={analysis?.improvement_suggestions ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="capitalize">{value}</div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-medium text-sm">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <Badge key={item} variant="outline">
              {item}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground text-sm">No items recorded.</span>
        )}
      </div>
    </div>
  );
}

function ChecklistBlock({
  label,
  items,
}: {
  label: string;
  items: { id: string; label: string; status: string; type: string }[];
}) {
  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">{label}</div>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <span>{item.label}</span>
              <Badge variant={item.status === "passed" ? "secondary" : "destructive"}>{item.status}</Badge>
            </div>
          ))
        ) : (
          <span className="text-muted-foreground text-sm">No items recorded.</span>
        )}
      </div>
    </div>
  );
}
