import type { Trade } from "@/lib/supabase/types";

function safeTimeZone(timeZone: string | null | undefined) {
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  const candidate = timeZone ?? fallback;

  try {
    Intl.DateTimeFormat("en", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return fallback;
  }
}

export function formatTradeDateTime(value: string, timeZone: string | null | undefined) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: safeTimeZone(timeZone),
  }).format(new Date(value));
}

export function formatTradeDate(value: string, timeZone: string | null | undefined) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: safeTimeZone(timeZone),
  }).format(new Date(value));
}

export function formatTradeTime(value: string, timeZone: string | null | undefined) {
  return new Intl.DateTimeFormat("en", {
    timeStyle: "short",
    timeZone: safeTimeZone(timeZone),
  }).format(new Date(value));
}

export function getTradeTimeZone(trade: Trade) {
  return safeTimeZone(trade.trade_timezone);
}
