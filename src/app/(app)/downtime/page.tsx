
'use client';

import { useState, useEffect, useCallback } from 'react';
import DowntimeForm from '@/components/downtime/DowntimeForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ListChecks, CheckSquare, Edit } from 'lucide-react';
import type { StoredDowntimeLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function DowntimePage() {
  const [downtimeLogs, setDowntimeLogs] = useState<StoredDowntimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEndTimeModalOpen, setIsEndTimeModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<StoredDowntimeLog | null>(null);
  const [currentEditingEndTime, setCurrentEditingEndTime] = useState('');
  const { toast } = useToast();

  const loadDowntimeLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/downtime_logs.php`);

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorData;
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json().catch(() => ({ message: 'Failed to parse JSON error response from server.' }));
        } else {
          const textError = await response.text().catch(() => 'Unknown server error, non-JSON response from server.');
          errorData = { message: `Server error fetching downtime logs (non-JSON): ${textError.substring(0, 200)}... Contact backend admin.` };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const logsFromAPI: StoredDowntimeLog[] = await response.json();

      if (!Array.isArray(logsFromAPI)) {
        console.error("API did not return an array for downtime logs:", logsFromAPI);
        throw new Error("Invalid data format received from server for downtime logs. Expected an array.");
      }
      
      // Basic validation, though backend should enforce this
      const validLogs = logsFromAPI.filter(log =>
        log && typeof log.id === 'string' && typeof log.unitId === 'string' &&
        typeof log.reason === 'string' && typeof log.startTime === 'string' &&
        typeof log.loggedAt === 'string' && (log.endTime === null || typeof log.endTime === 'string' || typeof log.endTime === 'undefined')
      ).sort((a, b) => {
          let dateAVal: number, dateBVal: number;
          try { dateAVal = new Date(a.loggedAt).getTime(); } catch { dateAVal = NaN; }
          try { dateBVal = new Date(b.loggedAt).getTime(); } catch { dateBVal = NaN; }

          if (isNaN(dateAVal) && isNaN(dateBVal)) return 0;
          if (isNaN(dateAVal)) return 1;
          if (isNaN(dateBVal)) return -1;
          return dateBVal - dateAVal;
        });

      setDowntimeLogs(validLogs);

    } catch (error) {
      console.error("An unexpected error occurred while loading or processing downtime logs from API:", error);
      setDowntimeLogs([]); // Reset to a safe state
      toast({
        title: "Error Loading Downtime Logs",
        description: (error instanceof Error) ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDowntimeLogs();
  }, [loadDowntimeLogs]);

  const formatDateTime = (isoString: string | null | undefined) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date string encountered in formatDateTime: ${isoString}`);
        return 'Invalid Date';
      }
      return date.toLocaleString();
    } catch (e) {
      console.error(`Error formatting date string: ${isoString}`, e);
      return 'Error Date';
    }
  };

  const handleOpenEditEndTimeModal = (log: StoredDowntimeLog) => {
    setSelectedLogForEdit(log);
    let initialEndTime = '';

    if (log.endTime && typeof log.endTime === 'string') {
        try {
            const d = new Date(log.endTime);
            if (!isNaN(d.getTime())) {
                const offset = d.getTimezoneOffset() * 60000;
                initialEndTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
            } else {
                 console.warn(`Invalid log.endTime for input: ${log.endTime}`);
            }
        } catch (e) {
            console.error(`Error processing log.endTime for input: ${log.endTime}`, e);
        }
    }

    if (!initialEndTime) {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        initialEndTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    }
    
    setCurrentEditingEndTime(initialEndTime);
    setIsEndTimeModalOpen(true);
  };

  const handleSaveEndTime = async () => {
    if (!selectedLogForEdit || !currentEditingEndTime) {
      toast({ title: "Error", description: "End time cannot be empty.", variant: "destructive" });
      return;
    }

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/downtime_logs.php?id=${selectedLogForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endTime: currentEditingEndTime }), // Send only the endTime
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorData;
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json().catch(() => ({ message: 'Failed to parse JSON error response from server.' }));
        } else {
          const textError = await response.text().catch(() => 'Unknown server error, non-JSON response from server.');
          errorData = { message: `Server error updating end time (non-JSON): ${textError.substring(0, 200)}... Contact backend admin.` };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      // const updatedLog = await response.json(); // Assuming backend returns the updated log
      
      toast({ title: "Success", description: `End time updated for unit ${selectedLogForEdit.unitId} on the server.` });
      
      loadDowntimeLogs(); // Refresh the list
      setIsEndTimeModalOpen(false);
      setSelectedLogForEdit(null);

    } catch (error) {
        console.error("Error updating end time on server:", error);
        toast({ title: "Update Error", description: (error instanceof Error) ? error.message : "Could not update end time on the server.", variant: "destructive" });
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
            <CardDescription>List of all recorded forklift downtime incidents from the server. Set end times to mark repairs as complete.</CardDescription>
          </div>
          <Button onClick={loadDowntimeLogs} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" /> {isLoading ? "Refreshing..." : "Refresh Logs"}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-4">Loading downtime logs from server...</p>
          ) : downtimeLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No downtime logs recorded on the server yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit ID</TableHead>
                  <TableHead className="min-w-[150px]">Reason</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Logged At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-right">
                      {!log.endTime ? (
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditEndTimeModal(log)}>
                          <Edit className="mr-2 h-4 w-4" /> Set End Time
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                           <CheckSquare className="mr-1 h-4 w-4"/> Completed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEndTimeModalOpen} onOpenChange={setIsEndTimeModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Downtime End Time for Unit {selectedLogForEdit?.unitId}</DialogTitle>
            <DialogDescription>
              Mark the forklift as repaired and record when it became operational. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTimeInputModal" className="text-right col-span-1">
                End Time
              </Label>
              <Input
                id="endTimeInputModal"
                type="datetime-local"
                value={currentEditingEndTime}
                onChange={(e) => setCurrentEditingEndTime(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveEndTime}>Save End Time</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

