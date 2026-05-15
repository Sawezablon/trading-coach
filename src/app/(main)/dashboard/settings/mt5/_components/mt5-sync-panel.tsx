"use client";

import { useActionState, useMemo, useState } from "react";

import {
  type GenerateMt5ApiKeyState,
  generateMt5ApiKeyAction,
  type RequestMt5HistoryResyncState,
  requestMt5HistoryResyncAction,
} from "@/app/(main)/dashboard/settings/mt5/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Mt5ConnectionStatus, Mt5PendingSyncRequest } from "@/lib/data/mt5";

type Mt5SyncPanelProps = {
  connection: Mt5ConnectionStatus | null;
  pendingRequest: Mt5PendingSyncRequest | null;
  syncUrl: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function Mt5SyncPanel({ connection, pendingRequest, syncUrl }: Mt5SyncPanelProps) {
  const [state, formAction, pending] = useActionState<GenerateMt5ApiKeyState, FormData>(generateMt5ApiKeyAction, {});
  const [resyncState, resyncFormAction, resyncPending] = useActionState<RequestMt5HistoryResyncState, FormData>(
    requestMt5HistoryResyncAction,
    {},
  );
  const [copied, setCopied] = useState<"key" | "url" | null>(null);
  const activeConnection = state.connection ?? connection;
  const apiKey = state.apiKey;
  const hasConnection = Boolean(activeConnection);
  const statusLabel = activeConnection?.last_sync_at
    ? "Synced"
    : activeConnection?.is_active
      ? "Ready"
      : "Not connected";
  const hasPendingResync = Boolean(pendingRequest ?? resyncState.ok);

  const maskedKey = useMemo(() => {
    if (apiKey) {
      return apiKey;
    }

    return hasConnection ? "API key generated. Rotate to reveal a new key." : "No API key generated yet.";
  }, [apiKey, hasConnection]);

  async function copyValue(value: string, type: "key" | "url") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <Card className="xl:col-span-7">
        <CardHeader>
          <CardTitle>Connection key</CardTitle>
          <CardDescription>
            Generate an API key for the future MT5 Expert Advisor. The plain key is shown once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form action={formAction}>
            <Button type="submit" disabled={pending}>
              {pending ? "Generating..." : hasConnection ? "Rotate API key" : "Generate API key"}
            </Button>
          </form>

          {state.error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
              {state.error}
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="font-medium text-sm">API key</div>
            <div className="flex gap-2">
              <Input value={maskedKey} readOnly type={apiKey ? "text" : "password"} />
              <Button
                type="button"
                variant="outline"
                disabled={!apiKey}
                onClick={() => apiKey && copyValue(apiKey, "key")}
              >
                {copied === "key" ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Store this somewhere safe. Qyvex Edge stores only a hash and cannot show the same key again.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-medium text-sm">Sync URL</div>
            <div className="flex gap-2">
              <Input value={syncUrl} readOnly />
              <Button type="button" variant="outline" onClick={() => copyValue(syncUrl, "url")}>
                {copied === "url" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-5">
        <CardHeader>
          <CardTitle>Connection status</CardTitle>
          <CardDescription>Use this panel to confirm whether MT5 has synced into Qyvex Edge.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border bg-secondary/50 p-4">
            <span className="text-muted-foreground text-sm">Status</span>
            <Badge
              variant="secondary"
              className={
                activeConnection?.is_active ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-muted text-muted-foreground"
              }
            >
              {statusLabel}
            </Badge>
          </div>
          <StatusRow label="Last sync" value={formatDateTime(activeConnection?.last_sync_at)} />
          <StatusRow label="Account" value={activeConnection?.account_number ?? "Waiting for first MT5 sync"} />
          <StatusRow label="Broker" value={activeConnection?.broker ?? "Waiting for first MT5 sync"} />
          <div className="rounded-2xl border bg-secondary/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-sm">History resync</div>
                <p className="mt-1 text-muted-foreground text-xs">
                  Request this if you deleted MT5-imported trades and want the EA to resend history once.
                </p>
              </div>
              <Badge variant="secondary" className={hasPendingResync ? "bg-warning/10 text-warning" : ""}>
                {hasPendingResync ? "Pending" : "Idle"}
              </Badge>
            </div>
            <form action={resyncFormAction} className="mt-4">
              <Button type="submit" variant="outline" disabled={resyncPending || !hasConnection}>
                {resyncPending ? "Requesting..." : "Request 365-day resync"}
              </Button>
            </form>
            {resyncState.error ? <p className="mt-3 text-destructive text-xs">{resyncState.error}</p> : null}
            {hasPendingResync ? (
              <p className="mt-3 text-muted-foreground text-xs">
                The EA will pick this up on its next sync and mark it complete after sending history.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border bg-secondary/40 p-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right font-medium text-sm">{value}</span>
    </div>
  );
}
