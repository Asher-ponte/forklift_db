
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
  upcomingInspections: number; // Stays mock for now
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalInspectionsToday: 0,
    safeForkliftsToday: 0,
    unsafeForkliftsToday: 0,
    upcomingInspections: 3, // Mock data
  });
  const [allReports, setAllReports] = useState<StoredInspectionReport[]>([]);
  const [allDowntimeLogs, setAllDowntimeLogs] = useState<StoredDowntimeLog[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    try {
      const [reportsResponse, downtimeResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/inspection_reports.php`),
        fetch(`${apiBaseUrl}/downtime_logs.php`)
      ]);

      // Process Inspection Reports
      let fetchedReports: StoredInspectionReport[] = [];
      if (reportsResponse.ok) {
        const responseData = await reportsResponse.json();
        let reportsArray: any[] | undefined;

        if (Array.isArray(responseData)) {
          reportsArray = responseData;
        } else if (responseData && Array.isArray(responseData.data)) {
          reportsArray = responseData.data;
        } else if (responseData && typeof responseData === 'object' && Object.keys(responseData).length === 0) {
          // Handle case where API returns an empty object {} for no reports
          reportsArray = [];
        }

        if (reportsArray) {
          fetchedReports = reportsArray.map((report: any) => ({
            ...report,
            items: Array.isArray(report.items) ? report.items : [], 
          }));
        } else {
          console.error("API returned an unexpected format for inspection reports:", responseData);
          toast({ title: "Data Format Error", description: "Unexpected data format received for inspection reports from server.", variant: "destructive" });
        }
      } else {
        const errorText = await reportsResponse.text();
        toast({ title: "Error Loading Reports", description: `Failed to fetch inspection reports: ${reportsResponse.status} ${errorText.substring(0,100)}`, variant: "destructive" });
      }
      setAllReports(fetchedReports);

      // Process Downtime Logs
      let fetchedDowntimeLogs: StoredDowntimeLog[] = [];
      if (downtimeResponse.ok) {
        const responseData = await downtimeResponse.json();
        let downtimeArray: any[] | undefined;
        
        if (Array.isArray(responseData)) {
          downtimeArray = responseData;
        } else if (responseData && Array.isArray(responseData.data)) {
          downtimeArray = responseData.data;
        } else if (responseData && typeof responseData === 'object' && Object.keys(responseData).length === 0) {
           // Handle case where API returns an empty object {} for no logs
          downtimeArray = [];
        }

        if (downtimeArray) {
          fetchedDowntimeLogs = downtimeArray;
        } else {
          console.error("API returned an unexpected format for downtime logs:", responseData);
          toast({ title: "Data Format Error", description: "Unexpected data format received for downtime logs from server.", variant: "destructive" });
        }
      } else {
        const errorText = await downtimeResponse.text();
        toast({ title: "Error Loading Downtime Logs", description: `Failed to fetch downtime logs: ${downtimeResponse.status} ${errorText.substring(0,100)}`, variant: "destructive" });
      }
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

    } catch (error) {
      console.error("Failed to load dashboard data from API:", error);
      toast({ title: "Dashboard Load Error", description: (error instanceof Error) ? error.message : "An unexpected error occurred.", variant: "destructive" });
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
          <p className="text-muted-foreground">Here's an overview of your forklift operations.</p>
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
          <CardDescription>Enter a Unit ID to view its inspection history.</CardDescription>
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
