import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_CONFIG } from "@/config/app-config";
import { getMt5Connections, getPendingMt5SyncRequests } from "@/lib/data/mt5";
import { env } from "@/lib/env";

import { Mt5SyncPanel } from "./_components/mt5-sync-panel";

export const dynamic = "force-dynamic";

function getSyncDomain(syncUrl: string) {
  try {
    return new URL(syncUrl).origin;
  } catch {
    return "https://sync.qyvexedge.com";
  }
}

const setupSteps = [
  "Download QyvexEdgeSyncEA.mq5",
  "Open MT5",
  "Go to File -> Open Data Folder",
  "Open MQL5 -> Experts",
  "Paste the EA file there",
  "Open MetaEditor and compile the EA",
  "Restart MT5",
  "In Navigator, right-click Expert Advisors and refresh",
  "Go to Tools -> Options -> Expert Advisors",
  "Enable Allow WebRequest for listed URL",
  "Add the Qyvex sync URL domain",
  "Attach EA to any chart",
  "Paste API key",
  "Confirm sync status in Qyvex",
];

export default async function Mt5SyncSettingsPage() {
  noStore();

  const connections = await getMt5Connections();
  const pendingRequests = await getPendingMt5SyncRequests();
  const syncUrl = env.mt5SyncUrl;
  const syncDomain = getSyncDomain(syncUrl);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">Settings</div>
          <h1 className="font-semibold text-4xl tracking-tight">MT5 Sync</h1>
          <p className="max-w-2xl text-muted-foreground text-sm">
            Connect the read-only MetaTrader 5 Expert Advisor to import your trade history into {APP_CONFIG.name}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/settings">Trading rules</Link>
        </Button>
      </div>

      <Mt5SyncPanel connections={connections} pendingRequests={pendingRequests} syncUrl={syncUrl} />

      <Card className="border-[#5EEAD4]/20 bg-[#5EEAD4]/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#5EEAD4]/15 font-semibold text-[#5EEAD4] text-xs">
            i
          </span>
          <div className="space-y-1">
            <div className="font-medium">Read-only safety notice</div>
            <p className="text-muted-foreground text-sm">
              Qyvex Edge does not place trades, modify trades, or close trades. It only reads trade history.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>MT5 setup checklist</CardTitle>
            <CardDescription>
              Install the read-only Expert Advisor and allow MT5 to send sync requests to your Qyvex domain.
            </CardDescription>
          </div>
          <Button asChild>
            <a href="/downloads/QyvexEdgeSyncEA.mq5" download>
              Download EA
            </a>
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border border-warning/25 bg-warning/10 p-4">
            <div className="flex gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-warning/15 font-semibold text-warning text-xs">
                !
              </span>
              <div>
                <div className="font-medium text-sm">WebRequest allow-list domain</div>
                <p className="mt-1 text-muted-foreground text-sm">
                  In MT5, add this exact domain under Allow WebRequest for listed URL:
                </p>
                <code className="mt-3 block rounded-xl border bg-background/70 px-3 py-2 text-sm">{syncDomain}</code>
              </div>
            </div>
          </div>

          <ol className="grid gap-3 md:grid-cols-2">
            {setupSteps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-2xl border bg-secondary/40 p-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-card font-medium text-muted-foreground text-xs">
                  {index + 1}
                </span>
                <span className="pt-1 text-sm">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
