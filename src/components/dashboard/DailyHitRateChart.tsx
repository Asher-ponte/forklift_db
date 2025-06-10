
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
import type { StoredInspectionReport } from '@/lib/types';
import { useMemo } from 'react';
import { format, subDays, parseISO } from 'date-fns';


interface DailyHitRateChartProps {
  reports: StoredInspectionReport[];
}

const chartConfig = {
  inspections: {
    label: "Inspections",
    color: "hsl(var(--primary))",
  },
} satisfies import("@/components/ui/chart").ChartConfig;


export default function DailyHitRateChart({ reports }: DailyHitRateChartProps) {

  const chartData = useMemo(() => {
    const last7Days: { date: string, inspections: number }[] = [];
    const countsByDate: Record<string, number> = {};

    reports.forEach(report => {
      const reportDateStr = report.date.split('T')[0]; // YYYY-MM-DD
      countsByDate[reportDateStr] = (countsByDate[reportDateStr] || 0) + 1;
    });
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateString = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'E'); // Mon, Tue, etc.
      last7Days.push({
        date: dayName,
        inspections: countsByDate[dateString] || 0,
      });
    }
    return last7Days;
  }, [reports]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart className="mr-2 h-6 w-6 text-primary" />
          Daily Inspection Rate
        </CardTitle>
        <CardDescription>Number of inspections completed per day (last 7 days).</CardDescription>
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
            />
            <YAxis allowDecimals={false}/>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="inspections" fill="var(--color-inspections)" radius={4} />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
