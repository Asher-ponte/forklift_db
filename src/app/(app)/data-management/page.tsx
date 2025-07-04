
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, ListChecks, TruckIcon, Building, AlertTriangle, Loader2, Edit, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import * as apiService from '@/services/apiService';
import type { StoredInspectionReport, StoredDowntimeLog, StoredPmsScheduleEntry } from '@/lib/types';

// --- Data Types ---
interface Department {
  id: string;
  name: string;
  description?: string | null;
}

interface MheUnit {
  id: string;
  unit_code: string;
  name: string;
  department_id?: string | null;
  department_name?: string; 
  type?: string | null;
  status?: 'active' | 'inactive' | 'maintenance';
}

interface ChecklistMasterItem {
  id: string;
  qr_code_data?: string | null;
  part_name: string;
  description?: string | null;
  question: string;
  is_active?: boolean;
}

// --- Zod Schemas for Forms ---
const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  description: z.string().optional().nullable(),
});
type DepartmentFormData = z.infer<typeof departmentSchema>;

const NONE_SELECT_VALUE = "__NONE__"; 

const mheUnitSchema = z.object({
  unit_code: z.string().min(1, "MHE Unit Code is required"),
  name: z.string().min(1, "MHE Name is required"),
  department_id: z.string().nullable().optional(),
  type: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
});
type MheUnitFormData = z.infer<typeof mheUnitSchema>;

const checklistItemSchema = z.object({
  part_name: z.string().min(1, "Part name is required"),
  question: z.string().min(1, "Question is required"),
  qr_code_data: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});
type ChecklistItemFormData = z.infer<typeof checklistItemSchema>;


export default function DataManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [mheUnits, setMheUnits] = useState<MheUnit[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItemMasterItem[]>([]);
  
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingMheUnits, setIsLoadingMheUnits] = useState(true);
  const [isLoadingChecklistItems, setIsLoadingChecklistItems] = useState(true);

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isDeleteDeptConfirmOpen, setIsDeleteDeptConfirmOpen] = useState(false);
  const [departmentToDeleteId, setDepartmentToDeleteId] = useState<string | null>(null);

  const [isMheModalOpen, setIsMheModalOpen] = useState(false);
  const [editingMheUnit, setEditingMheUnit] = useState<MheUnit | null>(null);
  const [isDeleteMheConfirmOpen, setIsDeleteMheConfirmOpen] = useState(false);
  const [mheUnitToDeleteId, setMheUnitToDeleteId] = useState<string | null>(null);
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingChecklistItem, setEditingChecklistItem] = useState<ChecklistItemMasterItem | null>(null);
  const [isDeleteItemConfirmOpen, setIsDeleteItemConfirmOpen] = useState(false);
  const [checklistItemToDeleteId, setChecklistItemToDeleteId] = useState<string | null>(null);


  const { register: registerDept, handleSubmit: handleSubmitDept, reset: resetDeptForm, setValue: setDeptValue, formState: { errors: deptErrors } } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
  });
  const { control: controlMhe, register: registerMhe, handleSubmit: handleSubmitMhe, reset: resetMheForm, setValue: setMheValue, formState: { errors: mheErrors } } = useForm<MheUnitFormData>({
    resolver: zodResolver(mheUnitSchema),
  });
  const { control: controlItem, register: registerItem, handleSubmit: handleSubmitItem, reset: resetItemForm, setValue: setItemValue, formState: { errors: itemErrors } } = useForm<ChecklistItemFormData>({
    resolver: zodResolver(checklistItemSchema),
  });


  // --- Data Fetching Callbacks ---
  const fetchDepartments = useCallback(async () => {
    setIsLoadingDepartments(true);
    try {
      const fetchedDepartments = await apiService.fetchDepartments();
      setDepartments(fetchedDepartments);
    } catch (error) {
      toast({ title: "Error Fetching Departments", description: (error instanceof Error) ? error.message : "Could not load departments.", variant: "destructive" });
      setDepartments([]);
    } finally {
      setIsLoadingDepartments(false);
    }
  }, [toast]);

  const fetchMheUnits = useCallback(async () => {
    setIsLoadingMheUnits(true);
    try {
      const [fetchedMheUnits, currentDepartments] = await Promise.all([
        apiService.fetchMheUnits(),
        departments.length > 0 ? departments : apiService.fetchDepartments() // Fetch departments if not already loaded
      ]);
      
      const enhancedData = fetchedMheUnits.map(mhe => ({
        ...mhe,
        department_name: currentDepartments.find(d => d.id === mhe.department_id)?.name || 'N/A'
      }));
      setMheUnits(enhancedData);
      if(departments.length === 0 && currentDepartments.length > 0) {
        setDepartments(currentDepartments); // Cache if fetched now
      }
    } catch (error) {
      toast({ title: "Error Fetching MHE Units", description: (error instanceof Error) ? error.message : "Could not load MHE units.", variant: "destructive" });
      setMheUnits([]);
    } finally {
      setIsLoadingMheUnits(false);
    }
  }, [toast, departments]);

  const fetchChecklistItems = useCallback(async () => {
    setIsLoadingChecklistItems(true);
    try {
      const fetchedChecklistItems = await apiService.fetchChecklistItems();
      setChecklistItems(fetchedChecklistItems);
    } catch (error) {
      toast({ title: "Error Fetching Checklist Items", description: (error instanceof Error) ? error.message : "Could not load checklist items.", variant: "destructive" });
      setChecklistItems([]);
    } finally {
      setIsLoadingChecklistItems(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.role === 'supervisor') {
      fetchDepartments();
      fetchChecklistItems();
    }
  }, [user, fetchDepartments, fetchChecklistItems]);
  
  useEffect(() => {
    if (user?.role === 'supervisor' && !isLoadingDepartments && departments.length >= 0) {
         fetchMheUnits();
    }
  }, [user, fetchMheUnits, isLoadingDepartments, departments]);

  // --- Modal Openers ---
  const handleOpenAddDeptModal = () => {
    setEditingDepartment(null);
    resetDeptForm({ name: '', description: '' });
    setIsDeptModalOpen(true);
  };
  const handleOpenEditDeptModal = (dept: Department) => {
    setEditingDepartment(dept);
    setDeptValue("name", dept.name);
    setDeptValue("description", dept.description || '');
    setIsDeptModalOpen(true);
  };
  const handleOpenDeleteDeptDialog = (id: string) => {
    setDepartmentToDeleteId(id);
    setIsDeleteDeptConfirmOpen(true);
  };

  const handleOpenAddMheModal = () => {
    setEditingMheUnit(null);
    resetMheForm({ unit_code: '', name: '', department_id: null, type: '', status: 'active' });
    setIsMheModalOpen(true);
  };
  const handleOpenEditMheModal = (mhe: MheUnit) => {
    setEditingMheUnit(mhe);
    setMheValue("unit_code", mhe.unit_code);
    setMheValue("name", mhe.name);
    setMheValue("department_id", mhe.department_id || null);
    setMheValue("type", mhe.type || '');
    setMheValue("status", mhe.status || 'active');
    setIsMheModalOpen(true);
  };
  const handleOpenDeleteMheDialog = (id: string) => {
    setMheUnitToDeleteId(id);
    setIsDeleteMheConfirmOpen(true);
  };

  const handleOpenAddItemModal = () => {
    setEditingChecklistItem(null);
    resetItemForm({ part_name: '', question: '', qr_code_data: '', description: '', is_active: true });
    setIsItemModalOpen(true);
  };
  const handleOpenEditItemModal = (item: ChecklistMasterItem) => {
    setEditingChecklistItem(item);
    setItemValue("part_name", item.part_name);
    setItemValue("question", item.question);
    setItemValue("qr_code_data", item.qr_code_data || '');
    setItemValue("description", item.description || '');
    setItemValue("is_active", item.is_active !== false);
    setIsItemModalOpen(true);
  };
  const handleOpenDeleteItemDialog = (id: string) => {
    setChecklistItemToDeleteId(id);
    setIsDeleteItemConfirmOpen(true);
  };


  // --- Form Submission Handlers ---
  const onDepartmentSubmit = async (data: DepartmentFormData) => {
    try {
      if (editingDepartment) { // Edit
        if (departments.some(dept => dept.name.toLowerCase() === data.name.toLowerCase() && dept.id !== editingDepartment.id)) {
          toast({ title: "Error Editing Department", description: "Department name already exists.", variant: "destructive" }); return;
        }
        await apiService.updateDepartment(editingDepartment.id, data);
        toast({ title: "Success", description: "Department updated." });
      } else { // Add
        if (departments.some(dept => dept.name.toLowerCase() === data.name.toLowerCase())) {
          toast({ title: "Error Adding Department", description: "Department name already exists.", variant: "destructive" }); return;
        }
        await apiService.addDepartment(data);
        toast({ title: "Success", description: "Department added." });
      }
      fetchDepartments(); 
      fetchMheUnits(); 
      setIsDeptModalOpen(false);
      setEditingDepartment(null);
    } catch (error) {
      toast({ title: editingDepartment ? "Error Editing Department" : "Error Adding Department", description: (error instanceof Error) ? error.message : "Operation failed.", variant: "destructive" });
    }
  };

  const onMheUnitSubmit = async (data: MheUnitFormData) => {
    try {
      const payload = { ...data, department_id: data.department_id === NONE_SELECT_VALUE ? null : data.department_id };
      if (editingMheUnit) { // Edit
        if (mheUnits.some(mhe => mhe.unit_code.toLowerCase() === data.unit_code.toLowerCase() && mhe.id !== editingMheUnit.id)) {
          toast({ title: "Error Editing MHE Unit", description: "MHE Unit Code already exists.", variant: "destructive" }); return;
        }
        await apiService.updateMheUnit(editingMheUnit.id, payload);
        toast({ title: "Success", description: "MHE unit updated." });
      } else { // Add
        if (mheUnits.some(mhe => mhe.unit_code.toLowerCase() === data.unit_code.toLowerCase())) {
          toast({ title: "Error Adding MHE Unit", description: "MHE Unit Code already exists.", variant: "destructive" }); return;
        }
        await apiService.addMheUnit(payload);
        toast({ title: "Success", description: "MHE unit added." });
      }
      fetchMheUnits(); 
      setIsMheModalOpen(false);
      setEditingMheUnit(null);
    } catch (error) {
      toast({ title: editingMheUnit ? "Error Editing MHE Unit" : "Error Adding MHE Unit", description: (error instanceof Error) ? error.message : "Operation failed.", variant: "destructive" });
    }
  };

  const onChecklistItemSubmit = async (data: ChecklistItemFormData) => {
    try {
      if (editingChecklistItem) { // Edit
         if (checklistItems.some(item => item.part_name.toLowerCase() === data.part_name.toLowerCase() && item.id !== editingChecklistItem.id)) {
           toast({ title: "Error Editing Item", description: "Another item with this part name already exists.", variant: "destructive" }); return;
         }
        await apiService.updateChecklistItem(editingChecklistItem.id, data);
        toast({ title: "Success", description: "Checklist item updated." });
      } else { // Add
        if (checklistItems.some(item => item.part_name.toLowerCase() === data.part_name.toLowerCase())) {
           toast({ title: "Error Adding Item", description: "An item with this part name already exists.", variant: "destructive" }); return;
        }
        await apiService.addChecklistItem(data);
        toast({ title: "Success", description: "Checklist item added." });
      }
      fetchChecklistItems();
      setIsItemModalOpen(false);
      setEditingChecklistItem(null);
    } catch (error) {
      toast({ title: editingChecklistItem ? "Error Editing Checklist Item" : "Error Adding Checklist Item", description: (error instanceof Error) ? error.message : "Operation failed.", variant: "destructive" });
    }
  };

  // --- Delete Handlers ---
  const handleConfirmDeleteDepartment = async () => {
    if (!departmentToDeleteId) return;
    const deptToDelete = departments.find(d => d.id === departmentToDeleteId);
    try {
      await apiService.deleteDepartment(departmentToDeleteId);
      toast({ title: "Department Deleted", description: `Department "${deptToDelete?.name}" removed.` });
      
      const mheUnitsUsingDept = mheUnits.filter(mhe => mhe.department_id === departmentToDeleteId);
      if (mheUnitsUsingDept.length > 0) {
          toast({ title: "Warning", description: `${mheUnitsUsingDept.length} MHE unit(s) were assigned to the deleted department. Their department assignment needs review.`, duration: 5000, variant: "default" });
      }
      fetchDepartments();
      fetchMheUnits();
    } catch (error) {
      toast({ title: "Error Deleting Department", description: (error instanceof Error) ? error.message : "Operation failed.", variant: "destructive" });
    } finally {
      setIsDeleteDeptConfirmOpen(false);
      setDepartmentToDeleteId(null);
    }
  };

  const handleConfirmDeleteMheUnit = async () => {
    if (!mheUnitToDeleteId) return;
    const mheToDelete = mheUnits.find(mhe => mhe.id === mheUnitToDeleteId);
    try {
      await apiService.deleteMheUnit(mheUnitToDeleteId);
      toast({ title: "MHE Unit Deleted", description: `MHE Unit "${mheToDelete?.unit_code}" removed.` });

      // Note: API should ideally handle or report on dependencies.
      // The client-side checks for reports/downtime/pms are more complex with an API.
      // For this migration, we'll rely on API constraints or accept potential orphaned records.
      // If API returns a specific error for dependencies, that could be handled here.
      // Simple check for demonstration:
      const reports: StoredInspectionReport[] = await apiService.fetchInspectionReportsByUnitId(mheToDelete?.unit_code || '');
      const downtimeLogs: StoredDowntimeLog[] = (await apiService.fetchDowntimeLogs()).filter(dl => dl.unitId === mheToDelete?.unit_code);
      const pmsSchedules: StoredPmsScheduleEntry[] = (await apiService.fetchPmsScheduleEntries()).filter(pms => pms.mhe_unit_id === mheToDelete?.id);

      let warningMessage = "";
      if (reports.length > 0) warningMessage += "Inspection reports, ";
      if (downtimeLogs.length > 0) warningMessage += "downtime logs, ";
      if (pmsSchedules.length > 0) warningMessage += "PMS schedules, ";
      
      if (warningMessage) {
        warningMessage = warningMessage.slice(0, -2);
        toast({
          title: "Warning: MHE Unit In Use",
          description: `The deleted MHE Unit "${mheToDelete?.unit_code}" may be referenced in ${warningMessage}. These records might need review.`,
          variant: "default",
          duration: 7000
        });
      }
      fetchMheUnits();
    } catch (error) {
      toast({ title: "Error Deleting MHE Unit", description: (error instanceof Error) ? error.message : "Operation failed.", variant: "destructive" });
    } finally {
      setIsDeleteMheConfirmOpen(false);
      setMheUnitToDeleteId(null);
    }
  };

  const handleConfirmDeleteChecklistItem = async () => {
    if (!checklistItemToDeleteId) return;
    const itemToDelete = checklistItems.find(item => item.id === checklistItemToDeleteId);
    try {
      await apiService.deleteChecklistItem(checklistItemToDeleteId);
      toast({ title: "Checklist Item Deleted", description: `Checklist item "${itemToDelete?.part_name}" removed.` });
      
      // Similar to MHE, a full dependency check on reports via API is complex.
      // We'll rely on API or inform the user.
      // const reports = await apiService.fetchInspectionReports(); // This could be a lot of data
      // const isItemInReports = reports.some(report => report.items?.some((repItem: any) => repItem.checklistItemId === checklistItemToDeleteId));
      // if (isItemInReports) { ... } 
      toast({
          title: "Note",
          description: `If checklist item "${itemToDelete?.part_name}" was used in historical reports, those reports will retain the data.`,
          variant: "default",
          duration: 5000
      });

      fetchChecklistItems();
    } catch (error) {
      toast({ title: "Error Deleting Checklist Item", description: (error instanceof Error) ? error.message : "Operation failed.", variant: "destructive" });
    } finally {
      setIsDeleteItemConfirmOpen(false);
      setChecklistItemToDeleteId(null);
    }
  };

  if (authLoading) {
    return <div className="flex h-[calc(100vh-200px)] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Loading...</p></div>;
  }
  if (!user || user.role !== 'supervisor') {
    if (typeof window !== 'undefined' && user && user.role !== 'supervisor') { router.replace('/dashboard'); }
    return <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center"><AlertTriangle className="h-16 w-16 text-destructive mb-4" /><h2 className="text-2xl font-semibold">Access Denied</h2><p className="text-muted-foreground">Redirecting...</p></div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl sm:text-3xl font-headline font-bold">Data Management</h1>
      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-4">
          <TabsTrigger value="departments" className="py-2.5 text-sm"><Building className="mr-2 h-5 w-5"/> Departments</TabsTrigger>
          <TabsTrigger value="mheDetails" className="py-2.5 text-sm"><TruckIcon className="mr-2 h-5 w-5"/> MHE Details</TabsTrigger>
          <TabsTrigger value="inspectionItems" className="py-2.5 text-sm"><ListChecks className="mr-2 h-5 w-5"/> Inspection Items</TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments" className="mt-6">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center p-4 md:p-6">
                <CardTitle className="text-xl">Manage Departments</CardTitle>
                <Button variant="outline" onClick={handleOpenAddDeptModal} className="w-full md:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Add Department</Button>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {isLoadingDepartments ? <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {departments.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell>{dept.name}</TableCell>
                          <TableCell>{dept.description || 'N/A'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDeptModal(dept)} className="hover:text-primary"><Edit className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDeptDialog(dept.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {!isLoadingDepartments && departments.length === 0 && <p className="text-center py-4 text-muted-foreground">No departments defined.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* MHE Details Tab */}
        <TabsContent value="mheDetails" className="mt-6">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center p-4 md:p-6">
                <CardTitle className="text-xl">Manage MHE Units</CardTitle>
                <Button variant="outline" onClick={handleOpenAddMheModal} className="w-full md:w-auto" disabled={departments.length === 0}><PlusCircle className="mr-2 h-4 w-4" /> Add MHE</Button>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
             {isLoadingMheUnits ? <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Unit Code</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {mheUnits.map((mhe) => (
                        <TableRow key={mhe.id}>
                            <TableCell>{mhe.unit_code}</TableCell>
                            <TableCell>{mhe.name}</TableCell>
                            <TableCell>{mhe.department_name || 'N/A'}</TableCell>
                            <TableCell>{mhe.type || 'N/A'}</TableCell>
                            <TableCell>{mhe.status || 'N/A'}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditMheModal(mhe)} className="hover:text-primary"><Edit className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteMheDialog(mhe.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                            </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {!isLoadingMheUnits && mheUnits.length === 0 && <p className="text-center py-4 text-muted-foreground">No MHE units defined. {departments.length === 0 ? "Add departments first." : ""}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inspection Items Tab */}
        <TabsContent value="inspectionItems" className="mt-6">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center p-4 md:p-6">
                <CardTitle className="text-xl">Manage Inspection Items</CardTitle>
                <Button variant="outline" onClick={handleOpenAddItemModal} className="w-full md:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
            {isLoadingChecklistItems ? <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-[120px]">Part Name</TableHead><TableHead>Question</TableHead><TableHead>QR Data</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {checklistItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.part_name}</TableCell>
                          <TableCell>{item.question}</TableCell>
                          <TableCell>{item.qr_code_data || 'N/A'}</TableCell>
                          <TableCell>{item.is_active ? 'Yes' : 'No'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditItemModal(item)} className="hover:text-primary"><Edit className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteItemDialog(item.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {!isLoadingChecklistItems && checklistItems.length === 0 && <p className="text-center py-4 text-muted-foreground">No inspection items defined.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department Modal (Add/Edit) */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDepartment ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            <DialogDescription>{editingDepartment ? 'Update the details for this department.' : 'Fill in the details for the new department.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitDept(onDepartmentSubmit)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="deptName">Department Name</Label>
              <Input id="deptName" {...registerDept("name")} className="mt-1"/>
              {deptErrors.name && <p className="text-sm text-destructive mt-1">{deptErrors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="deptDesc">Description (Optional)</Label>
              <Textarea id="deptDesc" {...registerDept("description")} className="mt-1"/>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => setEditingDepartment(null)}>Cancel</Button></DialogClose>
              <Button type="submit">{editingDepartment ? 'Save Changes' : 'Save Department'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MHE Unit Modal (Add/Edit) */}
      <Dialog open={isMheModalOpen} onOpenChange={setIsMheModalOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMheUnit ? 'Edit MHE Unit' : 'Add New MHE Unit'}</DialogTitle>
            <DialogDescription>{editingMheUnit ? 'Update the details for this MHE unit.' : 'Fill in the details for the new MHE unit.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitMhe(onMheUnitSubmit)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="mheUnitCode">MHE Unit Code</Label>
              <Input id="mheUnitCode" {...registerMhe("unit_code")} className="mt-1"/>
              {mheErrors.unit_code && <p className="text-sm text-destructive mt-1">{mheErrors.unit_code.message}</p>}
            </div>
            <div>
              <Label htmlFor="mheName">MHE Name / Description</Label>
              <Input id="mheName" {...registerMhe("name")} className="mt-1"/>
              {mheErrors.name && <p className="text-sm text-destructive mt-1">{mheErrors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="mheDept">Department (Optional)</Label>
              <Controller
                name="department_id"
                control={controlMhe}
                render={({ field }) => (
                  <Select
                    onValueChange={(selectedValue) => field.onChange(selectedValue === NONE_SELECT_VALUE ? null : selectedValue)}
                    value={field.value === null || field.value === undefined || field.value === '' ? NONE_SELECT_VALUE : field.value}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}><em>None</em></SelectItem>
                      {departments.map(dept => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="mheType">Type (Optional)</Label>
              <Input id="mheType" {...registerMhe("type")} className="mt-1"/>
            </div>
            <div>
              <Label htmlFor="mheStatus">Status</Label>
              <Controller
                name="status" control={controlMhe} defaultValue="active"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => setEditingMheUnit(null)}>Cancel</Button></DialogClose>
              <Button type="submit">{editingMheUnit ? 'Save Changes' : 'Save MHE Unit'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Checklist Item Modal (Add/Edit) */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>{editingChecklistItem ? 'Edit Inspection Item' : 'Add New Inspection Item'}</DialogTitle>
            <DialogDescription>{editingChecklistItem ? 'Update the details for this item.' : 'Fill in the details for the new item.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitItem(onChecklistItemSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <Label htmlFor="itemPartName">Part Name</Label>
              <Input id="itemPartName" {...registerItem("part_name")} className="mt-1"/>
              {itemErrors.part_name && <p className="text-sm text-destructive mt-1">{itemErrors.part_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="itemQuestion">Question for Operator</Label>
              <Textarea id="itemQuestion" {...registerItem("question")} className="mt-1"/>
              {itemErrors.question && <p className="text-sm text-destructive mt-1">{itemErrors.question.message}</p>}
            </div>
            <div>
              <Label htmlFor="itemDesc">Description / Instructions (Optional)</Label>
              <Textarea id="itemDesc" {...registerItem("description")} className="mt-1"/>
            </div>
            <div>
              <Label htmlFor="itemQrCode">QR Code Data (Optional)</Label>
              <Input id="itemQrCode" {...registerItem("qr_code_data")} className="mt-1"/>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Controller name="is_active" control={controlItem} defaultValue={true}
                render={({ field }) => <Switch id="itemIsActive" checked={field.value} onCheckedChange={field.onChange} />}
              />
              <Label htmlFor="itemIsActive" className="text-sm">Item is Active</Label>
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => setEditingChecklistItem(null)}>Cancel</Button></DialogClose>
              <Button type="submit">{editingChecklistItem ? 'Save Changes' : 'Save Item'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    {/* Delete Confirmation Dialogs */}
    <AlertDialog open={isDeleteDeptConfirmOpen} onOpenChange={setIsDeleteDeptConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Delete Department</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to delete department "{departments.find(d=>d.id === departmentToDeleteId)?.name || ''}"? 
                    This action cannot be undone. MHE units assigned to this department may need to be reassigned.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDepartmentToDeleteId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteDepartment} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={isDeleteMheConfirmOpen} onOpenChange={setIsDeleteMheConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Delete MHE Unit</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to delete MHE unit "{mheUnits.find(m=>m.id === mheUnitToDeleteId)?.unit_code || ''}"? 
                    This action cannot be undone. Associated inspection reports, downtime logs, and PMS schedules may be orphaned if not handled by the API.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setMheUnitToDeleteId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteMheUnit} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={isDeleteItemConfirmOpen} onOpenChange={setIsDeleteItemConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Delete Inspection Item</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to delete item "{checklistItems.find(i=>i.id === checklistItemToDeleteId)?.part_name || ''}"? 
                    This action cannot be undone. Historical reports using this item will remain unaffected.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setChecklistItemToDeleteId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteChecklistItem} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </div>
  );
}
