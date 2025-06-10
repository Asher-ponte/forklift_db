
'use client';

import { useState, useEffect, useCallback } from 'react';
import DowntimeForm from '@/components/downtime/DowntimeForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { RefreshCw, ListChecks } from 'lucide-react';
import type { StoredDowntimeLog } from '@/lib/types';

const LOCAL_STORAGE_DOWNTIME_KEY = 'forkliftDowntimeLogs';

export default function DowntimePage() {
  const [downtimeLogs, setDowntimeLogs] = useState<StoredDowntimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDowntimeLogs = useCallback(() => {
    setIsLoading(true);
    const storedLogsRaw = localStorage.getItem(LOCAL_STORAGE_DOWNTIME_KEY);
    const logs: StoredDowntimeLog[] = storedLogsRaw ? JSON.parse(storedLogsRaw) : [];
    // Sort logs by loggedAt date, most recent first
    logs.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
    setDowntimeLogs(logs);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDowntimeLogs();
  }, [loadDowntimeLogs]);

  const formatDateTime = (isoString: string | null | undefined) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-8">
      <DowntimeForm onLogAdded={loadDowntimeLogs} />

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="font-headline text-2xl flex items-center">
              <ListChecks className="mr-3 h-7 w-7 text-primary" />
              Recent Downtime Logs
            </CardTitle>
            <CardDescription>List of all recorded forklift downtime incidents.</CardDescription>
          </div>
          <Button onClick={loadDowntimeLogs} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Logs
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading downtime logs...</p>
          ) : downtimeLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No downtime logs recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit ID</TableHead>
                  <TableHead className="min-w-[200px]">Reason</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Logged At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {downtimeLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.unitId}</TableCell>
                    <TableCell>{log.reason}</TableCell>
                    <TableCell>{formatDateTime(log.startTime)}</TableCell>
                    <TableCell>{formatDateTime(log.endTime)}</TableCell>
                    <TableCell>{formatDateTime(log.loggedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
