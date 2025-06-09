'use client';

import { PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Pie, ResponsiveContainer, PieChart as RechartsPieChart, Cell } from "recharts"


const chartData = [
  { unit: "Forklift A", downtime: 4, fill: "var(--color-unitA)" },
  { unit: "Forklift B", downtime: 2, fill: "var(--color-unitB)" },
  { unit: "Forklift C", downtime: 7, fill: "var(--color-unitC)" },
  { unit: "Forklift D", downtime: 1, fill: "var(--color-unitD)" },
];

const chartConfig = {
  downtime: {
    label: "Downtime (hours)",
  },
  unitA: {
    label: "Forklift A",
    color: "hsl(var(--chart-1))",
  },
  unitB: {
    label: "Forklift B",
    color: "hsl(var(--chart-2))",
  },
  unitC: {
    label: "Forklift C",
    color: "hsl(var(--chart-3))",
  },
  unitD: {
    label: "Forklift D",
    color: "hsl(var(--chart-4))",
  },
} satisfies import("@/components/ui/chart").ChartConfig


export default function DowntimeOverviewChart() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChart className="mr-2 h-6 w-6 text-primary" />
          Downtime Overview
        </CardTitle>
        <CardDescription>Total downtime in hours per forklift unit this month.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <RechartsPieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent nameKey="unit" hideLabel />} />
            <Pie data={chartData} dataKey="downtime" nameKey="unit" labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
              {chartData.map((entry) => (
                <Cell key={entry.unit} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="unit"/>} />
          </RechartsPieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
