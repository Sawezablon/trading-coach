"use client";

import { useActionState, useState } from "react";

import {
  type DisconnectMt5ConnectionState,
  disconnectMt5ConnectionAction,
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
  connections: Mt5ConnectionStatus[];
  pendingRequests: Mt5PendingSyncRequest[];
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

function getConnectionName(connection: Mt5ConnectionStatus) {
  if (connection.broker && connection.account_number) {
    return `${connection.broker} (${connection.account_number})`;
  }

  if (connection.account_number) {
    return `MT5 Account (${connection.account_number})`;
  }

  return "Pending MT5 account";
}

export function Mt5SyncPanel({ connections, pendingRequests, syncUrl }: Mt5SyncPanelProps) {
  const [state, formAction, pending] = useActionState<GenerateMt5ApiKeyState, FormData>(generateMt5ApiKeyAction, {});
  const [copied, setCopied] = useState<"key" | "url" | null>(null);
  const visibleConnections = state.connection ? [state.connection, ...connections] : connections;
  const apiKey = state.apiKey;

  async function copyValue(value: string, type: "key" | "url") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <Card className="xl:col-span-5">
        <CardHeader>
          <CardTitle>New MT5 connection</CardTitle>
          <CardDescription>
            Generate one key per MT5 account. Qyvex Edge will read the broker and account number from MT5 after sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form action={formAction}>
            <Button type="submit" disabled={pending}>
              {pending ? "Generating..." : "Generate connection key"}
            </Button>
          </form>

          {state.error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
              {state.error}
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="font-medium text-sm">New API key</div>
            <div className="flex gap-2">
              <Input
                value={apiKey ?? "Generate a connection key to reveal it once."}
                readOnly
                type={apiKey ? "text" : "password"}
              />
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
              Store this key safely. Qyvex Edge stores only a hash and cannot show it again.
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

      <Card className="xl:col-span-7">
        <CardHeader>
          <CardTitle>Connected accounts</CardTitle>
          <CardDescription>
            Active synced MT5 accounts. Disconnected accounts are hidden here and in dashboard filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleConnections.length ? (
            visibleConnections.map((connection) => {
              const pendingRequest = pendingRequests.find((request) => request.mt5_connection_id === connection.id);
              return <ConnectionCard key={connection.id} connection={connection} pendingRequest={pendingRequest} />;
            })
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <div className="font-medium">No MT5 accounts connected yet</div>
              <p className="mt-2 text-muted-foreground text-sm">
                Generate a connection key, paste it into the EA, and the account will appear after first sync.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ConnectionCard({
  connection,
  pendingRequest,
}: {
  connection: Mt5ConnectionStatus;
  pendingRequest?: Mt5PendingSyncRequest;
}) {
  const [resyncState, resyncFormAction, resyncPending] = useActionState<RequestMt5HistoryResyncState, FormData>(
    requestMt5HistoryResyncAction,
    {},
  );
  const [disconnectState, disconnectFormAction, disconnectPending] = useActionState<
    DisconnectMt5ConnectionState,
    FormData
  >(disconnectMt5ConnectionAction, {});
  const hasPendingResync = Boolean(pendingRequest ?? (resyncState.ok && resyncState.connectionId === connection.id));

  if (disconnectState.ok && disconnectState.connectionId === connection.id) {
    return null;
  }

  const statusLabel = connection.last_sync_at ? "Synced" : connection.is_active ? "Ready" : "Inactive";
  const accountLabel = connection.account_number ?? "Waiting for first sync";
  const brokerLabel = connection.broker ?? "Broker unknown";

  return (
    <div className="rounded-2xl border bg-secondary/40 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">{getConnectionName(connection)}</div>
            <Badge
              variant="secondary"
              className={connection.is_active ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-muted text-muted-foreground"}
            >
              {statusLabel}
            </Badge>
            {hasPendingResync ? (
              <Badge variant="secondary" className="bg-warning/10 text-warning">
                Resync pending
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-muted-foreground text-sm">
            <span>{brokerLabel}</span>
            <span>/</span>
            <span>{accountLabel}</span>
          </div>
          <div className="text-muted-foreground text-xs">Last sync: {formatDateTime(connection.last_sync_at)}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={resyncFormAction}>
            <input type="hidden" name="connection_id" value={connection.id} />
            <Button type="submit" variant="outline" size="sm" disabled={resyncPending || !connection.is_active}>
              {resyncPending ? "Requesting..." : "Request 365-day resync"}
            </Button>
          </form>
          <form action={disconnectFormAction}>
            <input type="hidden" name="connection_id" value={connection.id} />
            <Button type="submit" variant="outline" size="sm" disabled={disconnectPending || !connection.is_active}>
              {disconnectPending ? "Disconnecting..." : "Disconnect"}
            </Button>
          </form>
        </div>
      </div>

      {resyncState.error && resyncState.connectionId === connection.id ? (
        <p className="mt-3 text-destructive text-xs">{resyncState.error}</p>
      ) : null}
      {disconnectState.error && disconnectState.connectionId === connection.id ? (
        <p className="mt-3 text-destructive text-xs">{disconnectState.error}</p>
      ) : null}
      {disconnectState.ok && disconnectState.connectionId === connection.id ? (
        <p className="mt-3 text-muted-foreground text-xs">Connection marked inactive.</p>
      ) : null}
    </div>
  );
}
