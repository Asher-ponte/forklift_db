
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
import type { StoredInspectionReport } from '@/lib/types';

const LOCAL_STORAGE_REPORTS_KEY = 'forkliftInspectionReports';

interface DashboardStats {
  totalInspectionsToday: number;
  safeForkliftsToday: number;
  unsafeForkliftsToday: number;
  upcomingInspections: number; // Stays mock for now
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalInspectionsToday: 0,
    safeForkliftsToday: 0,
    unsafeForkliftsToday: 0,
    upcomingInspections: 3, // Mock data
  });
  const [allReports, setAllReports] = useState<StoredInspectionReport[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(() => {
    setIsLoading(true);
    const storedReportsRaw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    const reports: StoredInspectionReport[] = storedReportsRaw ? JSON.parse(storedReportsRaw) : [];
    setAllReports(reports);

    const today = new Date().toISOString().split('T')[0];
    const todayReports = reports.filter(report => report.date.startsWith(today));

    let safeTodayCount = 0;
    let unsafeTodayCount = 0;
    const unitsProcessedToday = new Set<string>();
    const latestReportForUnitToday: Record<string, StoredInspectionReport> = {};

    // Get the latest report for each unit inspected today
    todayReports.forEach(report => {
      if (!latestReportForUnitToday[report.unitId] || new Date(report.date) > new Date(latestReportForUnitToday[report.unitId].date)) {
        latestReportForUnitToday[report.unitId] = report;
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
    setIsLoading(false);
  }, []);

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
        <Button onClick={loadDashboardData} variant="outline" size="sm" className="mt-2 sm:mt-0">
          <RotateCcw className="mr-2 h-4 w-4" /> Refresh Data
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
            {/* <p className="text-xs text-muted-foreground">+10% from yesterday</p> */}
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
        <DowntimeOverviewChart />
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
