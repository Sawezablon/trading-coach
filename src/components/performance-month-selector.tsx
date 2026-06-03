"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type PerformanceMonthSelectorProps = {
  selectedMonthKey: string;
};

function getMonthFromKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Date(year, month - 1, 1);
}

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getDashboardMonthHref(date: Date) {
  return `/dashboard?month=${getMonthKey(date)}`;
}

function isAfterCurrentMonth(date: Date) {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return date.getTime() > currentMonth.getTime();
}

function getMonthOptions(count = 36) {
  const currentMonth = getMonthFromKey(getMonthKey());

  return Array.from({ length: count }, (_, index) => {
    const date = addMonths(currentMonth, -index);

    return {
      key: getMonthKey(date),
      label: getMonthLabel(date),
    };
  });
}

export function PerformanceMonthSelector({ selectedMonthKey }: PerformanceMonthSelectorProps) {
  const router = useRouter();
  const selectedMonth = getMonthFromKey(selectedMonthKey);
  const previousMonth = addMonths(selectedMonth, -1);
  const nextMonth = addMonths(selectedMonth, 1);
  const currentMonthKey = getMonthKey();
  const canGoNext = !isAfterCurrentMonth(nextMonth);
  const isCurrentMonth = selectedMonthKey === currentMonthKey;
  const monthOptions = getMonthOptions();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline" className="h-8 w-8 rounded-full p-0">
        <Link href={getDashboardMonthHref(previousMonth)} aria-label={`View ${getMonthLabel(previousMonth)}`}>
          {"<"}
        </Link>
      </Button>
      <select
        aria-label="Select performance month"
        className="h-8 cursor-pointer rounded-full border bg-secondary/60 px-3 font-medium text-sm outline-none transition-colors hover:border-primary/50 hover:bg-primary/10 focus:border-primary"
        onChange={(event) => {
          const month = event.currentTarget.value;

          router.push(month === currentMonthKey ? "/dashboard" : `/dashboard?month=${month}`);
        }}
        value={selectedMonthKey}
      >
        {monthOptions.map((month) => (
          <option key={month.key} value={month.key}>
            {month.label}
          </option>
        ))}
      </select>
      {canGoNext ? (
        <Button asChild size="sm" variant="outline" className="h-8 w-8 rounded-full p-0">
          <Link href={getDashboardMonthHref(nextMonth)} aria-label={`View ${getMonthLabel(nextMonth)}`}>
            {">"}
          </Link>
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="h-8 w-8 rounded-full p-0" disabled>
          {">"}
        </Button>
      )}
      {!isCurrentMonth ? (
        <Button asChild size="sm" variant="ghost" className="h-8 rounded-full px-3">
          <Link href="/dashboard">Current</Link>
        </Button>
      ) : null}
    </div>
  );
}
