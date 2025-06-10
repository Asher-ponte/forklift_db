
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, ListChecks, TruckIcon, Building, AlertTriangle, Loader2 } from "lucide-react";
import { MOCK_CHECKLIST_ITEMS, type ChecklistItem } from '@/lib/mock-data';

// Mock data from inspection page for MHEs and Departments (for display purposes)
interface Department {
  id: string;
  name: string;
}
interface Mhe {
  id: string;
  name: string;
  departmentId: string;
}
const MOCK_DEPARTMENTS_LIST: Department[] = [
  { id: 'warehouse-a', name: 'Warehouse A' },
  { id: 'production-floor', name: 'Production Floor' },
  { id: 'shipping', name: 'Shipping Department' },
  { id: 'receiving', name: 'Receiving Area' },
];
const MOCK_MHES_LIST: Mhe[] = [
  { id: 'FL001', name: 'Forklift FL001 (Alpha)', departmentId: 'warehouse-a' },
  { id: 'FL002', name: 'Forklift FL002 (Bravo)', departmentId: 'warehouse-a' },
  { id: 'PJ001', name: 'Pallet Jack PJ001', departmentId: 'production-floor' },
  { id: 'FL003', name: 'Forklift FL003 (Delta)', departmentId: 'shipping' },
];

// For now, inspection items will be read from mock-data.ts
const mockInspectionItemsList: ChecklistItem[] = MOCK_CHECKLIST_ITEMS;


export default function DataManagementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddMheModalOpen, setIsAddMheModalOpen] = useState(false);
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading user data...</p>
      </div>
    );
  }

  if (!user || user.role !== 'supervisor') {
    // Redirect or show access denied. For now, showing a message.
    // useEffect could be used for a redirect, but this is simpler for now.
    if (typeof window !== 'undefined' && user && user.role !== 'supervisor') {
        router.replace('/dashboard'); // Or an access denied page
        return (
             <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
                <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-2xl font-semibold text-destructive">Access Denied</h2>
                <p className="text-muted-foreground">You do not have permission to view this page. Redirecting...</p>
            </div>
        );
    }
     return ( // Fallback for server rendering or if router not ready
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

      <Tabs defaultValue="inspectionItems" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-6">
          <TabsTrigger value="inspectionItems" className="py-3 text-base">
            <ListChecks className="mr-2 h-5 w-5"/> Inspection Items
          </TabsTrigger>
          <TabsTrigger value="mheDetails" className="py-3 text-base">
            <TruckIcon className="mr-2 h-5 w-5"/> MHE Details
          </TabsTrigger>
          <TabsTrigger value="departments" className="py-3 text-base">
            <Building className="mr-2 h-5 w-5"/> Departments
          </TabsTrigger>
        </TabsList>

        {/* Inspection Items Tab */}
        <TabsContent value="inspectionItems">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Manage Inspection Checklist Items</CardTitle>
                <CardDescription>Define items for forklift inspection forms. Changes reflect globally.</CardDescription>
              </div>
              <Dialog open={isAddItemModalOpen} onOpenChange={setIsAddItemModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Inspection Item</DialogTitle></DialogHeader>
                  <DialogDescription className="py-4">Form for adding new inspection items will be here. (Placeholder)</DialogDescription>
                  <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockInspectionItemsList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.part_name}</TableCell>
                      <TableCell>{item.question}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" disabled>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {mockInspectionItemsList.length === 0 && <p className="text-center py-4 text-muted-foreground">No inspection items defined yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MHE Details Tab */}
        <TabsContent value="mheDetails">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Manage MHE (Material Handling Equipment)</CardTitle>
                <CardDescription>Add, view, and edit MHE units and their assignments.</CardDescription>
              </div>
               <Dialog open={isAddMheModalOpen} onOpenChange={setIsAddMheModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add MHE</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New MHE</DialogTitle></DialogHeader>
                  <DialogDescription className="py-4">Form for adding new MHE details will be here. (Placeholder)</DialogDescription>
                  <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MHE ID</TableHead>
                    <TableHead>Name / Description</TableHead>
                    <TableHead>Assigned Department ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_MHES_LIST.map((mhe) => (
                    <TableRow key={mhe.id}>
                      <TableCell className="font-medium">{mhe.id}</TableCell>
                      <TableCell>{mhe.name}</TableCell>
                      <TableCell>{mhe.departmentId}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" disabled>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {MOCK_MHES_LIST.length === 0 && <p className="text-center py-4 text-muted-foreground">No MHEs defined yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Manage Departments</CardTitle>
                <CardDescription>Define operational departments for MHE assignment and filtering.</CardDescription>
              </div>
              <Dialog open={isAddDeptModalOpen} onOpenChange={setIsAddDeptModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Department</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Department</DialogTitle></DialogHeader>
                  <DialogDescription className="py-4">Form for adding new departments will be here. (Placeholder)</DialogDescription>
                  <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department ID</TableHead>
                    <TableHead>Department Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_DEPARTMENTS_LIST.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.id}</TableCell>
                      <TableCell>{dept.name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" disabled>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {MOCK_DEPARTMENTS_LIST.length === 0 && <p className="text-center py-4 text-muted-foreground">No departments defined yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
