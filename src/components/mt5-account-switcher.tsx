"use client";

import { switchActiveMt5AccountAction } from "@/app/(main)/dashboard/account-actions";
import type { Mt5ConnectionStatus } from "@/lib/data/mt5";
import { getMt5ConnectionLabel } from "@/lib/mt5-label";

type Mt5AccountSwitcherProps = {
  connections: Mt5ConnectionStatus[];
  selectedConnectionId: string | null;
};

export function Mt5AccountSwitcher({ connections, selectedConnectionId }: Mt5AccountSwitcherProps) {
  if (!connections.length || !selectedConnectionId) {
    return null;
  }

  return (
    <form action={switchActiveMt5AccountAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor="mt5-account-context" className="text-muted-foreground text-sm">
        Active account
      </label>
      <select
        id="mt5-account-context"
        name="mt5_connection_id"
        value={selectedConnectionId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-10 rounded-full border border-border/80 bg-secondary px-4 font-medium text-sm outline-none transition-colors hover:border-primary/40 focus:border-primary"
      >
        {connections.map((connection) => (
          <option key={connection.id} value={connection.id}>
            {getMt5ConnectionLabel(connection)}
          </option>
        ))}
      </select>
    </form>
  );
}
