
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { Building, Loader2 } from 'lucide-react';
import type { Department, MheUnit, StoredInspectionReport } from '@/lib/types';

interface DepartmentSafetyDonutProps {
  department: Department;
  mheUnitsInDept: MheUnit[]; // MHEs already filtered for this department and active
  reports: StoredInspectionReport[]; // All reports, component will filter for today and this dept
  isLoading: boolean;
}

const chartColors = {
  safe: "hsl(var(--chart-2))", // Greenish
  unsafe: "hsl(var(--chart-1))", // Reddish/Orange
  notInspected: "hsl(50, 90%, 60%)", // Yellow
};

const chartConfig = {
  safe: { label: "Safe Today", color: chartColors.safe },
  unsafe: { label: "Unsafe Today", color: chartColors.unsafe },
  notInspected: { label: "Not Inspected Today", color: chartColors.notInspected },
} satisfies import("@/components/ui/chart").ChartConfig;


export default function DepartmentSafetyDonut({ department, mheUnitsInDept, reports, isLoading }: DepartmentSafetyDonutProps) {
  const donutData = useMemo(() => {
    if (!mheUnitsInDept) return { data: [], totalMHEs: 0 };

    const today = new Date().toISOString().split('T')[0];
    let safeTodayCount = 0;
    let unsafeTodayCount = 0;
    const inspectedTodayMheCodes = new Set<string>();

    mheUnitsInDept.forEach(mhe => {
      const mheReportsToday = reports
        .filter(r => {
            try {
                return r.unitId === mhe.unit_code && r.date && new Date(r.date).toISOString().split('T')[0] === today;
            } catch { return false; }
        })
        .sort((a, b) => {
            try {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            } catch { return 0; }
        });

      if (mheReportsToday.length > 0) {
        inspectedTodayMheCodes.add(mhe.unit_code);
        if (mheReportsToday[0].status === 'Safe') {
          safeTodayCount++;
        } else if (mheReportsToday[0].status === 'Unsafe') {
          unsafeTodayCount++;
        }
      }
    });

    const totalMHEs = mheUnitsInDept.length;
    const notInspectedTodayCount = totalMHEs - inspectedTodayMheCodes.size;

    const data = [
      { name: 'Safe Today', value: safeTodayCount, fill: chartColors.safe },
      { name: 'Unsafe Today', value: unsafeTodayCount, fill: chartColors.unsafe },
      { name: 'Not Inspected Today', value: notInspectedTodayCount, fill: chartColors.notInspected },
    ].filter(item => item.value >= 0); 

    return { data, totalMHEs };
  }, [mheUnitsInDept, reports]);

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Building className="mr-2 h-5 w-5 text-primary" />
            <div className="h-5 w-3/4 bg-muted rounded animate-pulse"></div>
          </CardTitle>
          <CardDescription>
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse mt-1"></div>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[250px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.65; 
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (value === 0 || percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="hsl(var(--primary-foreground))"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11px"
        fontWeight="medium"
      >
        {`${value}`}
      </text>
    );
  };


  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center text-lg truncate">
          <Building className="mr-2 h-5 w-5 text-primary flex-shrink-0" />
          {department.name}
        </CardTitle>
        <CardDescription>Daily Safety Status</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px]">
        {donutData.totalMHEs === 0 && !isLoading ? (
           <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground text-center text-sm">No active MHEs in this department.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 5, right: 5, bottom: 30, left: 5 }}> {/* Adjusted bottom margin for legend */}
                <ChartTooltip
                  cursor={true}
                  content={<ChartTooltipContent nameKey="name" />}
                />
                <Pie
                  data={donutData.data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%" 
                  outerRadius="85%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  strokeWidth={2}
                >
                  {donutData.data.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} stroke={"hsl(var(--background))"} />
                  ))}
                   <Label
                    content={
                        props => {
                            const {viewBox} = props;
                            const {cx, cy} = viewBox as any;
                            return (
                                <>
                                <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="central" className="text-3xl font-bold fill-foreground">
                                    {donutData.totalMHEs}
                                </text>
                                <text x={cx} y={cy + 15} textAnchor="middle" dominantBaseline="central" className="text-xs fill-muted-foreground">
                                    Total MHEs
                                </text>
                                </>
                            )
                        }
                    }
                  />
                </Pie>
                <ChartLegend 
                  content={<ChartLegendContent nameKey="name" className="text-xs"/>} 
                  verticalAlign="bottom" 
                  wrapperStyle={{paddingTop: '10px'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

