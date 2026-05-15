import { Badge } from "@/components/ui/badge";
import type { TradeResult, TradeReviewStatus, TradeStatus } from "@/lib/supabase/types";

export function TradeStatusBadge({ status }: { status: TradeStatus }) {
  return (
    <Badge
      variant="secondary"
      className={
        status === "open" ? "bg-blue-500/10 text-blue-700 dark:text-blue-300" : "bg-muted text-muted-foreground"
      }
    >
      {status === "open" ? "Open" : "Closed"}
    </Badge>
  );
}

export function TradeOutcomeBadge({ outcome }: { outcome: TradeResult }) {
  const className =
    outcome === "win"
      ? "bg-green-600/10 text-green-700 dark:text-green-300"
      : outcome === "loss"
        ? "bg-destructive/10 text-destructive"
        : outcome === "breakeven"
          ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300"
          : "bg-muted text-muted-foreground";

  return (
    <Badge variant="secondary" className={className}>
      {outcome === "breakeven" ? "Breakeven" : outcome.charAt(0).toUpperCase() + outcome.slice(1)}
    </Badge>
  );
}

export function TradeReviewBadge({ status }: { status: TradeReviewStatus }) {
  return (
    <Badge
      variant="secondary"
      className={
        status === "needs_review"
          ? "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]"
          : "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
      }
    >
      {status === "needs_review" ? "Needs Review" : "Reviewed"}
    </Badge>
  );
}
