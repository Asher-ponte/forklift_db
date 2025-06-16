
'use client';

import { PieChart, Loader2 } from 'lucide-react';
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
  isLoading: boolean;
}

const PREDEFINED_CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--accent))",
];

export default function DowntimeOverviewChart({ downtimeLogs, isLoading }: DowntimeOverviewChartProps) {
  const { chartData, chartConfig } = useMemo(() => {
    if (!downtimeLogs) {
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

    const activeChartData = Object.entries(downtimeByUnit)
      .map(([unit, downtime], index) => ({
        unit,
        downtime: parseFloat(downtime.toFixed(1)), 
        fill: PREDEFINED_CHART_COLORS[index % PREDEFINED_CHART_COLORS.length],
      }))
      .sort((a,b) => b.downtime - a.downtime); // Sort by most downtime

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
        <CardDescription>Total recorded downtime in hours per forklift unit (based on selected filters).</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]"> {/* Ensure consistent height */}
        {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading data...</span>
            </div>
        ) : chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <RechartsPieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent nameKey="unit" hideLabel />} />
              <Pie 
                data={chartData} 
                dataKey="downtime" 
                nameKey="unit" 
                labelLine={false} 
                label={({ percent, downtime, unit }) => `${unit}: ${downtime}h (${(percent * 100).toFixed(0)}%)`}
                outerRadius="70%"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.unit} fill={entry.fill} name={entry.unit} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="unit"/>} wrapperStyle={{fontSize: '0.75rem'}} />
            </RechartsPieChart>
          </ChartContainer>
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground text-center py-10">No downtime data available for the selected period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
