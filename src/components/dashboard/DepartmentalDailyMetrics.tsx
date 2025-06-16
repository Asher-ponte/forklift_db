
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks, CheckCircle, AlertTriangle, Loader2, Building } from 'lucide-react';
import type { Department, MheUnit, StoredInspectionReport } from '@/lib/types';

interface DepartmentalDailyMetricsProps {
  departments: Department[];
  mheUnits: MheUnit[];
  reports: StoredInspectionReport[];
  isLoading: boolean;
}

interface DailyMetric {
  departmentId: string;
  departmentName: string;
  totalMHEs: number;
  safeMHEsToday: number;
  unsafeMHEsToday: number;
  notInspectedToday: number;
}

export default function DepartmentalDailyMetrics({ departments, mheUnits, reports, isLoading }: DepartmentalDailyMetricsProps) {
  const dailyMetrics = useMemo(() => {
    if (!departments.length || !mheUnits.length) return [];

    const today = new Date().toISOString().split('T')[0];
    const metrics: DailyMetric[] = [];

    departments.forEach(dept => {
      const mhesInDept = mheUnits.filter(mhe => mhe.department_id === dept.id && mhe.status !== 'inactive');
      let safeToday = 0;
      let unsafeToday = 0;
      let inspectedTodayCount = 0;

      mhesInDept.forEach(mhe => {
        const mheReportsToday = reports
          .filter(r => r.unitId === mhe.unit_code && r.date && new Date(r.date).toISOString().split('T')[0] === today)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (mheReportsToday.length > 0) {
          inspectedTodayCount++;
          if (mheReportsToday[0].status === 'Safe') {
            safeToday++;
          } else if (mheReportsToday[0].status === 'Unsafe') {
            unsafeToday++;
          }
        }
      });
      metrics.push({
        departmentId: dept.id,
        departmentName: dept.name,
        totalMHEs: mhesInDept.length,
        safeMHEsToday: safeToday,
        unsafeMHEsToday: unsafeToday,
        notInspectedToday: mhesInDept.length - inspectedTodayCount,
      });
    });
    return metrics;
  }, [departments, mheUnits, reports]);

  if (isLoading) {
    return (
      <>
        {[...Array(3)].map((_, i) => ( // Skeleton for 3 cards
          <Card key={`skeleton-${i}`} className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-lg"><Building className="mr-2 h-5 w-5 text-primary"/> <div className="h-5 w-2/3 bg-muted rounded animate-pulse"></div></CardTitle>
              <CardDescription><div className="h-4 w-1/2 bg-muted rounded animate-pulse mt-1"></div></CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  if (!departments.length) {
     return (
      <Card className="shadow-lg col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Departmental Daily Safety</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No departments found. Please configure departments in Data Management.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (dailyMetrics.length === 0) {
    return (
      <Card className="shadow-lg col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
            <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Departmental Daily Safety</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">No MHE units or reports to calculate daily metrics for configured departments.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {dailyMetrics.map(metric => (
        <Card key={metric.departmentId} className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-lg truncate">
                <Building className="mr-2 h-5 w-5 text-primary flex-shrink-0"/> 
                {metric.departmentName}
            </CardTitle>
            <CardDescription>Total MHEs: {metric.totalMHEs}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center text-sm">
              <CheckCircle className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />
              Safe Today: <span className="font-bold ml-1">{metric.safeMHEsToday}</span>
            </div>
            <div className="flex items-center text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive mr-1.5 flex-shrink-0" />
              Unsafe Today: <span className="font-bold ml-1">{metric.unsafeMHEsToday}</span>
            </div>
            <div className="flex items-center text-sm">
              <Badge variant="outline" className="text-xs w-full justify-center py-1">
                  Not Inspected Today: <span className="font-bold ml-1">{metric.notInspectedToday}</span>
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
