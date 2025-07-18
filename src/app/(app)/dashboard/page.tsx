
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DepartmentSafetyDonut from '@/components/dashboard/DepartmentSafetyDonut';
import UnitHistory from '@/components/dashboard/UnitHistory';
import DepartmentMonthlyTrendChart from '@/components/dashboard/DepartmentMonthlyTrendChart';
import UninspectedMHEsChart from '@/components/dashboard/UninspectedMHEsChart';
import UninspectedMheUnitCodesChart from '@/components/dashboard/UninspectedMheUnitCodesChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertTriangle, RotateCcw, Filter, CalendarDays, BarChartHorizontalBig, ListChecks } from 'lucide-react';
import type { StoredInspectionReport, StoredDowntimeLog, Department, MheUnit } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import DowntimeOverviewChart from '@/components/dashboard/DowntimeOverviewChart';
import * as apiService from '@/services/apiService';

interface DashboardStats {
  totalInspectionsToday: number;
  safeForkliftsToday: number;
  unsafeForkliftsToday: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalInspectionsToday: 0,
    safeForkliftsToday: 0,
    unsafeForkliftsToday: 0,
  });
  const [allReports, setAllReports] = useState<StoredInspectionReport[]>([]);
  const [allDowntimeLogs, setAllDowntimeLogs] = useState<StoredDowntimeLog[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [mheUnits, setMheUnits] = useState<MheUnit[]>([]);
  
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [activeFilters, setActiveFilters] = useState<{start: string | null, end: string | null}>({ start: null, end: null });

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        fetchedReports, 
        fetchedDowntimeLogs, 
        fetchedDepartments, 
        fetchedMheUnits
      ] = await Promise.all([
        apiService.fetchInspectionReports(),
        apiService.fetchDowntimeLogs(),
        apiService.fetchDepartments(),
        apiService.fetchMheUnits()
      ]);
      
      setAllReports(fetchedReports);
      setAllDowntimeLogs(fetchedDowntimeLogs);
      setDepartments(fetchedDepartments);
      setMheUnits(fetchedMheUnits);

      const today = new Date().toISOString().split('T')[0];
      const todayReports = fetchedReports.filter(report => {
        try {
          return new Date(report.date).toISOString().split('T')[0] === today;
        } catch (e) { return false; }
      });

      let safeTodayCount = 0;
      let unsafeTodayCount = 0;
      const latestReportForUnitToday: Record<string, StoredInspectionReport> = {};

      todayReports.forEach(report => {
        try {
            const reportDate = new Date(report.date);
            if (!latestReportForUnitToday[report.unitId] || reportDate > new Date(latestReportForUnitToday[report.unitId].date)) {
            latestReportForUnitToday[report.unitId] = report;
            }
        } catch(e) {
            console.warn("Could not parse date for report in stats calculation", report);
        }
      });

      Object.values(latestReportForUnitToday).forEach(report => {
        if (report.status === 'Safe') {
          safeTodayCount++;
        } else if (report.status === 'Unsafe') {
          unsafeTodayCount++;
        }
      });
      
      setStats({ 
        totalInspectionsToday: todayReports.length,
        safeForkliftsToday: safeTodayCount,
        unsafeForkliftsToday: unsafeTodayCount,
      });
      toast({ title: "Dashboard Loaded", description: "Data refreshed from API.", duration: 3000 });

    } catch (error) {
      console.error("Failed to load dashboard data from API:", error);
      toast({ title: "Dashboard Load Error", description: "Could not load data from API.", variant: "destructive" });
      setAllReports([]);
      setAllDowntimeLogs([]);
      setDepartments([]);
      setMheUnits([]);
      setStats({
        totalInspectionsToday: 0,
        safeForkliftsToday: 0,
        unsafeForkliftsToday: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); 

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleApplyFilters = () => {
    if (filterStartDate && filterEndDate && new Date(filterStartDate) > new Date(filterEndDate)) {
        toast({ title: "Filter Error", description: "Start date cannot be after end date.", variant: "destructive", duration: 4000});
        return;
    }
    setActiveFilters({ start: filterStartDate || null, end: filterEndDate || null });
    toast({ title: "Filters Applied", description: "Graphs updated with selected date range.", duration: 3000});
  };

  const handleClearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setActiveFilters({ start: null, end: null });
    toast({ title: "Filters Cleared", description: "Graphs showing default data.", duration: 4000});
  };

  const filteredReportsForCharts = useMemo(() => {
    if (!activeFilters.start && !activeFilters.end) return allReports; 
    return allReports.filter(report => {
      try {
        const reportDate = parseISO(report.date);
        const start = activeFilters.start ? startOfDay(parseISO(activeFilters.start)) : null;
        const end = activeFilters.end ? endOfDay(parseISO(activeFilters.end)) : null;
        
        if (start && reportDate < start) return false;
        if (end && reportDate > end) return false;
        return true;
      } catch (e) {
        console.warn("Error parsing date for filtering reports", report.date, e);
        return false;
      }
    });
  }, [allReports, activeFilters]);

  const filteredDowntimeLogsForChart = useMemo(() => {
    if (!activeFilters.start && !activeFilters.end) return allDowntimeLogs; 
    return allDowntimeLogs.filter(log => {
      try {
        const logDate = parseISO(log.startTime); 
        const start = activeFilters.start ? startOfDay(parseISO(activeFilters.start)) : null;
        const end = activeFilters.end ? endOfDay(parseISO(activeFilters.end)) : null;

        if (start && logDate < start) return false;
        if (end && logDate > end) return false;
        return true;
      } catch (e) {
         console.warn("Error parsing date for filtering downtime logs", log.startTime, e);
        return false;
      }
    });
  }, [allDowntimeLogs, activeFilters]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold">Welcome, {user?.username}!</h1>
          <p className="text-muted-foreground">Here's an overview of your forklift operations.</p>
        </div>
        <Button onClick={loadDashboardData} variant="outline" size="sm" className="mt-2 sm:mt-0" disabled={isLoading}>
          <RotateCcw className="mr-2 h-4 w-4" /> {isLoading ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inspections Today</CardTitle>
            <CheckCircle className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="text-2xl font-bold animate-pulse">--</div> : <div className="text-2xl font-bold">{stats.totalInspectionsToday}</div>}
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forklifts Ready Today</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="text-2xl font-bold animate-pulse">--</div> : <div className="text-2xl font-bold">{stats.safeForkliftsToday}</div>}
            <p className="text-xs text-muted-foreground">Latest inspection today is 'Safe'</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention Today</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="text-2xl font-bold animate-pulse">--</div> : <div className="text-2xl font-bold">{stats.unsafeForkliftsToday}</div>}
            <p className="text-xs text-muted-foreground">Latest inspection today is 'Unsafe'</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/>Departmental MHE Overview</CardTitle>
          <CardDescription>Summary of MHE safety status by department for today. These cards are not affected by the date filter below.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading && departments.length === 0 && <p>Loading department data...</p>}
            {!isLoading && departments.length === 0 && <p className="text-muted-foreground">No departments configured. Please add departments in Data Management.</p>}
            {departments.length > 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {departments.map(dept => (
                        <DepartmentSafetyDonut
                            key={dept.id}
                            department={dept}
                            mheUnitsInDept={mheUnits.filter(mhe => mhe.department_id === dept.id && mhe.status !== 'inactive')}
                            reports={allReports} 
                            isLoading={isLoading}
                        />
                    ))}
                </div>
            )}
        </CardContent>
      </Card>


      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Filter className="mr-2 h-5 w-5 text-primary"/>Chart Filters</CardTitle>
          <CardDescription>Apply date range filters to the trend and analysis charts below. Uninspected MHE charts default to today if no filter is set.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="filterStartDate" className="block text-sm font-medium text-muted-foreground mb-1">Start Date</label>
            <Input type="date" id="filterStartDate" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="text-base"/>
          </div>
          <div className="flex-1">
            <label htmlFor="filterEndDate" className="block text-sm font-medium text-muted-foreground mb-1">End Date</label>
            <Input type="date" id="filterEndDate" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="text-base"/>
          </div>
          <div className="flex gap-2 pt-2 md:pt-0">
            <Button onClick={handleApplyFilters} className="text-base"><CalendarDays className="mr-2 h-4 w-4"/>Apply</Button>
            <Button onClick={handleClearFilters} variant="outline" className="text-base">Clear</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map(dept => (
          <DepartmentMonthlyTrendChart 
            key={dept.id} 
            department={dept} 
            mheUnits={mheUnits.filter(mhe => mhe.department_id === dept.id)} 
            reports={filteredReportsForCharts} 
            isLoading={isLoading}
          />
        ))}
      </div>
      
      <UninspectedMheUnitCodesChart
        departments={departments}
        mheUnits={mheUnits}
        reports={allReports} 
        filterStartDate={activeFilters.start}
        filterEndDate={activeFilters.end}
        isLoading={isLoading}
      />
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
        <UninspectedMHEsChart 
            departments={departments} 
            mheUnits={mheUnits} 
            reports={allReports} 
            filterStartDate={activeFilters.start} 
            filterEndDate={activeFilters.end}
            isLoading={isLoading}
        />
        <DowntimeOverviewChart 
          downtimeLogs={filteredDowntimeLogsForChart} 
          isLoading={isLoading}
        />
      </div>

      <Card className="shadow-md mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-headline font-bold flex items-center">
             <BarChartHorizontalBig className="mr-2 h-6 w-6 text-primary" />
             Unit History
          </CardTitle>
          <CardDescription>Enter a Unit ID to view its inspection history from the API.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label htmlFor="unitIdInput" className="block text-sm font-medium text-muted-foreground mb-1">Enter Unit ID:</label>
            <Input 
              id="unitIdInput" 
              type="text" 
              value={selectedUnitId} 
              onChange={(e) => setSelectedUnitId(e.target.value)} 
              placeholder="e.g., FL001"
              className="mt-1 block w-full max-w-sm" 
            />
          </div>
          <UnitHistory unitId={selectedUnitId} reports={allReports} />
        </CardContent>
      </Card>
    </div>
  );
}
