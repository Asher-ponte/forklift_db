
'use client';

import { useState, useEffect, useCallback } from 'react';
import DailyHitRateChart from '@/components/dashboard/DailyHitRateChart';
import DowntimeOverviewChart from '@/components/dashboard/DowntimeOverviewChart';
import UnitHistory from '@/components/dashboard/UnitHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertTriangle, Clock, ScanLine, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import type { StoredInspectionReport, StoredDowntimeLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalInspectionsToday: number;
  safeForkliftsToday: number;
  unsafeForkliftsToday: number;
  upcomingInspections: number;
}

const REPORTS_STORAGE_KEY = 'forkliftInspectionReports';
const DOWNTIME_STORAGE_KEY = 'forkliftDowntimeLogs';

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
    upcomingInspections: 3, // Mock data, can be made dynamic if needed
  });
  const [allReports, setAllReports] = useState<StoredInspectionReport[]>([]);
  const [allDowntimeLogs, setAllDowntimeLogs] = useState<StoredDowntimeLog[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedReports = getFromLocalStorage<StoredInspectionReport[]>(REPORTS_STORAGE_KEY, []);
      const fetchedDowntimeLogs = getFromLocalStorage<StoredDowntimeLog[]>(DOWNTIME_STORAGE_KEY, []);
      
      setAllReports(fetchedReports);
      setAllDowntimeLogs(fetchedDowntimeLogs);

      // Calculate Stats
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
      
      setStats(prevStats => ({
        ...prevStats,
        totalInspectionsToday: todayReports.length,
        safeForkliftsToday: safeTodayCount,
        unsafeForkliftsToday: unsafeTodayCount,
      }));
      toast({ title: "Dashboard Loaded", description: "Data loaded from local storage.", duration: 3000 });

    } catch (error) {
      console.error("Failed to load dashboard data from localStorage:", error);
      toast({ title: "Dashboard Load Error", description: "Could not load data from local storage.", variant: "destructive" });
      setAllReports([]);
      setAllDowntimeLogs([]);
      setStats(prevStats => ({
        ...prevStats,
        totalInspectionsToday: 0,
        safeForkliftsToday: 0,
        unsafeForkliftsToday: 0,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
      

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Inspections</CardTitle>
            <Clock className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingInspections}</div>
            <p className="text-xs text-muted-foreground">Scheduled (mock data)</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-center py-6">
        <Link href="/inspection" passHref>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
            <ScanLine className="mr-2 h-5 w-5" />
            Start New Inspection
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <DailyHitRateChart reports={allReports} />
        <DowntimeOverviewChart downtimeLogs={allDowntimeLogs} />
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline font-bold">Unit History</CardTitle>
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
