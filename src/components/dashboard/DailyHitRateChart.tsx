'use client';

import { BarChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart } from "recharts"

const chartData = [
  { date: "Mon", inspections: 12 },
  { date: "Tue", inspections: 15 },
  { date: "Wed", inspections: 10 },
  { date: "Thu", inspections: 18 },
  { date: "Fri", inspections: 13 },
  { date: "Sat", inspections: 9 },
  { date: "Sun", inspections: 7 },
];

const chartConfig = {
  inspections: {
    label: "Inspections",
    color: "hsl(var(--primary))",
  },
} satisfies import("@/components/ui/chart").ChartConfig;


export default function DailyHitRateChart() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart className="mr-2 h-6 w-6 text-primary" />
          Daily Inspection Hit Rate
        </CardTitle>
        <CardDescription>Number of inspections completed per day this week.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <RechartsBarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="inspections" fill="var(--color-inspections)" radius={4} />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
