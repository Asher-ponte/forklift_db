
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarCheck, CheckSquare, Filter, ListFilter, Loader2, PlusCircle, RefreshCw, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { MheUnit, StoredPmsTaskMaster, StoredPmsScheduleEntry, PmsScheduleDisplayEntry } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, addDays, addWeeks, addMonths, subDays, isPast } from 'date-fns';

// --- LocalStorage Keys ---
const MHE_UNITS_KEY = 'forkliftMheUnits';
const PMS_TASK_MASTER_KEY = 'forkliftPmsTaskMaster';
const PMS_SCHEDULE_ENTRIES_KEY = 'forkliftPmsScheduleEntries';

// --- Helper functions for localStorage ---
const getFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const item = localStorage.getItem(key);
  if (item) {
    try { return JSON.parse(item) as T; }
    catch (e) { console.warn(`Error parsing localStorage item ${key}:`, e); return defaultValue; }
  }
  return defaultValue;
};

const saveToLocalStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error(`Error saving to localStorage item ${key}:`, e); }
};

const MOCK_PMS_TASK_MASTERS: StoredPmsTaskMaster[] = [
  { id: uuidv4(), name: 'Daily Pre-Operational Check', description: 'Visual inspection, fluid checks, safety features.', frequency_unit: 'days', frequency_value: 1, category: 'General Safety', is_active: true, estimated_duration_minutes: 15 },
  { id: uuidv4(), name: 'Weekly Lubrication', description: 'Lubricate key moving parts as per manual.', frequency_unit: 'weeks', frequency_value: 1, category: 'Mechanical', is_active: true, estimated_duration_minutes: 30 },
  { id: uuidv4(), name: 'Monthly Hydraulic System Check', description: 'Inspect hoses, connections, and fluid levels. Check for leaks.', frequency_unit: 'months', frequency_value: 1, category: 'Hydraulics', is_active: true, estimated_duration_minutes: 60 },
  { id: uuidv4(), name: 'Engine Oil & Filter Change (ICE)', description: 'Change engine oil and filter for Internal Combustion Engine models.', frequency_unit: 'operating_hours', frequency_value: 250, category: 'Engine', is_active: true, estimated_duration_minutes: 90 },
  { id: uuidv4(), name: 'Battery Watering & Check (Electric)', description: 'Check and top-up battery water levels, clean terminals.', frequency_unit: 'weeks', frequency_value: 1, category: 'Electrical', is_active: true, estimated_duration_minutes: 45 },
];

export default function PmsSchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [mheUnits, setMheUnits] = useState<MheUnit[]>([]);
  const [taskMasters, setTaskMasters] = useState<StoredPmsTaskMaster[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<StoredPmsScheduleEntry[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedEntryForCompletion, setSelectedEntryForCompletion] = useState<PmsScheduleDisplayEntry | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionDate, setCompletionDate] = useState('');

  const [filterMheId, setFilterMheId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDueDateStart, setFilterDueDateStart] = useState<string>('');
  const [filterDueDateEnd, setFilterDueDateEnd] = useState<string>('');

  const initializeMockData = useCallback(() => {
    const storedTasks = getFromLocalStorage<StoredPmsTaskMaster[]>(PMS_TASK_MASTER_KEY, []);
    if (storedTasks.length === 0) {
      saveToLocalStorage(PMS_TASK_MASTER_KEY, MOCK_PMS_TASK_MASTERS);
    }
    // For schedule entries, we might generate some based on MHE units and tasks if empty.
    // For now, just ensure master tasks are there. Schedules can be added manually or via a setup process later.
  }, []);


  const loadPmsData = useCallback(async () => {
    setIsLoading(true);
    initializeMockData(); // Ensure mock master tasks are present

    try {
      const fetchedMheUnits = getFromLocalStorage<MheUnit[]>(MHE_UNITS_KEY, []);
      const fetchedTaskMasters = getFromLocalStorage<StoredPmsTaskMaster[]>(PMS_TASK_MASTER_KEY, []);
      const fetchedScheduleEntries = getFromLocalStorage<StoredPmsScheduleEntry[]>(PMS_SCHEDULE_ENTRIES_KEY, []);
      
      setMheUnits(fetchedMheUnits);
      setTaskMasters(fetchedTaskMasters);
      
      // Update status for overdue tasks
      const today = new Date();
      today.setHours(0,0,0,0); 
      const updatedEntries = fetchedScheduleEntries.map(entry => {
        if (entry.status === 'Pending' && parseISO(entry.due_date) < today) {
          return { ...entry, status: 'Overdue' as 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Skipped' };
        }
        return entry;
      });
      setScheduleEntries(updatedEntries);
      saveToLocalStorage(PMS_SCHEDULE_ENTRIES_KEY, updatedEntries); // Save updated statuses

      toast({ title: "PMS Data Loaded", description: "Fetched MHEs, Task Masters, and Schedule Entries.", duration: 2000});
    } catch (error) {
      toast({ title: "Error Loading PMS Data", description: "Could not load data from local storage.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, initializeMockData]);

  useEffect(() => {
    loadPmsData();
  }, [loadPmsData]);

  const displayedScheduleEntries = useMemo(() => {
    return scheduleEntries
      .map(entry => {
        const mheUnit = mheUnits.find(mhe => mhe.id === entry.mhe_unit_id);
        const taskMaster = taskMasters.find(task => task.id === entry.pms_task_master_id);
        if (!mheUnit || !taskMaster) return null;

        let frequencyDisplay = '';
        if (taskMaster.frequency_unit === 'operating_hours') {
          frequencyDisplay = `Every ${taskMaster.frequency_value} operating hours`;
        } else {
          frequencyDisplay = `Every ${taskMaster.frequency_value} ${taskMaster.frequency_unit}`;
        }
        
        return {
          ...entry,
          mhe_unit_code: mheUnit.unit_code,
          mhe_unit_name: mheUnit.name,
          task_name: taskMaster.name,
          task_description: taskMaster.description,
          task_category: taskMaster.category,
          task_frequency_display: frequencyDisplay,
        };
      })
      .filter((entry): entry is PmsScheduleDisplayEntry => entry !== null)
      .filter(entry => {
        const mheMatch = filterMheId ? entry.mhe_unit_id === filterMheId : true;
        const statusMatch = filterStatus ? entry.status === filterStatus : true;
        let dateMatch = true;
        if (filterDueDateStart || filterDueDateEnd) {
            const dueDate = parseISO(entry.due_date);
            if(filterDueDateStart && dueDate < parseISO(filterDueDateStart)) dateMatch = false;
            if(filterDueDateEnd && dueDate > parseISO(filterDueDateEnd)) dateMatch = false;
        }
        return mheMatch && statusMatch && dateMatch;
      })
      .sort((a, b) => parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime());
  }, [scheduleEntries, mheUnits, taskMasters, filterMheId, filterStatus, filterDueDateStart, filterDueDateEnd]);

  const handleOpenCompleteModal = (entry: PmsScheduleDisplayEntry) => {
    setSelectedEntryForCompletion(entry);
    setCompletionNotes(entry.notes || '');
    setCompletionDate(format(new Date(), 'yyyy-MM-dd'));
    setIsCompleteModalOpen(true);
  };

  const handleMarkAsComplete = () => {
    if (!selectedEntryForCompletion || !user) return;

    const updatedEntries = scheduleEntries.map(entry =>
      entry.id === selectedEntryForCompletion.id
        ? {
            ...entry,
            status: 'Completed' as 'Completed',
            completion_date: parseISO(completionDate).toISOString(),
            notes: completionNotes,
            serviced_by_user_id: user.id,
            serviced_by_username: user.username,
          }
        : entry
    );
    saveToLocalStorage(PMS_SCHEDULE_ENTRIES_KEY, updatedEntries);
    setScheduleEntries(updatedEntries);
    toast({ title: "Task Completed", description: `${selectedEntryForCompletion.task_name} for ${selectedEntryForCompletion.mhe_unit_code} marked as complete.` });
    
    // Optional: Generate next due date (simplified example)
    const completedTaskMaster = taskMasters.find(tm => tm.id === selectedEntryForCompletion.pms_task_master_id);
    if (completedTaskMaster && completedTaskMaster.frequency_unit !== 'operating_hours') {
      let nextDueDate: Date;
      const currentCompletionDate = parseISO(completionDate);
      switch(completedTaskMaster.frequency_unit) {
        case 'days': nextDueDate = addDays(currentCompletionDate, completedTaskMaster.frequency_value); break;
        case 'weeks': nextDueDate = addWeeks(currentCompletionDate, completedTaskMaster.frequency_value); break;
        case 'months': nextDueDate = addMonths(currentCompletionDate, completedTaskMaster.frequency_value); break;
        default: nextDueDate = addDays(currentCompletionDate, 30); // fallback
      }
      const newScheduleEntry: StoredPmsScheduleEntry = {
        id: uuidv4(),
        mhe_unit_id: selectedEntryForCompletion.mhe_unit_id,
        pms_task_master_id: selectedEntryForCompletion.pms_task_master_id,
        due_date: format(nextDueDate, 'yyyy-MM-dd'),
        status: 'Pending',
      };
      const allEntries = getFromLocalStorage<StoredPmsScheduleEntry[]>(PMS_SCHEDULE_ENTRIES_KEY, []);
      allEntries.push(newScheduleEntry);
      saveToLocalStorage(PMS_SCHEDULE_ENTRIES_KEY, allEntries);
      loadPmsData(); // Reload to show the new entry and re-evaluate statuses
      toast({title: "Next Task Scheduled", description: `Next ${completedTaskMaster.name} scheduled for ${format(nextDueDate, 'P')}.`});
    }

    setIsCompleteModalOpen(false);
    setSelectedEntryForCompletion(null);
    setCompletionNotes('');
  };
  
  const getStatusBadgeVariant = (status: PmsScheduleDisplayEntry['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Completed': return 'default'; // Green like / primary
      case 'Pending': return 'secondary';
      case 'Overdue': return 'destructive';
      case 'In Progress': return 'outline'; // Yellowish/Orange (accent) - needs theme adjustment or custom class
      case 'Skipped': return 'outline';
      default: return 'secondary';
    }
  };
  
  const getStatusBadgeColor = (status: PmsScheduleDisplayEntry['status']): string => {
     switch (status) {
      case 'Completed': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'Pending': return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'Overdue': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'In Progress': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Skipped': return 'bg-gray-400 hover:bg-gray-500 text-black';
      default: return '';
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <CalendarCheck className="mr-3 h-8 w-8 text-primary" />
            Preventive Maintenance Schedule
          </CardTitle>
          <CardDescription>
            View and manage upcoming and overdue maintenance tasks for MHE Units. Data is from local storage.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-xl flex items-center"><ListFilter className="mr-2 h-5 w-5 text-primary"/>Filters</CardTitle>
             <Button onClick={loadPmsData} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" /> {isLoading ? "Refreshing..." : "Refresh Data"}
              </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <Label htmlFor="filterMhe">MHE Unit</Label>
                <Select value={filterMheId} onValueChange={setFilterMheId}>
                    <SelectTrigger id="filterMhe"><SelectValue placeholder="All MHEs" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">All MHEs</SelectItem>
                        {mheUnits.map(mhe => <SelectItem key={mhe.id} value={mhe.id}>{mhe.unit_code} - {mhe.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="filterStatus">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="filterStatus"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">All Statuses</SelectItem>
                        {['Pending', 'In Progress', 'Completed', 'Overdue', 'Skipped'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <div>
                <Label htmlFor="filterDueDateStart">Due Date From</Label>
                <Input type="date" id="filterDueDateStart" value={filterDueDateStart} onChange={e => setFilterDueDateStart(e.target.value)} />
            </div>
            <div>
                <Label htmlFor="filterDueDateEnd">Due Date To</Label>
                <Input type="date" id="filterDueDateEnd" value={filterDueDateEnd} onChange={e => setFilterDueDateEnd(e.target.value)} />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-xl">Scheduled Tasks</CardTitle>
           {/* Placeholder for Add New Schedule Button */}
          <Button variant="outline" disabled><PlusCircle className="mr-2 h-4 w-4"/> Add New Schedule (Future)</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : displayedScheduleEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No PMS entries found matching criteria, or no MHE units/tasks configured.</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MHE Unit</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedScheduleEntries.map((entry) => (
                  <TableRow key={entry.id} className={entry.status === 'Overdue' ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                    <TableCell>
                        <div>{entry.mhe_unit_code}</div>
                        <div className="text-xs text-muted-foreground">{entry.mhe_unit_name}</div>
                    </TableCell>
                    <TableCell>{entry.task_name}</TableCell>
                    <TableCell>{entry.task_category || 'N/A'}</TableCell>
                    <TableCell>{format(parseISO(entry.due_date), 'PP')}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(entry.status)} variant={getStatusBadgeVariant(entry.status)}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.task_frequency_display}</TableCell>
                    <TableCell className="text-right">
                      {entry.status !== 'Completed' && entry.status !== 'Skipped' && (
                        <Button variant="outline" size="sm" onClick={() => handleOpenCompleteModal(entry)}>
                          <CheckSquare className="mr-1 h-4 w-4" /> Mark Action
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Placeholder for Managing Master PMS Tasks */}
      <Card>
        <CardHeader>
            <CardTitle className="text-xl flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary"/>Manage Master PMS Tasks</CardTitle>
            <CardDescription>Define standard preventive maintenance tasks and their frequencies. (Future Implementation)</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">This section will allow supervisors to add, edit, and manage the master list of PMS tasks that can be scheduled for MHE units.</p>
            {/* <Button variant="outline" disabled><PlusCircle className="mr-2 h-4 w-4"/> Add Master Task (Future)</Button> */}
        </CardContent>
      </Card>


      {/* Complete Task Modal */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete PMS Task: {selectedEntryForCompletion?.task_name}</DialogTitle>
            <DialogDescription>
              For MHE: {selectedEntryForCompletion?.mhe_unit_code} ({selectedEntryForCompletion?.mhe_unit_name}) <br/>
              Due: {selectedEntryForCompletion ? format(parseISO(selectedEntryForCompletion.due_date), 'PP') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
                <Label htmlFor="completionDate">Completion Date</Label>
                <Input type="date" id="completionDate" value={completionDate} onChange={e => setCompletionDate(e.target.value)} className="mt-1"/>
            </div>
            <div>
              <Label htmlFor="completionNotes">Notes (Optional)</Label>
              <Textarea
                id="completionNotes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about the service performed..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleMarkAsComplete} disabled={!completionDate}>Confirm Completion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
