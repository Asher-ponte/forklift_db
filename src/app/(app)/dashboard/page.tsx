'use client';

import { useState } from 'react';
import DailyHitRateChart from '@/components/dashboard/DailyHitRateChart';
import DowntimeOverviewChart from '@/components/dashboard/DowntimeOverviewChart';
import UnitHistory from '@/components/dashboard/UnitHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertTriangle, Clock, ScanLine } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  // Mock data for dashboard cards
  const totalInspections = 125;
  const safeForklifts = 5; // Assuming 5 active forklifts
  const unsafeForklifts = 1;
  const upcomingInspections = 3;

  const [selectedUnitId, setSelectedUnitId] = useState('');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Welcome, {user?.username}!</h1>
        <p className="text-muted-foreground">Here's an overview of your forklift operations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inspections Today</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInspections}</div>
            <p className="text-xs text-muted-foreground">+10% from yesterday</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forklifts Ready</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeForklifts}</div>
            <p className="text-xs text-muted-foreground">Currently operational</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unsafeForklifts}</div>
            <p className="text-xs text-muted-foreground">Require maintenance</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Inspections</CardTitle>
            <Clock className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingInspections}</div>
            <p className="text-xs text-muted-foreground">Scheduled for next shift</p>
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
        <DailyHitRateChart />
        <DowntimeOverviewChart />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-headline font-bold">Unit History</h2>
        <div>
          <label htmlFor="unitIdInput" className="block text-sm font-medium text-gray-700">Enter Unit ID:</label>
          <Input id="unitIdInput" type="text" value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)} className="mt-1 block w-full max-w-sm" />
        </div>
        <UnitHistory unitId={selectedUnitId} />
      </div>
    </div>
  );
}
