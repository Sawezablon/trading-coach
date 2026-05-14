"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="pair" tickLine={false} axisLine={false} tickMargin={10} />
        <YAxis hide domain={[0, 100]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="discipline" fill="var(--color-discipline)" radius={[8, 8, 2, 2]} />
      </BarChart>
    </ChartContainer>
  );
}
