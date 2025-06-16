
'use client';

import { useMemo } from 'react';
import { LineChart as LineChartIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer, TooltipProps } from "recharts";
import type { Department, MheUnit, StoredInspectionReport } from '@/lib/types';
import { format, parseISO, startOfMonth, getMonth, getYear } from 'date-fns';

interface DepartmentMonthlyTrendChartProps {
  department: Department;
  mheUnits: MheUnit[]; // MHEs already filtered for this department
  reports: StoredInspectionReport[]; // All reports, will be filtered by date range from parent
  isLoading: boolean;
}

const chartConfig = {
  safe: {
    label: "Safe Reports",
    color: "hsl(var(--chart-2))", // Greenish
  },
  unsafe: {
    label: "Unsafe Reports",
    color: "hsl(var(--chart-1))", // Reddish/Orange
  },
} satisfies import("@/components/ui/chart").ChartConfig;

export default function DepartmentMonthlyTrendChart({ department, mheUnits, reports, isLoading }: DepartmentMonthlyTrendChartProps) {

  const monthlyTrendData = useMemo(() => {
    if (isLoading || !reports) return [];

    const departmentMheUnitCodes = new Set(mheUnits.map(mhe => mhe.unit_code));
    const departmentReports = reports.filter(report => departmentMheUnitCodes.has(report.unitId));

    const dataByMonth: Record<string, { month: string; monthNum: number; year: number; safe: number; unsafe: number }> = {};

    departmentReports.forEach(report => {
      try {
        const reportDate = parseISO(report.date);
        const monthKey = format(reportDate, 'yyyy-MM'); // e.g., "2023-01"
        const monthNum = getMonth(reportDate);
        const year = getYear(reportDate);

        if (!dataByMonth[monthKey]) {
          dataByMonth[monthKey] = { month: format(reportDate, 'MMM yyyy'), monthNum, year, safe: 0, unsafe: 0 };
        }

        if (report.status === 'Safe') {
          dataByMonth[monthKey].safe++;
        } else if (report.status === 'Unsafe') {
          dataByMonth[monthKey].unsafe++;
        }
      } catch (e) {
        console.warn("Error processing report for monthly trend:", report, e);
      }
    });
    
    return Object.values(dataByMonth).sort((a,b) => {
        if (a.year === b.year) return a.monthNum - b.monthNum;
        return a.year - b.year;
    });

  }, [department, mheUnits, reports, isLoading]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <LineChartIcon className="mr-2 h-5 w-5 text-primary" />
          Monthly Safety Trend: {department.name}
        </CardTitle>
        <CardDescription>Trend of Safe vs. Unsafe inspection reports per month (based on selected filters).</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <span className="ml-2 text-muted-foreground">Loading data...</span>
            </div>
        ) : monthlyTrendData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData} accessibilityLayer margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    fontSize={12}
                />
                <YAxis allowDecimals={false} fontSize={12} tickMargin={5} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="safe" stroke="var(--color-safe)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="unsafe" stroke="var(--color-unsafe)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
           <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground text-center">No inspection data available for this department in the selected period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
