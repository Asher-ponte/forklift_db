
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DowntimeOverviewChart from '@/components/dashboard/DowntimeOverviewChart';
import UnitHistory from '@/components/dashboard/UnitHistory';
import DepartmentalDailyMetrics from '@/components/dashboard/DepartmentalDailyMetrics';
import DepartmentMonthlyTrendChart from '@/components/dashboard/DepartmentMonthlyTrendChart';
import UninspectedMHEsChart from '@/components/dashboard/UninspectedMHEsChart';
import UninspectedMheUnitCodesChart from '@/components/dashboard/UninspectedMheUnitCodesChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertTriangle, RotateCcw, Filter, CalendarDays, BarChartHorizontalBig } from 'lucide-react';
import type { StoredInspectionReport, StoredDowntimeLog, Department, MheUnit } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

interface DashboardStats {
  totalInspectionsToday: number;
  safeForkliftsToday: number;
  unsafeForkliftsToday: number;
}

const REPORTS_STORAGE_KEY = 'forkliftInspectionReports';
const DOWNTIME_STORAGE_KEY = 'forkliftDowntimeLogs';
const DEPARTMENTS_KEY = 'forkliftDepartments';
const MHE_UNITS_KEY = 'forkliftMheUnits';

const getFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const item = localStorage.getItem(key);
  if (item) {
    try {
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`Error parsing localStorage item ${key}:`, e);
      return defaultValue;
    }
  }
  return defaultValue;
};

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
      const fetchedReports = getFromLocalStorage<StoredInspectionReport[]>(REPORTS_STORAGE_KEY, []);
      const fetchedDowntimeLogs = getFromLocalStorage<StoredDowntimeLog[]>(DOWNTIME_STORAGE_KEY, []);
      const fetchedDepartments = getFromLocalStorage<Department[]>(DEPARTMENTS_KEY, []);
      const fetchedMheUnits = getFromLocalStorage<MheUnit[]>(MHE_UNITS_KEY, []);
      
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
      
      setStats({ // Set all stats at once
        totalInspectionsToday: todayReports.length,
        safeForkliftsToday: safeTodayCount,
        unsafeForkliftsToday: unsafeTodayCount,
      });
      if (typeof window !== 'undefined') { // Prevent toast on server render if pre-rendering
        toast({ title: "Dashboard Loaded", description: "Data loaded from local storage.", duration: 3000 });
      }

    } catch (error) {
      console.error("Failed to load dashboard data from localStorage:", error);
      if (typeof window !== 'undefined') {
        toast({ title: "Dashboard Load Error", description: "Could not load data from local storage.", variant: "destructive" });
      }
      setAllReports([]);
      setAllDowntimeLogs([]);
      setDepartments([]);
      setMheUnits([]);
      setStats({ // Reset stats on error
        totalInspectionsToday: 0,
        safeForkliftsToday: 0,
        unsafeForkliftsToday: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // Dependencies for useCallback

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleApplyFilters = () => {
    setActiveFilters({ start: filterStartDate || null, end: filterEndDate || null });
    toast({ title: "Filters Applied", description: "Graphs updated with selected date range.", duration: 3000});
  };

  const handleClearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setActiveFilters({ start: null, end: null });
    toast({ title: "Filters Cleared", description: "Graphs showing all data.", duration: 3000});
  };

  const filteredReportsForCharts = useMemo(() => {
    if (!activeFilters.start && !activeFilters.end) return allReports;
    return allReports.filter(report => {
      try {
        const reportDate = parseISO(report.date);
        const start = activeFilters.start ? parseISO(activeFilters.start) : null;
        const end = activeFilters.end ? parseISO(activeFilters.end) : null;
        
        if (start && reportDate < start) return false;
        if (end) {
            const dayEnd = new Date(end); 
            dayEnd.setHours(23, 59, 59, 999);
            if (reportDate > dayEnd) return false;
        }
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
        const start = activeFilters.start ? parseISO(activeFilters.start) : null;
        const end = activeFilters.end ? parseISO(activeFilters.end) : null;

        if (start && logDate < start) return false;
        if (end) {
            const dayEnd = new Date(end);
            dayEnd.setHours(23, 59, 59, 999);
            if (logDate > dayEnd) return false;
        }
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
          <p className="text-muted-foreground">Here's an overview of your forklift operations (Local Mode).</p>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DepartmentalDailyMetrics departments={departments} mheUnits={mheUnits} reports={allReports} isLoading={isLoading} />
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Filter className="mr-2 h-5 w-5 text-primary"/>Chart Filters</CardTitle>
          <CardDescription>Apply date range filters to the charts below (monthly trends, uninspected MHEs, downtime overview).</CardDescription>
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
          <CardDescription>Enter a Unit ID to view its inspection history from local storage.</CardDescription>
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

