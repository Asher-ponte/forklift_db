
'use client';

import { useMemo } from 'react';
import { ListFilter, Loader2, AlertCircle, SearchX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from '@/components/ui/badge';
import type { Department, MheUnit, StoredInspectionReport } from '@/lib/types';
import { parseISO, isWithinInterval } from 'date-fns';

interface UninspectedMheUnitCodesChartProps {
  departments: Department[];
  mheUnits: MheUnit[];
  reports: StoredInspectionReport[];
  filterStartDate: string | null;
  filterEndDate: string | null;
  isLoading: boolean;
}

export default function UninspectedMheUnitCodesChart({ departments, mheUnits, reports, filterStartDate, filterEndDate, isLoading }: UninspectedMheUnitCodesChartProps) {

  const uninspectedDataByDept = useMemo(() => {
    if (isLoading || !departments.length || !mheUnits.length) return [];

    const activeMheUnits = mheUnits.filter(mhe => mhe.status !== 'inactive');
    let dateInterval: Interval | null = null;

    if (filterStartDate && filterEndDate) {
      try {
        const start = parseISO(filterStartDate);
        const end = parseISO(filterEndDate);
        const inclusiveEnd = new Date(end);
        inclusiveEnd.setHours(23, 59, 59, 999);
        if (start <= inclusiveEnd) {
          dateInterval = { start, end: inclusiveEnd };
        }
      } catch (e) {
        console.warn("Invalid date for filtering uninspected MHE unit codes:", e);
      }
    }
    
    if (!dateInterval) { // If no valid date range is selected, don't show any data.
        return [];
    }

    const inspectedMheUnitCodesInPeriod = new Set<string>();
    reports.forEach(report => {
        try {
            const reportDate = parseISO(report.date);
            if (isWithinInterval(reportDate, dateInterval!)) {
                inspectedMheUnitCodesInPeriod.add(report.unitId);
            }
        } catch (e) { /* ignore parse errors */ }
    });

    const dataByDepartment = departments.map(dept => {
      const mhesInDept = activeMheUnits.filter(mhe => mhe.department_id === dept.id);
      const uninspectedUnits = mhesInDept
        .filter(mhe => !inspectedMheUnitCodesInPeriod.has(mhe.unit_code))
        .map(mhe => mhe.unit_code);
      
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        uninspectedUnitCodes: uninspectedUnits,
      };
    });

    return dataByDepartment.filter(d => d.uninspectedUnitCodes.length > 0); // Only include departments with uninspected units

  }, [departments, mheUnits, reports, filterStartDate, filterEndDate, isLoading]);

  if (isLoading) {
    return (
      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ListFilter className="mr-2 h-6 w-6 text-primary" />
            Uninspected MHE Unit Codes
          </CardTitle>
          <CardDescription>Loading list of MHE unit codes with no inspection records in the selected period.</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!filterStartDate || !filterEndDate) {
    return (
      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ListFilter className="mr-2 h-6 w-6 text-primary" />
            Uninspected MHE Unit Codes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center h-[200px] text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Please select a date range using the filter above to view specific uninspected MHE unit codes.</p>
        </CardContent>
      </Card>
    );
  }

  if (uninspectedDataByDept.length === 0) {
    return (
        <Card className="shadow-lg w-full">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <ListFilter className="mr-2 h-6 w-6 text-primary" />
                    Uninspected MHE Unit Codes
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-center items-center h-[200px] text-center">
                <SearchX className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">All active MHEs have been inspected in the selected period, or no MHEs match criteria.</p>
            </CardContent>
        </Card>
    );
  }


  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ListFilter className="mr-2 h-6 w-6 text-primary" />
          Uninspected MHE Unit Codes
        </CardTitle>
        <CardDescription>List of specific MHE unit codes with no inspection records in the selected period. Click on a department to see the list.</CardDescription>
      </CardHeader>
      <CardContent>
        {uninspectedDataByDept.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {uninspectedDataByDept.map((deptData) => (
              <AccordionItem value={deptData.departmentId} key={deptData.departmentId}>
                <AccordionTrigger>
                  <div className="flex justify-between items-center w-full pr-2">
                    <span>{deptData.departmentName}</span>
                    <Badge variant="destructive">{deptData.uninspectedUnitCodes.length} Unit(s)</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {deptData.uninspectedUnitCodes.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-md">
                      {deptData.uninspectedUnitCodes.map(code => (
                        <Badge key={code} variant="secondary" className="text-sm">{code}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground p-2">All MHEs in this department were inspected.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
           <div className="flex flex-col justify-center items-center h-[150px] text-center">
             <p className="text-muted-foreground">All active MHEs appear to have been inspected in the selected period, or no MHEs match criteria.</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
