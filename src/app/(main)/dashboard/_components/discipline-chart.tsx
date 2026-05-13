"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  discipline: {
    label: "Discipline",
    color: "var(--chart-1)",
  },
};

export function DisciplineChart({ data }: { data: { pair: string; discipline: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="pair" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="discipline" fill="var(--color-discipline)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
