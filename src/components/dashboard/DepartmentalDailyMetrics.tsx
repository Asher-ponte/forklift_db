
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ListChecks, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { Department, MheUnit, StoredInspectionReport } from '@/lib/types';

interface DepartmentalDailyMetricsProps {
  departments: Department[];
  mheUnits: MheUnit[];
  reports: StoredInspectionReport[];
  isLoading: boolean;
}

interface DailyMetric {
  departmentName: string;
  totalMHEs: number;
  safeMHEsToday: number;
  unsafeMHEsToday: number;
  notInspectedToday: number;
}

export default function DepartmentalDailyMetrics({ departments, mheUnits, reports, isLoading }: DepartmentalDailyMetricsProps) {
  const dailyMetrics = useMemo(() => {
    if (isLoading || !departments.length || !mheUnits.length) return [];

    const today = new Date().toISOString().split('T')[0];
    const metrics: DailyMetric[] = [];

    departments.forEach(dept => {
      const mhesInDept = mheUnits.filter(mhe => mhe.department_id === dept.id && mhe.status !== 'inactive');
      let safeToday = 0;
      let unsafeToday = 0;
      let inspectedTodayCount = 0;

      mhesInDept.forEach(mhe => {
        const mheReportsToday = reports
          .filter(r => r.unitId === mhe.unit_code && new Date(r.date).toISOString().split('T')[0] === today)
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
        departmentName: dept.name,
        totalMHEs: mhesInDept.length,
        safeMHEsToday: safeToday,
        unsafeMHEsToday: unsafeToday,
        notInspectedToday: mhesInDept.length - inspectedTodayCount,
      });
    });
    return metrics;
  }, [departments, mheUnits, reports, isLoading]);

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Departmental Daily Safety</CardTitle>
          <CardDescription>Status of MHE units per department based on today's latest inspections.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading metrics...</span>
        </CardContent>
      </Card>
    );
  }

  if (!departments.length) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Departmental Daily Safety</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No departments found. Please configure departments in Data Management.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Departmental Daily Safety</CardTitle>
        <CardDescription>Status of MHE units per department based on today's latest inspections.</CardDescription>
      </CardHeader>
      <CardContent>
        {dailyMetrics.length > 0 ? (
          <ScrollArea className="h-60"> {/* Adjust height as needed */}
            <div className="space-y-4">
              {dailyMetrics.map(metric => (
                <div key={metric.departmentName} className="p-3 border rounded-md bg-secondary/30">
                  <h4 className="font-semibold text-md text-primary mb-2">{metric.departmentName} (Total MHEs: {metric.totalMHEs})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />
                      Safe Today: <span className="font-bold ml-1">{metric.safeMHEsToday}</span>
                    </div>
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-destructive mr-1.5 flex-shrink-0" />
                      Unsafe Today: <span className="font-bold ml-1">{metric.unsafeMHEsToday}</span>
                    </div>
                     <div className="flex items-center">
                      <Badge variant="outline" className="text-xs">
                         Not Inspected Today: <span className="font-bold ml-1">{metric.notInspectedToday}</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground">No MHE units or reports to calculate daily metrics.</p>
        )}
      </CardContent>
    </Card>
  );
}
