
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CalendarCheck, CheckSquare, Filter, ListFilter, Loader2, PlusCircle, RefreshCw, Settings2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { MheUnit, StoredPmsTaskMaster, StoredPmsScheduleEntry, PmsScheduleDisplayEntry } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, addDays, addWeeks, addMonths, isValid } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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

const ALL_MHES_SELECT_VALUE = "__ALL_MHES__";
const ALL_STATUS_SELECT_VALUE = "__ALL_STATUS__";

// --- Zod Schemas for Forms ---
const pmsTaskMasterSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional().nullable(),
  frequency_unit: z.enum(['days', 'weeks', 'months', 'operating_hours']),
  frequency_value: z.coerce.number().min(1, "Frequency value must be at least 1"),
  category: z.string().optional().nullable(),
  estimated_duration_minutes: z.coerce.number().optional().nullable(),
  is_active: z.boolean().default(true),
});
type PmsTaskMasterFormData = z.infer<typeof pmsTaskMasterSchema>;

const pmsScheduleEntrySchema = z.object({
  mhe_unit_id: z.string().min(1, "MHE Unit is required"),
  pms_task_master_id: z.string().min(1, "PMS Task is required"),
  due_date: z.string().refine((val) => {
    try {
      return isValid(parseISO(val));
    } catch {
      return false;
    }
  }, { message: "Valid due date is required" }),
});
type PmsScheduleEntryFormData = z.infer<typeof pmsScheduleEntrySchema>;


export default function PmsSchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [mheUnits, setMheUnits] = useState<MheUnit[]>([]);
  const [taskMasters, setTaskMasters] = useState<StoredPmsTaskMaster[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<StoredPmsScheduleEntry[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState({ mhe: true, tasks: true, schedules: true });
  
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isAddMasterTaskModalOpen, setIsAddMasterTaskModalOpen] = useState(false);
  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);

  const [selectedEntryForCompletion, setSelectedEntryForCompletion] = useState<PmsScheduleDisplayEntry | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionDate, setCompletionDate] = useState('');

  const [filterMheId, setFilterMheId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDueDateStart, setFilterDueDateStart] = useState<string>('');
  const [filterDueDateEnd, setFilterDueDateEnd] = useState<string>('');

  const { control: controlMasterTask, register: registerMasterTask, handleSubmit: handleSubmitMasterTask, reset: resetMasterTaskForm, formState: { errors: masterTaskErrors } } = useForm<PmsTaskMasterFormData>({
    resolver: zodResolver(pmsTaskMasterSchema), defaultValues: { is_active: true, frequency_unit: 'days' }
  });
  const { control: controlScheduleEntry, handleSubmit: handleSubmitScheduleEntry, reset: resetScheduleEntryForm, formState: { errors: scheduleEntryErrors } } = useForm<PmsScheduleEntryFormData>({
    resolver: zodResolver(pmsScheduleEntrySchema),
  });


  const initializeMockData = useCallback(() => {
    const storedTasks = getFromLocalStorage<StoredPmsTaskMaster[]>(PMS_TASK_MASTER_KEY, []);
    if (storedTasks.length === 0) {
      saveToLocalStorage(PMS_TASK_MASTER_KEY, MOCK_PMS_TASK_MASTERS);
    }
  }, []);

  const fetchMheUnitsCallback = useCallback(async () => {
    setIsDataLoading(prev => ({ ...prev, mhe: true }));
    try {
      const fetchedMheUnits = getFromLocalStorage<MheUnit[]>(MHE_UNITS_KEY, []);
      setMheUnits(fetchedMheUnits);
    } catch (error) {
      toast({ title: "Error Loading MHE Units", variant: "destructive" });
    } finally {
      setIsDataLoading(prev => ({ ...prev, mhe: false }));
    }
  }, [toast]);
  
  const fetchTaskMastersCallback = useCallback(async () => {
    setIsDataLoading(prev => ({ ...prev, tasks: true }));
    initializeMockData(); 
    try {
      const fetchedTaskMasters = getFromLocalStorage<StoredPmsTaskMaster[]>(PMS_TASK_MASTER_KEY, []);
      setTaskMasters(fetchedTaskMasters);
    } catch (error) {
      toast({ title: "Error Loading Task Masters", variant: "destructive" });
    } finally {
      setIsDataLoading(prev => ({ ...prev, tasks: false }));
    }
  }, [toast, initializeMockData]);

  const fetchScheduleEntriesCallback = useCallback(async () => {
    setIsDataLoading(prev => ({ ...prev, schedules: true }));
    try {
      const fetchedScheduleEntries = getFromLocalStorage<StoredPmsScheduleEntry[]>(PMS_SCHEDULE_ENTRIES_KEY, []);
      const today = new Date();
      today.setHours(0,0,0,0); 
      const updatedEntries = fetchedScheduleEntries.map(entry => {
        try {
          if (entry.status === 'Pending' && parseISO(entry.due_date) < today) {
            return { ...entry, status: 'Overdue' as 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Skipped' };
          }
        } catch(e){ /* Ignore invalid date format for status update */ }
        return entry;
      });
      setScheduleEntries(updatedEntries);
      saveToLocalStorage(PMS_SCHEDULE_ENTRIES_KEY, updatedEntries); // Save updated statuses
    } catch (error) {
      toast({ title: "Error Loading Schedule Entries", variant: "destructive" });
    } finally {
      setIsDataLoading(prev => ({ ...prev, schedules: false }));
    }
  }, [toast]);


  useEffect(() => {
    const loadAllData = async () => {
        setIsLoading(true);
        await Promise.all([
            fetchMheUnitsCallback(),
            fetchTaskMastersCallback(),
            fetchScheduleEntriesCallback()
        ]);
        toast({ title: "PMS Data Loaded", description: "Fetched MHEs, Task Masters, and Schedule Entries.", duration: 2000});
        setIsLoading(false);
    };
    loadAllData();
  }, [fetchMheUnitsCallback, fetchTaskMastersCallback, fetchScheduleEntriesCallback, toast]);


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
            try {
              const dueDate = parseISO(entry.due_date);
              if (filterDueDateStart && dueDate < parseISO(filterDueDateStart)) dateMatch = false;
              if (filterDueDateEnd) {
                  const endDate = parseISO(filterDueDateEnd);
                  endDate.setHours(23, 59, 59, 999);
                  if (dueDate > endDate) dateMatch = false;
              }
            } catch (e) {
              dateMatch = false; 
            }
        }
        return mheMatch && statusMatch && dateMatch;
      })
      .sort((a, b) => {
        try {
            return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
        } catch (e) { return 0; }
      });
  }, [scheduleEntries, mheUnits, taskMasters, filterMheId, filterStatus, filterDueDateStart, filterDueDateEnd]);

  const handleOpenCompleteModal = (entry: PmsScheduleDisplayEntry) => {
    setSelectedEntryForCompletion(entry);
    setCompletionNotes(entry.notes || '');
    setCompletionDate(format(new Date(), 'yyyy-MM-dd'));
    setIsCompleteModalOpen(true);
  };

  const handleMarkAsComplete = () => {
    if (!selectedEntryForCompletion || !user || !completionDate) {
      toast({title: "Error", description: "Completion date is required.", variant: "destructive"});
      return;
    }

    let parsedCompletionDate;
    try {
      parsedCompletionDate = parseISO(completionDate);
      if(!isValid(parsedCompletionDate)){
        toast({title: "Error", description: "Invalid completion date format.", variant: "destructive"});
        return;
      }
    } catch (e){
      toast({title: "Error", description: "Invalid completion date format.", variant: "destructive"});
      return;
    }


    const updatedEntries = scheduleEntries.map(entry =>
      entry.id === selectedEntryForCompletion.id
        ? {
            ...entry,
            status: 'Completed' as 'Completed',
            completion_date: parsedCompletionDate.toISOString(),
            notes: completionNotes,
            serviced_by_user_id: user.id,
            serviced_by_username: user.username,
          }
        : entry
    );
    saveToLocalStorage(PMS_SCHEDULE_ENTRIES_KEY, updatedEntries);
    
    toast({ title: "Task Completed", description: `${selectedEntryForCompletion.task_name} for ${selectedEntryForCompletion.mhe_unit_code} marked as complete.` });
    
    const completedTaskMaster = taskMasters.find(tm => tm.id === selectedEntryForCompletion.pms_task_master_id);
    if (completedTaskMaster && completedTaskMaster.frequency_unit !== 'operating_hours' && completedTaskMaster.is_active) {
      let nextDueDate: Date;
      const currentCompletionDate = parsedCompletionDate;
      switch(completedTaskMaster.frequency_unit) {
        case 'days': nextDueDate = addDays(currentCompletionDate, completedTaskMaster.frequency_value); break;
        case 'weeks': nextDueDate = addWeeks(currentCompletionDate, completedTaskMaster.frequency_value); break;
        case 'months': nextDueDate = addMonths(currentCompletionDate, completedTaskMaster.frequency_value); break;
        default: nextDueDate = addDays(currentCompletionDate, 30); 
      }
      const newScheduleEntry: StoredPmsScheduleEntry = {
        id: uuidv4(),
        mhe_unit_id: selectedEntryForCompletion.mhe_unit_id,
        pms_task_master_id: selectedEntryForCompletion.pms_task_master_id,
        due_date: format(nextDueDate, 'yyyy-MM-dd'),
        status: 'Pending',
      };
      const allEntries = getFromLocalStorage<StoredPmsScheduleEntry[]>(PMS_SCHEDULE_ENTRIES_KEY, []); // get fresh copy for update
      allEntries.push(newScheduleEntry);
      saveToLocalStorage(PMS_SCHEDULE_ENTRIES_KEY, allEntries);
      
      toast({title: "Next Task Scheduled", description: `Next ${completedTaskMaster.name} for ${selectedEntryForCompletion.mhe_unit_code} scheduled for ${format(nextDueDate, 'P')}.`});
    }
    fetchScheduleEntriesCallback(); // This will re-fetch and include the new entry and updated old one
    setIsCompleteModalOpen(false);
    setSelectedEntryForCompletion(null);
    setCompletionNotes('');
  };

  const onAddMasterTask = async (data: PmsTaskMasterFormData) => {
    try {
      const currentMasterTasks = getFromLocalStorage<StoredPmsTaskMaster[]>(PMS_TASK_MASTER_KEY, []);
      if (currentMasterTasks.some(task => task.name.toLowerCase() === data.name.toLowerCase())) {
        toast({ title: "Error Adding Task", description: "A master task with this name already exists.", variant: "destructive" });
        return;
      }
      const newTaskMaster: StoredPmsTaskMaster = { id: uuidv4(), ...data, estimated_duration_minutes: data.estimated_duration_minutes || null };
      currentMasterTasks.push(newTaskMaster);
      saveToLocalStorage(PMS_TASK_MASTER_KEY, currentMasterTasks);
      
      toast({ title: "Success", description: "Master PMS Task added locally." });
      fetchTaskMastersCallback(); 
      resetMasterTaskForm({is_active: true, frequency_unit: 'days', frequency_value:1, name: '', description: '', category: '', estimated_duration_minutes: undefined });
      setIsAddMasterTaskModalOpen(false);
    } catch (error) {
      toast({ title: "Error Adding Master Task", description: (error instanceof Error) ? error.message : "Could not add master task.", variant: "destructive" });
    }
  };
  
  const onAddScheduleEntry = async (data: PmsScheduleEntryFormData) => {
    try {
      let formattedDueDate;
      try {
        formattedDueDate = format(parseISO(data.due_date), 'yyyy-MM-dd');
      } catch {
        toast({ title: "Error Adding Schedule", description: "Invalid due date format.", variant: "destructive"});
        return;
      }

      const newSchedule: StoredPmsScheduleEntry = { 
        id: uuidv4(), 
        ...data, 
        status: 'Pending',
        due_date: formattedDueDate
      };
      const currentScheduleEntries = getFromLocalStorage<StoredPmsScheduleEntry[]>(PMS_SCHEDULE_ENTRIES_KEY, []);
      currentScheduleEntries.push(newSchedule);
      saveToLocalStorage(PMS_SCHEDULE_ENTRIES_KEY, currentScheduleEntries);
      
      toast({ title: "Success", description: "New PMS schedule entry added locally." });
      fetchScheduleEntriesCallback(); 
      resetScheduleEntryForm({mhe_unit_id: '', pms_task_master_id: '', due_date: ''});
      setIsAddScheduleModalOpen(false);
    } catch (error) {
      toast({ title: "Error Adding Schedule", description: (error instanceof Error) ? error.message : "Could not add schedule entry.", variant: "destructive" });
    }
  };
  
  const getStatusBadgeVariant = (status: PmsScheduleDisplayEntry['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Completed': return 'default'; 
      case 'Pending': return 'secondary';
      case 'Overdue': return 'destructive';
      case 'In Progress': return 'outline'; 
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

  if (isLoading && (isDataLoading.mhe || isDataLoading.tasks || isDataLoading.schedules)) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading PMS data...</p>
      </div>
    );
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
            View, manage, and schedule maintenance tasks for MHE Units. Data is from local storage.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-xl flex items-center"><ListFilter className="mr-2 h-5 w-5 text-primary"/>Filters</CardTitle>
             <Button onClick={() => {
                fetchMheUnitsCallback();
                fetchTaskMastersCallback();
                fetchScheduleEntriesCallback();
             }} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" /> {isLoading ? "Refreshing..." : "Refresh Data"}
              </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <Label htmlFor="filterMhe">MHE Unit</Label>
                <Select 
                  value={filterMheId || ALL_MHES_SELECT_VALUE} 
                  onValueChange={(selectedValue) => setFilterMheId(selectedValue === ALL_MHES_SELECT_VALUE ? '' : selectedValue)}
                  disabled={mheUnits.length === 0}
                >
                    <SelectTrigger id="filterMhe"><SelectValue placeholder={mheUnits.length === 0 ? "No MHEs available" : "All MHEs"} /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_MHES_SELECT_VALUE}>All MHEs</SelectItem>
                        {mheUnits.map(mhe => <SelectItem key={mhe.id} value={mhe.id}>{mhe.unit_code} - {mhe.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="filterStatus">Status</Label>
                <Select 
                  value={filterStatus || ALL_STATUS_SELECT_VALUE} 
                  onValueChange={(selectedValue) => setFilterStatus(selectedValue === ALL_STATUS_SELECT_VALUE ? '' : selectedValue)}
                >
                    <SelectTrigger id="filterStatus"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_STATUS_SELECT_VALUE}>All Statuses</SelectItem>
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
          <Dialog open={isAddScheduleModalOpen} onOpenChange={setIsAddScheduleModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => { resetScheduleEntryForm({mhe_unit_id: '', pms_task_master_id: '', due_date: ''}); setIsAddScheduleModalOpen(true); }} disabled={mheUnits.length === 0 || taskMasters.filter(tm => tm.is_active).length === 0}>
                  <PlusCircle className="mr-2 h-4 w-4"/> Add New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Add New PMS Schedule Entry</DialogTitle>
                <DialogDescription>Select MHE, Task and Due Date.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitScheduleEntry(onAddScheduleEntry)} className="space-y-4 py-4">
                <div>
                  <Label htmlFor="schedMheUnit">MHE Unit</Label>
                  <Controller
                    name="mhe_unit_id"
                    control={controlScheduleEntry}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="schedMheUnit" className="mt-1">
                          <SelectValue placeholder="Select MHE Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {mheUnits.map(mhe => <SelectItem key={mhe.id} value={mhe.id}>{mhe.unit_code} - {mhe.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {scheduleEntryErrors.mhe_unit_id && <p className="text-sm text-destructive mt-1">{scheduleEntryErrors.mhe_unit_id.message}</p>}
                </div>
                <div>
                  <Label htmlFor="schedPmsTask">PMS Task</Label>
                   <Controller
                    name="pms_task_master_id"
                    control={controlScheduleEntry}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="schedPmsTask" className="mt-1">
                          <SelectValue placeholder="Select PMS Task" />
                        </SelectTrigger>
                        <SelectContent>
                          {taskMasters.filter(tm => tm.is_active).map(task => <SelectItem key={task.id} value={task.id}>{task.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {scheduleEntryErrors.pms_task_master_id && <p className="text-sm text-destructive mt-1">{scheduleEntryErrors.pms_task_master_id.message}</p>}
                </div>
                <div>
                  <Label htmlFor="schedDueDate">Due Date</Label>
                  <Controller
                    name="due_date"
                    control={controlScheduleEntry}
                    render={({ field }) => (
                      <Input type="date" id="schedDueDate" {...field} className="mt-1" />
                    )}
                  />
                  {scheduleEntryErrors.due_date && <p className="text-sm text-destructive mt-1">{scheduleEntryErrors.due_date.message}</p>}
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit">Save Schedule</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isDataLoading.schedules || isDataLoading.mhe || isDataLoading.tasks ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : mheUnits.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No MHE units defined. Please add MHE units in Data Management first.</p>
          ) : taskMasters.filter(tm => tm.is_active).length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No active Master PMS tasks defined. Please add master tasks below.</p>
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
                    <TableCell>{entry.due_date ? format(parseISO(entry.due_date), 'PP') : 'N/A'}</TableCell>
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
      
      <Card>
        <CardHeader  className="flex flex-row justify-between items-center">
            <div className="space-y-1.5">
                <CardTitle className="text-xl flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary"/>Manage Master PMS Tasks</CardTitle>
                <CardDescription>Define standard preventive maintenance tasks and their frequencies.</CardDescription>
            </div>
             <Dialog open={isAddMasterTaskModalOpen} onOpenChange={setIsAddMasterTaskModalOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => { resetMasterTaskForm({is_active: true, frequency_unit: 'days', frequency_value:1, name: '', description: '', category: '', estimated_duration_minutes: undefined }); setIsAddMasterTaskModalOpen(true);}}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Master Task
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Master PMS Task</DialogTitle>
                        <DialogDescription>Fill in details for a reusable maintenance task.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitMasterTask(onAddMasterTask)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div>
                            <Label htmlFor="masterTaskName">Task Name</Label>
                            <Input id="masterTaskName" {...registerMasterTask("name")} className="mt-1"/>
                            {masterTaskErrors.name && <p className="text-sm text-destructive mt-1">{masterTaskErrors.name.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="masterTaskDesc">Description (Optional)</Label>
                            <Textarea id="masterTaskDesc" {...registerMasterTask("description")} className="mt-1"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="masterTaskFreqUnit">Frequency Unit</Label>
                                 <Controller
                                    name="frequency_unit"
                                    control={controlMasterTask}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value} >
                                            <SelectTrigger id="masterTaskFreqUnit" className="mt-1">
                                                <SelectValue placeholder="Select unit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="days">Days</SelectItem>
                                                <SelectItem value="weeks">Weeks</SelectItem>
                                                <SelectItem value="months">Months</SelectItem>
                                                <SelectItem value="operating_hours">Operating Hours</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {masterTaskErrors.frequency_unit && <p className="text-sm text-destructive mt-1">{masterTaskErrors.frequency_unit.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="masterTaskFreqVal">Frequency Value</Label>
                                <Input id="masterTaskFreqVal" type="number" {...registerMasterTask("frequency_value")} className="mt-1"/>
                                {masterTaskErrors.frequency_value && <p className="text-sm text-destructive mt-1">{masterTaskErrors.frequency_value.message}</p>}
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="masterTaskCategory">Category (Optional)</Label>
                            <Input id="masterTaskCategory" {...registerMasterTask("category")} className="mt-1"/>
                        </div>
                        <div>
                            <Label htmlFor="masterTaskDuration">Est. Duration (Minutes, Optional)</Label>
                            <Input id="masterTaskDuration" type="number" {...registerMasterTask("estimated_duration_minutes")} className="mt-1"/>
                        </div>
                         <div className="flex items-center space-x-2 pt-2">
                            <Controller
                                name="is_active"
                                control={controlMasterTask}
                                render={({ field }) => (
                                    <Switch id="masterTaskIsActive" checked={field.value} onCheckedChange={field.onChange} />
                                )}
                            />
                            <Label htmlFor="masterTaskIsActive" className="text-sm">Task is Active</Label>
                        </div>
                        <DialogFooter className="pt-4">
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit">Save Master Task</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            {isDataLoading.tasks ? (
                <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : taskMasters.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No Master PMS Tasks defined yet. Click "Add Master Task" to create one.</p>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Est. Duration</TableHead>
                                <TableHead>Active</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {taskMasters.map(task => (
                                <TableRow key={task.id}>
                                    <TableCell>{task.name}</TableCell>
                                    <TableCell>{task.frequency_value} {task.frequency_unit}</TableCell>
                                    <TableCell>{task.category || 'N/A'}</TableCell>
                                    <TableCell>{task.estimated_duration_minutes ? `${task.estimated_duration_minutes} min` : 'N/A'}</TableCell>
                                    <TableCell>{task.is_active ? 'Yes' : 'No'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
      </Card>


      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete PMS Task: {selectedEntryForCompletion?.task_name}</DialogTitle>
            <DialogDescription>
              For MHE: {selectedEntryForCompletion?.mhe_unit_code} ({selectedEntryForCompletion?.mhe_unit_name}) <br/>
              Due: {selectedEntryForCompletion?.due_date ? format(parseISO(selectedEntryForCompletion.due_date), 'PP') : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
                <Label htmlFor="completionDate">Completion Date</Label>
                <Input type="date" id="completionDate" value={completionDate} onChange={e => setCompletionDate(e.target.value)} className="mt-1"/>
                {!completionDate && <p className="text-sm text-destructive mt-1">Completion date is required.</p>}
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

    
