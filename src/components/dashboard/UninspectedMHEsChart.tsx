
'use client';

import { useMemo } from 'react';
import { BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import type { Department, MheUnit, StoredInspectionReport } from '@/lib/types';
import { parseISO, isWithinInterval } from 'date-fns';

interface UninspectedMHEsChartProps {
  departments: Department[];
  mheUnits: MheUnit[];
  reports: StoredInspectionReport[]; // All reports
  filterStartDate: string | null;
  filterEndDate: string | null;
  isLoading: boolean;
}

const chartConfig = {
  uninspected: {
    label: "Uninspected MHEs",
    color: "hsl(var(--chart-3))", // Yellowish/Orange
  },
} satisfies import("@/components/ui/chart").ChartConfig;

export default function UninspectedMHEsChart({ departments, mheUnits, reports, filterStartDate, filterEndDate, isLoading }: UninspectedMHEsChartProps) {

  const uninspectedData = useMemo(() => {
    if (isLoading || !departments.length || !mheUnits.length) return [];

    const activeMheUnits = mheUnits.filter(mhe => mhe.status !== 'inactive');
    let dateInterval: Interval | null = null;

    if (filterStartDate && filterEndDate) {
      try {
        const start = parseISO(filterStartDate);
        const end = parseISO(filterEndDate);
        // Ensure end date is inclusive of the whole day
        const inclusiveEnd = new Date(end);
        inclusiveEnd.setHours(23, 59, 59, 999);
        if (start <= inclusiveEnd) {
          dateInterval = { start, end: inclusiveEnd };
        }
      } catch (e) {
        console.warn("Invalid date for filtering uninspected MHEs:", e);
      }
    }
    
    const inspectedMheUnitCodesInPeriod = new Set<string>();
    if (dateInterval) {
        reports.forEach(report => {
            try {
                const reportDate = parseISO(report.date);
                if (isWithinInterval(reportDate, dateInterval!)) {
                    inspectedMheUnitCodesInPeriod.add(report.unitId);
                }
            } catch (e) { /* ignore parse errors for individual reports */ }
        });
    } else { 
      // If no valid date range, consider all MHEs as "uninspected" for the purpose of this chart if it means "no filter applied"
      // Or, if no date range means "show nothing", then return []
      // For now, let's assume if no valid date range, chart shows nothing or a message.
      // To show "all uninspected if no range", one would need to define what "uninspected" means without a time bound (e.g. never inspected).
      // The prompt implies "MHEs that do not have inspection *within the filtered period*"
      if (!filterStartDate && !filterEndDate) { // If no filters are set at all, maybe show all MHEs that *never* had an inspection
          // This part is ambiguous, for now, if no specific range, assume "no data to show based on specific filter".
          // Alternative: if no filter, consider all reports.
          // For simplicity, if no specific dateInterval is active, this chart will show 0 or require a filter.
           reports.forEach(report => inspectedMheUnitCodesInPeriod.add(report.unitId)); // This counts MHEs with *any* inspection if no filter.
      } else if (!dateInterval) { // If dates are invalid or start > end
          return []; // No valid interval
      }
    }


    const dataByDepartment = departments.map(dept => {
      const mhesInDept = activeMheUnits.filter(mhe => mhe.department_id === dept.id);
      let uninspectedCount = 0;
      
      if (dateInterval || (!filterStartDate && !filterEndDate)) { // Proceed if valid interval or no filters at all
          mhesInDept.forEach(mhe => {
            if (!inspectedMheUnitCodesInPeriod.has(mhe.unit_code)) {
              uninspectedCount++;
            }
          });
      }

      return {
        department: dept.name.substring(0,15) + (dept.name.length > 15 ? '...' : ''), // Shorten name for X-axis
        uninspected: uninspectedCount,
      };
    }).filter(d => d.uninspected > 0); // Only show departments with uninspected MHEs

    return dataByDepartment;

  }, [departments, mheUnits, reports, filterStartDate, filterEndDate, isLoading]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="mr-2 h-6 w-6 text-primary" />
          MHEs Without Inspection
        </CardTitle>
        <CardDescription>Number of active MHE units with no inspection records in the selected period, by department.</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading data...</span>
            </div>
        ) : (!filterStartDate || !filterEndDate) && uninspectedData.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Please select a date range using the filter above to see uninspected MHEs.</p>
            </div>
        ) : uninspectedData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uninspectedData} layout="vertical" accessibilityLayer margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis 
                    dataKey="department" 
                    type="category" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={5}
                    fontSize={10}
                    width={80} // Adjust width for Y-axis labels
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
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground text-center">All active MHEs have been inspected in the selected period, or no MHEs match criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
