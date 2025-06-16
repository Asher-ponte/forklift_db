
'use client';

import { useMemo } from 'react';
import { BarChart3, Loader2, AlertCircle, SearchX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import type { Department, MheUnit, StoredInspectionReport } from '@/lib/types';
import { parseISO, isWithinInterval, format, startOfDay, endOfDay } from 'date-fns';

interface UninspectedMHEsChartProps {
  departments: Department[];
  mheUnits: MheUnit[];
  reports: StoredInspectionReport[];
  filterStartDate: string | null;
  filterEndDate: string | null;
  isLoading: boolean;
}

const chartConfig = {
  uninspected: {
    label: "Uninspected MHEs",
    color: "hsl(var(--chart-3))",
  },
} satisfies import("@/components/ui/chart").ChartConfig;

type ChartStatus = 'loading' | 'idle' | 'validData' | 'noDataInFilter' | 'noDataToday' | 'invalidFilter' | 'incompleteFilter';

export default function UninspectedMHEsChart({ departments, mheUnits, reports, filterStartDate, filterEndDate, isLoading }: UninspectedMHEsChartProps) {

  const { data, status, periodDescription } = useMemo(() => {
    if (isLoading) return { data: [], status: 'loading' as ChartStatus, periodDescription: null };
    if (!departments.length || !mheUnits.length) return { data: [], status: 'idle' as ChartStatus, periodDescription: null };

    let dateInterval: Interval | null = null;
    let currentStatus: ChartStatus = 'idle';
    let description: string | null = null;

    if (filterStartDate && filterEndDate) {
      try {
        const start = parseISO(filterStartDate);
        const end = parseISO(filterEndDate);
        const inclusiveEnd = new Date(end);
        inclusiveEnd.setHours(23, 59, 59, 999);
        if (start <= inclusiveEnd) {
          dateInterval = { start, end: inclusiveEnd };
          description = `from ${format(start, 'P')} to ${format(end, 'P')}`;
          currentStatus = 'validData'; // Initial status if filter is valid
        } else {
          currentStatus = 'invalidFilter';
          description = "Error: Start date is after end date.";
        }
      } catch (e) {
        currentStatus = 'invalidFilter';
        description = "Error: Invalid date format in filter.";
        console.warn("Invalid date for filtering uninspected MHEs:", e);
      }
    } else if (!filterStartDate && !filterEndDate) {
      // Default to current date
      dateInterval = { start: startOfDay(new Date()), end: endOfDay(new Date()) };
      description = "for today";
      currentStatus = 'validData'; // Initial status for today's data
    } else {
      // Only one filter date is provided
      currentStatus = 'incompleteFilter';
      description = "Error: Please provide both start and end dates for the filter.";
    }
    
    if (currentStatus === 'invalidFilter' || currentStatus === 'incompleteFilter' || !dateInterval) {
         return { data: [], status: currentStatus, periodDescription: description };
    }

    const activeMheUnits = mheUnits.filter(mhe => mhe.status !== 'inactive');
    const inspectedMheUnitCodesInPeriod = new Set<string>();

    reports.forEach(report => {
      try {
        const reportDate = parseISO(report.date);
        if (dateInterval && isWithinInterval(reportDate, dateInterval)) {
          inspectedMheUnitCodesInPeriod.add(report.unitId);
        }
      } catch (e) { /* ignore parse errors for individual reports */ }
    });

    const uninspectedCountsByDept = departments.map(dept => {
      const mhesInDept = activeMheUnits.filter(mhe => mhe.department_id === dept.id);
      let uninspectedCount = 0;
      
      mhesInDept.forEach(mhe => {
        if (!inspectedMheUnitCodesInPeriod.has(mhe.unit_code)) {
          uninspectedCount++;
        }
      });

      return {
        department: dept.name.substring(0, 15) + (dept.name.length > 15 ? '...' : ''),
        uninspected: uninspectedCount,
      };
    }).filter(d => d.uninspected > 0);

    if (uninspectedCountsByDept.length === 0) {
        currentStatus = (filterStartDate && filterEndDate) ? 'noDataInFilter' : 'noDataToday';
    }

    return { data: uninspectedCountsByDept, status: currentStatus, periodDescription: description };

  }, [departments, mheUnits, reports, filterStartDate, filterEndDate, isLoading]);

  const getCardDescription = () => {
    switch (status) {
      case 'loading':
        return "Loading data...";
      case 'validData':
      case 'noDataInFilter':
      case 'noDataToday':
        return `Number of active MHE units with no inspection records ${periodDescription || ''}, by department.`;
      case 'invalidFilter':
      case 'incompleteFilter':
        return periodDescription || "Please check your date filter settings.";
      default:
        return "Configure departments and MHE units in Data Management.";
    }
  };
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="mr-2 h-6 w-6 text-primary" />
          MHEs Without Inspection
        </CardTitle>
        <CardDescription>{getCardDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        {status === 'loading' ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading data...</span>
          </div>
        ) : status === 'invalidFilter' || status === 'incompleteFilter' ? (
          <div className="flex flex-col justify-center items-center h-full text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-2" />
            <p className="text-destructive">{periodDescription}</p>
          </div>
        ) : status === 'noDataInFilter' ? (
            <div className="flex flex-col justify-center items-center h-full text-center">
                <SearchX className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">All active MHEs appear to have been inspected in the selected period, or no MHEs match criteria.</p>
            </div>
        ) : status === 'noDataToday' ? (
            <div className="flex flex-col justify-center items-center h-full text-center">
                <SearchX className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">All active MHEs appear to have been inspected today, or no MHEs match criteria.</p>
            </div>
        ) : data.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" accessibilityLayer margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis 
                  dataKey="department" 
                  type="category" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={5}
                  fontSize={10}
                  width={80}
                />
                <ChartTooltip
                  cursor={{fill: 'hsl(var(--muted))'}}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="uninspected" fill="var(--color-uninspected)" radius={4} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
           <div className="flex flex-col justify-center items-center h-full text-center">
             <SearchX className="h-10 w-10 text-muted-foreground mb-2" />
             <p className="text-muted-foreground">No uninspected MHEs found for {periodDescription || 'the current criteria'}.</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
