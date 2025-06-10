
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, ListChecks, TruckIcon, Building, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';


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
  department_name?: string; // For display
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

const NONE_SELECT_VALUE = "__NONE__"; // For "None" option in select

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
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [mheUnits, setMheUnits] = useState<MheUnit[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistMasterItem[]>([]);
  
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingMheUnits, setIsLoadingMheUnits] = useState(true);
  const [isLoadingChecklistItems, setIsLoadingChecklistItems] = useState(true);

  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [isAddMheModalOpen, setIsAddMheModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  const { register: registerDept, handleSubmit: handleSubmitDept, reset: resetDeptForm, formState: { errors: deptErrors } } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
  });
  const { control: controlMhe, register: registerMhe, handleSubmit: handleSubmitMhe, reset: resetMheForm, formState: { errors: mheErrors } } = useForm<MheUnitFormData>({
    resolver: zodResolver(mheUnitSchema),
  });
  const { control: controlItem, register: registerItem, handleSubmit: handleSubmitItem, reset: resetItemForm, formState: { errors: itemErrors } } = useForm<ChecklistItemFormData>({
    resolver: zodResolver(checklistItemSchema),
  });


  // --- Data Fetching Callbacks ---
  const fetchDepartments = useCallback(async () => {
    if (!apiBaseUrl) {
      toast({ title: "Configuration Error", description: "API base URL is not configured. Cannot fetch data.", variant: "destructive" });
      setIsLoadingDepartments(false);
      return;
    }
    setIsLoadingDepartments(true);
    try {
      const response = await fetch(`${apiBaseUrl}/departments_api.php`);
      console.log('Fetch Departments Response Status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch Departments Error Text:', errorText);
        throw new Error(`Failed to fetch departments: ${response.status} ${response.statusText}. Details: ${errorText.substring(0, 100)}`);
      }
      const data = await response.json();
      console.log('Fetched Departments Data:', data);
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error in fetchDepartments:', error);
      toast({ title: "Error Fetching Departments", description: (error instanceof Error) ? error.message : "Could not fetch departments. Check console for details.", variant: "destructive" });
      setDepartments([]);
    } finally {
      setIsLoadingDepartments(false);
    }
  }, [apiBaseUrl, toast]);

  const fetchMheUnits = useCallback(async () => {
    if (!apiBaseUrl) {
      setIsLoadingMheUnits(false);
      return;
    }
    setIsLoadingMheUnits(true);
    try {
      const response = await fetch(`${apiBaseUrl}/mhe_units_api.php`);
      console.log('Fetch MHE Units Response Status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch MHE Units Error Text:', errorText);
        throw new Error(`Failed to fetch MHE units: ${response.status} ${response.statusText}. Details: ${errorText.substring(0, 100)}`);
      }
      const data: MheUnit[] = await response.json();
      console.log('Fetched MHE Units Data:', data);
      const enhancedData = Array.isArray(data) ? data.map(mhe => ({
        ...mhe,
        department_name: departments.find(d => d.id === mhe.department_id)?.name || 'N/A'
      })) : [];
      setMheUnits(enhancedData);
    } catch (error) {
      console.error('Error in fetchMheUnits:', error);
      toast({ title: "Error Fetching MHE Units", description: (error instanceof Error) ? error.message : "Could not fetch MHE units. Check console for details.", variant: "destructive" });
      setMheUnits([]);
    } finally {
      setIsLoadingMheUnits(false);
    }
  }, [apiBaseUrl, toast, departments]);

  const fetchChecklistItems = useCallback(async () => {
     if (!apiBaseUrl) {
      setIsLoadingChecklistItems(false);
      return;
    }
    setIsLoadingChecklistItems(true);
    try {
      const response = await fetch(`${apiBaseUrl}/checklist_items_api.php`);
      console.log('Fetch Checklist Items Response Status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch Checklist Items Error Text:', errorText);
        throw new Error(`Failed to fetch checklist items: ${response.status} ${response.statusText}. Details: ${errorText.substring(0, 100)}`);
      }
      const data = await response.json();
      console.log('Fetched Checklist Items Data:', data);
      setChecklistItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error in fetchChecklistItems:', error);
      toast({ title: "Error Fetching Checklist Items", description: (error instanceof Error) ? error.message : "Could not fetch checklist items. Check console for details.", variant: "destructive" });
      setChecklistItems([]);
    } finally {
      setIsLoadingChecklistItems(false);
    }
  }, [apiBaseUrl, toast]);

  // --- Initial Data Load ---
  useEffect(() => {
    if (user?.role === 'supervisor') {
      fetchDepartments();
      fetchChecklistItems();
    }
  }, [user, fetchDepartments, fetchChecklistItems]);
  
  useEffect(() => {
    if (user?.role === 'supervisor' && !isLoadingDepartments && departments.length > 0) {
         fetchMheUnits();
    } else if (user?.role === 'supervisor' && !isLoadingDepartments && departments.length === 0) {
        // If there are no departments, we might still want to fetch MHE units (they might not have a department_id)
        // Or at least ensure loadingMHEUnits is set to false
        fetchMheUnits(); // Or just setIsLoadingMheUnits(false); if no departments means no MHE units can be meaningfully displayed
    }
  }, [user, fetchMheUnits, isLoadingDepartments, departments.length]);


  // --- Form Submission Handlers ---
  const onAddDepartment = async (data: DepartmentFormData) => {
    try {
      const response = await fetch(`${apiBaseUrl}/departments_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let errorData = { message: `Request failed: ${response.status} ${response.statusText}` };
        if (response.status === 409) { // Conflict
            throw new Error("Failed to add department. The department name may already exist. Please use a unique name.");
        }
        try {
          errorData = await response.json();
        } catch (e) {
          const textError = await response.text().catch(() => ''); 
          throw new Error(textError ? `Server error: ${textError.substring(0,100)}...` : errorData.message);
        }
        throw new Error(errorData.message || `An unknown error occurred. Status: ${response.status}`);
      }
      toast({ title: "Success", description: "Department added successfully." });
      fetchDepartments(); 
      resetDeptForm();
      setIsAddDeptModalOpen(false);
    } catch (error) {
      toast({ title: "Error Adding Department", description: (error instanceof Error) ? error.message : "Could not add department.", variant: "destructive" });
    }
  };

  const onAddMheUnit = async (data: MheUnitFormData) => {
    try {
      const payload = {
        ...data,
        department_id: data.department_id === NONE_SELECT_VALUE ? null : data.department_id,
      };
      const response = await fetch(`${apiBaseUrl}/mhe_units_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let errorData = { message: `Request failed: ${response.status} ${response.statusText}` };
         if (response.status === 409) { 
            throw new Error("Failed to add MHE unit. The Unit Code may already exist. Please use a unique code.");
          }
        try {
          errorData = await response.json();
        } catch (e) {
          const textError = await response.text().catch(() => '');
          throw new Error(textError ? `Server error: ${textError.substring(0,100)}...` : errorData.message);
        }
        throw new Error(errorData.message || `An unknown error occurred. Status: ${response.status}`);
      }
      toast({ title: "Success", description: "MHE unit added successfully." });
      fetchMheUnits(); 
      resetMheForm();
      setIsAddMheModalOpen(false);
    } catch (error) {
      toast({ title: "Error Adding MHE Unit", description: (error instanceof Error) ? error.message : "Could not add MHE unit.", variant: "destructive" });
    }
  };

  const onAddChecklistItem = async (data: ChecklistItemFormData) => {
    try {
      const response = await fetch(`${apiBaseUrl}/checklist_items_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let errorData = { message: `Request failed: ${response.status} ${response.statusText}` };
        try {
          errorData = await response.json();
        } catch (e) {
          const textError = await response.text().catch(() => '');
          throw new Error(textError ? `Server error: ${textError.substring(0,100)}...` : errorData.message);
        }
        throw new Error(errorData.message || `An unknown error occurred. Status: ${response.status}`);
      }
      toast({ title: "Success", description: "Checklist item added successfully." });
      fetchChecklistItems(); 
      resetItemForm();
      setIsAddItemModalOpen(false);
    } catch (error) {
      toast({ title: "Error Adding Checklist Item", description: (error instanceof Error) ? error.message : "Could not add checklist item.", variant: "destructive" });
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading user data...</p>
      </div>
    );
  }

  if (!user || user.role !== 'supervisor') {
    if (typeof window !== 'undefined' && user && user.role !== 'supervisor') {
        router.replace('/dashboard'); 
        return ( 
             <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
                <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-2xl font-semibold text-destructive">Access Denied</h2>
                <p className="text-muted-foreground">You do not have permission to view this page. Redirecting...</p>
            </div>
        );
    }
     return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold text-destructive">Access Denied</h2>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
             <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Data Management</h1>
        <p className="text-muted-foreground">Oversee and manage core application data (Supervisor Access).</p>
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-6">
          <TabsTrigger value="departments" className="py-3 text-base">
            <Building className="mr-2 h-5 w-5"/> Departments
          </TabsTrigger>
          <TabsTrigger value="mheDetails" className="py-3 text-base">
            <TruckIcon className="mr-2 h-5 w-5"/> MHE Details
          </TabsTrigger>
          <TabsTrigger value="inspectionItems" className="py-3 text-base">
            <ListChecks className="mr-2 h-5 w-5"/> Inspection Items
          </TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Manage Departments</CardTitle>
                <CardDescription>Define operational departments.</CardDescription>
              </div>
              <Dialog open={isAddDeptModalOpen} onOpenChange={setIsAddDeptModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => { resetDeptForm(); setIsAddDeptModalOpen(true);}}><PlusCircle className="mr-2 h-4 w-4" /> Add Department</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Department</DialogTitle>
                    <DialogDescription>Fill in the details for the new department.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitDept(onAddDepartment)} className="space-y-4 py-4">
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
                      <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                      <Button type="submit">Save Department</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingDepartments ? <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : (
                <Table>
                  <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.id}><TableCell>{dept.id.substring(0,8)}...</TableCell><TableCell>{dept.name}</TableCell><TableCell>{dept.description || 'N/A'}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!isLoadingDepartments && departments.length === 0 && <p className="text-center py-4 text-muted-foreground">No departments defined yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MHE Details Tab */}
        <TabsContent value="mheDetails">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Manage MHE (Material Handling Equipment)</CardTitle>
                <CardDescription>Add, view, and edit MHE units.</CardDescription>
              </div>
               <Dialog open={isAddMheModalOpen} onOpenChange={setIsAddMheModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => { resetMheForm({status: 'active', department_id: null}); setIsAddMheModalOpen(true);}}><PlusCircle className="mr-2 h-4 w-4" /> Add MHE</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New MHE Unit</DialogTitle>
                    <DialogDescription>Fill in the details for the new MHE unit.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitMhe(onAddMheUnit)} className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="mheUnitCode">MHE Unit Code (e.g., FL001)</Label>
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
                            onValueChange={(selectedValue) => {
                                field.onChange(selectedValue === NONE_SELECT_VALUE ? null : selectedValue);
                            }}
                            value={field.value === null || field.value === undefined || field.value === '' ? NONE_SELECT_VALUE : field.value}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE_SELECT_VALUE}><em>None</em></SelectItem>
                              {departments.map(dept => (
                                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                       {mheErrors.department_id && <p className="text-sm text-destructive mt-1">{mheErrors.department_id.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="mheType">Type (e.g., Forklift, Pallet Jack - Optional)</Label>
                      <Input id="mheType" {...registerMhe("type")} className="mt-1"/>
                    </div>
                     <div>
                      <Label htmlFor="mheStatus">Status</Label>
                       <Controller
                        name="status"
                        control={controlMhe}
                        defaultValue="active"
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
                      <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                      <Button type="submit">Save MHE Unit</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
             {isLoadingMheUnits ? <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Unit Code</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {mheUnits.map((mhe) => (
                      <TableRow key={mhe.id}><TableCell>{mhe.unit_code}</TableCell><TableCell>{mhe.name}</TableCell><TableCell>{mhe.department_name || 'N/A'}</TableCell><TableCell>{mhe.type || 'N/A'}</TableCell><TableCell>{mhe.status || 'N/A'}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!isLoadingMheUnits && mheUnits.length === 0 && <p className="text-center py-4 text-muted-foreground">No MHE units defined yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inspection Items Tab */}
        <TabsContent value="inspectionItems">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Manage Inspection Checklist Items</CardTitle>
                <CardDescription>Define items for inspection forms.</CardDescription>
              </div>
              <Dialog open={isAddItemModalOpen} onOpenChange={setIsAddItemModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => { resetItemForm({is_active: true}); setIsAddItemModalOpen(true);}}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Inspection Item</DialogTitle>
                    <DialogDescription>Fill in the details for the new inspection checklist item.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitItem(onAddChecklistItem)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
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
                       <Controller
                        name="is_active"
                        control={controlItem}
                        defaultValue={true}
                        render={({ field }) => (
                           <Switch
                            id="itemIsActive"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="itemIsActive" className="text-sm">Item is Active</Label>
                    </div>
                    <DialogFooter className="pt-4">
                      <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                      <Button type="submit">Save Item</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
            {isLoadingChecklistItems ? <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : (
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[100px]">Part Name</TableHead><TableHead>Question</TableHead><TableHead>QR Data</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {checklistItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.part_name}</TableCell>
                        <TableCell>{item.question}</TableCell>
                        <TableCell>{item.qr_code_data || 'N/A'}</TableCell>
                        <TableCell>{item.is_active ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!isLoadingChecklistItems && checklistItems.length === 0 && <p className="text-center py-4 text-muted-foreground">No inspection items defined yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

