
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
import type { StoredDowntimeLog } from '@/lib/types';
import { useMemo } from 'react';

interface DowntimeOverviewChartProps {
  downtimeLogs: StoredDowntimeLog[];
}

const PREDEFINED_CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function DowntimeOverviewChart({ downtimeLogs }: DowntimeOverviewChartProps) {
  const { chartData, chartConfig } = useMemo(() => {
    if (!downtimeLogs || downtimeLogs.length === 0) {
      return { chartData: [], chartConfig: {} };
    }

    const downtimeByUnit: Record<string, number> = {};

    downtimeLogs.forEach(log => {
      if (log.startTime && log.endTime) {
        try {
          const startTime = new Date(log.startTime);
          const endTime = new Date(log.endTime);
          if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime()) && endTime > startTime) {
            const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            downtimeByUnit[log.unitId] = (downtimeByUnit[log.unitId] || 0) + durationHours;
          }
        } catch (e) {
          console.error("Error processing downtime log for chart:", log, e);
        }
      }
    });

    const activeChartData = Object.entries(downtimeByUnit).map(([unit, downtime], index) => ({
      unit,
      downtime: parseFloat(downtime.toFixed(1)), // Keep one decimal place for hours
      fill: PREDEFINED_CHART_COLORS[index % PREDEFINED_CHART_COLORS.length],
    }));

    const activeChartConfig: import("@/components/ui/chart").ChartConfig = {
      downtime: {
        label: "Downtime (hours)",
      },
    };
    activeChartData.forEach(item => {
      activeChartConfig[item.unit] = {
        label: item.unit,
        color: item.fill,
      };
    });

    return { chartData: activeChartData, chartConfig: activeChartConfig };
  }, [downtimeLogs]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChart className="mr-2 h-6 w-6 text-primary" />
          Downtime Overview
        </CardTitle>
        <CardDescription>Total recorded downtime in hours per forklift unit.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RechartsPieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent nameKey="unit" hideLabel />} />
              <Pie data={chartData} dataKey="downtime" nameKey="unit" labelLine={false} label={({ percent, downtime }) => `${downtime}h (${(percent * 100).toFixed(0)}%)`}>
                {chartData.map((entry) => (
                  <Cell key={entry.unit} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="unit"/>} />
            </RechartsPieChart>
          </ChartContainer>
        ) : (
          <p className="text-muted-foreground text-center py-10">No downtime data available to display.</p>
        )}
      </CardContent>
    </Card>
  );
}
