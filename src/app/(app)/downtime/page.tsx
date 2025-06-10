
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
    const storedLogsRaw = localStorage.getItem(LOCAL_STORAGE_DOWNTIME_KEY);
    const logs: StoredDowntimeLog[] = storedLogsRaw ? JSON.parse(storedLogsRaw) : [];
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

  const handleOpenEditEndTimeModal = (log: StoredDowntimeLog) => {
    setSelectedLogForEdit(log);
    // If endTime is null or empty, provide a default or leave it empty for user input
    // For datetime-local, it expects "yyyy-MM-ddThh:mm"
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0,16);
    setCurrentEditingEndTime(log.endTime || localISOTime);
    setIsEndTimeModalOpen(true);
  };

  const handleSaveEndTime = () => {
    if (!selectedLogForEdit || !currentEditingEndTime) {
      toast({ title: "Error", description: "End time cannot be empty.", variant: "destructive" });
      return;
    }

    const storedLogsRaw = localStorage.getItem(LOCAL_STORAGE_DOWNTIME_KEY);
    let logs: StoredDowntimeLog[] = storedLogsRaw ? JSON.parse(storedLogsRaw) : [];
    
    logs = logs.map(log => 
      log.id === selectedLogForEdit.id 
        ? { ...log, endTime: currentEditingEndTime } 
        : log
    );

    localStorage.setItem(LOCAL_STORAGE_DOWNTIME_KEY, JSON.stringify(logs));
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

