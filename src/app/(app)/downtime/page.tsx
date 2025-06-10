
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

const LOCAL_STORAGE_DOWNTIME_KEY = 'forkliftDowntimeLogs';

export default function DowntimePage() {
  const [downtimeLogs, setDowntimeLogs] = useState<StoredDowntimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEndTimeModalOpen, setIsEndTimeModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<StoredDowntimeLog | null>(null);
  const [currentEditingEndTime, setCurrentEditingEndTime] = useState('');
  const { toast } = useToast();

  const loadDowntimeLogs = useCallback(() => {
    setIsLoading(true);
    try {
      const storedLogsRaw = localStorage.getItem(LOCAL_STORAGE_DOWNTIME_KEY);
      let logs: StoredDowntimeLog[] = [];
      if (storedLogsRaw) {
        try {
          const parsedData = JSON.parse(storedLogsRaw);
          if (Array.isArray(parsedData)) {
            logs = parsedData;
          } else {
            console.warn("Downtime logs in localStorage was not an array, resetting.");
            localStorage.setItem(LOCAL_STORAGE_DOWNTIME_KEY, JSON.stringify([]));
          }
        } catch (parseError) {
          console.error("Error parsing downtime logs from localStorage:", parseError);
          localStorage.removeItem(LOCAL_STORAGE_DOWNTIME_KEY);
          toast({
            title: "Data Error",
            description: "Downtime log data was corrupted and has been cleared. Please refresh.",
            variant: "destructive",
          });
        }
      }

      const validLogs = logs.filter(log =>
        log && typeof log.id === 'string' && typeof log.unitId === 'string' &&
        typeof log.reason === 'string' && typeof log.startTime === 'string' &&
        typeof log.loggedAt === 'string' && (log.endTime === null || typeof log.endTime === 'string' || typeof log.endTime === 'undefined')
      );

      if (validLogs.length !== logs.length) {
        console.warn("Some downtime log entries were invalid and have been filtered out.");
      }

      validLogs.sort((a, b) => {
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
      console.error("An unexpected error occurred while loading or processing downtime logs:", error);
      setDowntimeLogs([]); // Reset to a safe state
      toast({
        title: "Loading Error",
        description: "An unexpected error occurred while loading downtime logs. Displaying empty list.",
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

  const handleSaveEndTime = () => {
    if (!selectedLogForEdit || !currentEditingEndTime) {
      toast({ title: "Error", description: "End time cannot be empty.", variant: "destructive" });
      return;
    }

    let logs: StoredDowntimeLog[] = [];
    try {
        const storedLogsRaw = localStorage.getItem(LOCAL_STORAGE_DOWNTIME_KEY);
        const parsedData = storedLogsRaw ? JSON.parse(storedLogsRaw) : [];
        if (Array.isArray(parsedData)) {
            logs = parsedData;
        } else {
             throw new Error("Stored downtime logs are not an array.");
        }
    } catch (error) {
        console.error("Error reading downtime logs for update:", error);
        toast({ title: "Error", description: "Could not read existing logs to update. Please refresh.", variant: "destructive" });
        return;
    }
    
    const updatedLogs = logs.map(log =>
      log.id === selectedLogForEdit.id
        ? { ...log, endTime: currentEditingEndTime }
        : log
    );

    localStorage.setItem(LOCAL_STORAGE_DOWNTIME_KEY, JSON.stringify(updatedLogs));
    toast({ title: "Success", description: `End time updated for unit ${selectedLogForEdit.unitId}.` });
    
    loadDowntimeLogs(); // Refresh the list
    setIsEndTimeModalOpen(false);
    setSelectedLogForEdit(null);
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
            <CardDescription>List of all recorded forklift downtime incidents. Set end times to mark repairs as complete.</CardDescription>
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
