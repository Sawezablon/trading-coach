"use client";

import { useRouter } from "next/navigation";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function DeleteTradeButton({ tradeId, compact = false }: { tradeId: string; compact?: boolean }) {
  const router = useRouter();

  async function deleteTrade() {
    const confirmed = window.confirm("Are you sure you want to delete this trade? This cannot be undone.");

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/trades/${tradeId}`, { method: "DELETE" });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(payload.error ?? "Trade could not be deleted.");
      return;
    }

    toast.success("Trade deleted.");
    router.push("/dashboard/journal");
    router.refresh();
  }

  return (
    <Button type="button" variant="destructive" size={compact ? "sm" : "default"} onClick={deleteTrade}>
      <Trash2 />
      {compact ? "Delete" : "Delete trade"}
    </Button>
  );
}
