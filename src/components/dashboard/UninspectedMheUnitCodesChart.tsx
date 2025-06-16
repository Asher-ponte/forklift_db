
'use client';

import { useMemo } from 'react';
import { ListFilter, Loader2, AlertCircle, SearchX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from '@/components/ui/badge';
import type { Department, MheUnit, StoredInspectionReport } from '@/lib/types';
import { parseISO, isWithinInterval, format, startOfDay, endOfDay } from 'date-fns';

interface UninspectedMheUnitCodesChartProps {
  departments: Department[];
  mheUnits: MheUnit[];
  reports: StoredInspectionReport[];
  filterStartDate: string | null;
  filterEndDate: string | null;
  isLoading: boolean;
}

type ChartStatus = 'loading' | 'idle' | 'validData' | 'noDataInFilter' | 'noDataToday' | 'invalidFilter' | 'incompleteFilter';

interface UninspectedDeptData {
  departmentId: string;
  departmentName: string;
  uninspectedUnitCodes: string[];
}

export default function UninspectedMheUnitCodesChart({ departments, mheUnits, reports, filterStartDate, filterEndDate, isLoading }: UninspectedMheUnitCodesChartProps) {

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
          currentStatus = 'validData';
        } else {
          currentStatus = 'invalidFilter';
          description = "Error: Start date is after end date.";
        }
      } catch (e) {
        currentStatus = 'invalidFilter';
        description = "Error: Invalid date format in filter.";
        console.warn("Invalid date for filtering uninspected MHE unit codes:", e);
      }
    } else if (!filterStartDate && !filterEndDate) {
      dateInterval = { start: startOfDay(new Date()), end: endOfDay(new Date()) };
      description = "for today";
      currentStatus = 'validData';
    } else {
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
      } catch (e) { /* ignore parse errors */ }
    });

    const uninspectedDataByDept: UninspectedDeptData[] = departments.map(dept => {
      const mhesInDept = activeMheUnits.filter(mhe => mhe.department_id === dept.id);
      const uninspectedUnits = mhesInDept
        .filter(mhe => !inspectedMheUnitCodesInPeriod.has(mhe.unit_code))
        .map(mhe => mhe.unit_code);
      
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        uninspectedUnitCodes: uninspectedUnits,
      };
    }).filter(d => d.uninspectedUnitCodes.length > 0);

    if (uninspectedDataByDept.length === 0) {
        currentStatus = (filterStartDate && filterEndDate) ? 'noDataInFilter' : 'noDataToday';
    }
    
    return { data: uninspectedDataByDept, status: currentStatus, periodDescription: description };

  }, [departments, mheUnits, reports, filterStartDate, filterEndDate, isLoading]);

  const getCardDescription = () => {
    let base = "List of specific MHE unit codes with no inspection records ";
    switch (status) {
      case 'loading':
        return "Loading data...";
      case 'validData':
      case 'noDataInFilter':
      case 'noDataToday':
        base += `${periodDescription || ''}. `;
        break;
      case 'invalidFilter':
      case 'incompleteFilter':
        return periodDescription || "Please check your date filter settings.";
      default:
        return "Configure departments and MHE units in Data Management. Apply filters to see data.";
    }
    return base + "Click on a department to see the list.";
  };

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ListFilter className="mr-2 h-6 w-6 text-primary" />
          Uninspected MHE Unit Codes
        </CardTitle>
        <CardDescription>{getCardDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-[150px]">
        {status === 'loading' ? (
          <div className="flex justify-center items-center h-full min-h-[150px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
             <span className="ml-2 text-muted-foreground">Loading data...</span>
          </div>
        ) : status === 'invalidFilter' || status === 'incompleteFilter' ? (
            <div className="flex flex-col justify-center items-center h-full min-h-[150px] text-center">
                <AlertCircle className="h-10 w-10 text-destructive mb-2" />
                <p className="text-destructive">{periodDescription}</p>
            </div>
        ) : status === 'noDataInFilter' ? (
             <div className="flex flex-col justify-center items-center h-full min-h-[150px] text-center">
                <SearchX className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">All active MHEs appear to have been inspected in the selected period, or no MHEs match criteria.</p>
            </div>
        ): status === 'noDataToday' ? (
             <div className="flex flex-col justify-center items-center h-full min-h-[150px] text-center">
                <SearchX className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">All active MHEs appear to have been inspected today, or no MHEs match criteria.</p>
            </div>
        ) : data.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {data.map((deptData) => (
              <AccordionItem value={deptData.departmentId} key={deptData.departmentId}>
                <AccordionTrigger>
                  <div className="flex justify-between items-center w-full pr-2">
                    <span>{deptData.departmentName}</span>
                    <Badge variant="destructive">{deptData.uninspectedUnitCodes.length} Unit(s)</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-md">
                    {deptData.uninspectedUnitCodes.map(code => (
                      <Badge key={code} variant="secondary" className="text-sm">{code}</Badge>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
           <div className="flex flex-col justify-center items-center h-full min-h-[150px] text-center">
             <SearchX className="h-10 w-10 text-muted-foreground mb-2" />
             <p className="text-muted-foreground">No uninspected MHE unit codes found {periodDescription || 'for the current criteria'}.</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
