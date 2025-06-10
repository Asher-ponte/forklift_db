
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CompletionProgress from '@/components/inspection/CompletionProgress';
import SafetyCheckModal from '@/components/inspection/SafetyCheckModal';
import { MOCK_CHECKLIST_ITEMS } from '@/lib/mock-data';
import type { ChecklistItem, InspectionRecordClientState } from '@/lib/mock-data';
import type { StoredInspectionReport, StoredDowntimeLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, ScanLine, AlertCircle, CheckCircle, AlertTriangle, Send, Edit3, Warehouse, TruckIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Mock Data for Departments and MHEs (Material Handling Equipment)
// In a real app, this data would be fetched from the backend / Data Management page
interface Department {
  id: string;
  name: string;
}

interface Mhe {
  id: string; // This will be the "Unit ID"
  name: string; // Display name for the MHE
  departmentId: string;
  // type?: string; // e.g., 'Forklift', 'Pallet Jack' - could determine checklist in future
}

const MOCK_DEPARTMENTS: Department[] = [
  { id: 'warehouse-a', name: 'Warehouse A' },
  { id: 'production-floor', name: 'Production Floor' },
  { id: 'shipping', name: 'Shipping Department' },
  { id: 'receiving', name: 'Receiving Area' },
];

const MOCK_MHES: Mhe[] = [
  { id: 'FL001', name: 'Forklift FL001 (Alpha)', departmentId: 'warehouse-a' },
  { id: 'FL002', name: 'Forklift FL002 (Bravo)', departmentId: 'warehouse-a' },
  { id: 'PJ001', name: 'Pallet Jack PJ001', departmentId: 'production-floor' },
  { id: 'FL003', name: 'Forklift FL003 (Delta)', departmentId: 'shipping' },
  { id: 'FL004', name: 'Forklift FL004 (Echo)', departmentId: 'production-floor' },
  { id: 'RE001', name: 'Reach Truck RE001', departmentId: 'receiving' },
];


export default function InspectionPage() {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedMheId, setSelectedMheId] = useState<string>(''); // This will be our effective "unitId"
  const [isInspectionSetupConfirmed, setIsInspectionSetupConfirmed] = useState(false);

  const [inspectionItems, setInspectionItems] = useState<InspectionRecordClientState[]>([]);
  const [currentItemIdToInspect, setCurrentItemIdToInspect] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUnsafeWarningDialog, setShowUnsafeWarningDialog] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const filteredMHEs = useMemo(() => {
    if (!selectedDepartmentId) return [];
    return MOCK_MHES.filter(mhe => mhe.departmentId === selectedDepartmentId);
  }, [selectedDepartmentId]);

  const resetInspectionState = useCallback((resetSelections = false) => {
    const initialItems = MOCK_CHECKLIST_ITEMS.map(item => ({
      checklistItemId: item.id,
      part_name: item.part_name,
      question: item.question,
      is_safe: null,
      photo_url: null,
      timestamp: null,
      completed: false,
      remarks: null,
    }));
    setInspectionItems(initialItems);
    setCurrentItemIdToInspect(initialItems.length > 0 ? initialItems[0].checklistItemId : null);
    setShowUnsafeWarningDialog(false);
    setIsSubmittingReport(false);
    if (resetSelections) {
      setSelectedDepartmentId('');
      setSelectedMheId('');
      setIsInspectionSetupConfirmed(false);
    }
  }, []);


  useEffect(() => {
    if (isInspectionSetupConfirmed) {
      // Reset only checklist items, not department/MHE selection
      resetInspectionState(false);
    }
  }, [isInspectionSetupConfirmed, resetInspectionState]);


  const completedItemsCount = useMemo(() => inspectionItems.filter(item => item.completed).length, [inspectionItems]);
  const totalItemsCount = MOCK_CHECKLIST_ITEMS.length;

  const isInspectionComplete = useMemo(() => totalItemsCount > 0 && completedItemsCount === totalItemsCount, [completedItemsCount, totalItemsCount]);

  const hasUnsafeItems = useMemo(() => {
    if (!isInspectionComplete) return false;
    return inspectionItems.some(item => item.completed && item.is_safe === false);
  }, [inspectionItems, isInspectionComplete]);

  useEffect(() => {
    if (isInspectionComplete && hasUnsafeItems) {
      setShowUnsafeWarningDialog(true);
    }
  }, [isInspectionComplete, hasUnsafeItems]);

  const currentChecklistItemDetails = useMemo(() => {
    if (!currentItemIdToInspect) return null;
    return MOCK_CHECKLIST_ITEMS.find(item => item.id === currentItemIdToInspect) || null;
  }, [currentItemIdToInspect]);

  const handleStartInspectionSetup = () => {
    if (!selectedDepartmentId) {
      toast({ title: "Error", description: "Please select a Department.", variant: "destructive"});
      return;
    }
    if (!selectedMheId) {
      toast({ title: "Error", description: "Please select an MHE ID.", variant: "destructive"});
      return;
    }
    setIsInspectionSetupConfirmed(true);
  };
  
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDepartmentId(deptId);
    setSelectedMheId(''); // Reset MHE when department changes
  };


  const handleQrScanOrSelect = (itemId: string) => {
    const itemToInspect = MOCK_CHECKLIST_ITEMS.find(i => i.id === itemId);
    if (itemToInspect) {
      setCurrentItemIdToInspect(itemToInspect.id);
      setIsModalOpen(true);
    } else {
      toast({ title: "Error", description: "Checklist item not found.", variant: "destructive" });
    }
  };

  const handleInspectionSubmitForItem = (itemId: string, isSafe: boolean, photoUrl: string, remarks: string | null) => {
     setInspectionItems(currentItems => {
        const updatedItems = currentItems.map(item =>
            item.checklistItemId === itemId
            ? { ...item, is_safe: isSafe, photo_url: photoUrl, timestamp: new Date().toISOString(), completed: true, remarks: remarks }
            : item
        );

        const stillPendingItems = updatedItems.filter(i => !i.completed);
        if (stillPendingItems.length > 0) {
            setCurrentItemIdToInspect(stillPendingItems[0].checklistItemId);
        } else {
            setCurrentItemIdToInspect(null);
        }
        return updatedItems;
    });
    setIsModalOpen(false);
  };

  const availableItemsToInspect = MOCK_CHECKLIST_ITEMS.filter(mItem =>
    !inspectionItems.find(iItem => iItem.checklistItemId === mItem.id)?.completed
  );

  const handleSubmitReport = async () => {
    if (!isInspectionComplete || !user || !selectedMheId) return;
    setIsSubmittingReport(true);

    const overallStatus = hasUnsafeItems ? 'Unsafe' : 'Safe';
    const reportDate = new Date().toISOString();

    const reportItemsForAPI = inspectionItems.map(item => ({
      checklistItemId: item.checklistItemId,
      part_name: item.part_name,
      question: item.question,
      is_safe: item.is_safe,
      photo_url: item.photo_url,
      timestamp: item.timestamp,
      remarks: item.remarks,
    }));

    const newReportAPIData: Omit<StoredInspectionReport, 'id'> = {
      unitId: selectedMheId, // Use the selected MHE ID as the unitId
      date: reportDate,
      operator: user.username,
      status: overallStatus,
      items: reportItemsForAPI,
    };

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/inspection_reports.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newReportAPIData),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorData;
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json().catch(() => ({ message: 'Failed to parse JSON error response from server.' }));
        } else {
          const textError = await response.text().catch(() => 'Unknown server error, non-JSON response from server.');
          errorData = { message: `Server error submitting report (non-JSON): ${textError.substring(0, 200)}... Contact backend admin.` };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const savedReport: StoredInspectionReport = await response.json();

      toast({
        title: "Report Submitted",
        description: `Inspection report for MHE ID ${savedReport.unitId} has been saved to the server.`,
      });

      if (savedReport.status === 'Unsafe') {
        const firstUnsafeItem = savedReport.items.find(item => !item.is_safe);
        let downtimeReason = `MHE unit ${savedReport.unitId} deemed unsafe during inspection.`;
        if (firstUnsafeItem) {
          downtimeReason = `Unsafe item: ${firstUnsafeItem.part_name}.`;
          if (firstUnsafeItem.remarks) {
            downtimeReason += ` Remarks: ${firstUnsafeItem.remarks}`;
          }
        }

        const newDowntimeLogAPIData: Omit<StoredDowntimeLog, 'id' | 'endTime'> = {
          unitId: savedReport.unitId,
          reason: downtimeReason,
          startTime: reportDate,
          loggedAt: reportDate,
        };

        const downtimeResponse = await fetch(`${apiBaseUrl}/downtime_logs.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(newDowntimeLogAPIData)
        });

        if(downtimeResponse.ok) {
            toast({
                title: "Downtime Logged",
                description: `Downtime automatically logged for unsafe unit ${savedReport.unitId} on the server.`,
                variant: "default"
            });
        } else {
            const contentType = downtimeResponse.headers.get("content-type");
            let downtimeError;
            if (contentType && contentType.includes("application/json")) {
                downtimeError = await downtimeResponse.json().catch(() => ({ message: 'Failed to parse JSON error for downtime log.'}));
            } else {
                const textError = await downtimeResponse.text().catch(() => 'Unknown server error for downtime log.');
                downtimeError = { message: `Downtime log server error (non-JSON): ${textError.substring(0,200)}... Contact backend admin.`};
            }
            toast({title: "Downtime Log Error", description: downtimeError.message || "Failed to automatically log downtime.", variant: "destructive"})
        }
      }
      resetInspectionState(true); // Reset selections and items

    } catch (error) {
      console.error("Error submitting report to server:", error);
      toast({
        title: "Submission Error",
        description: (error instanceof Error) ? error.message : "Could not save data to the server.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (!isInspectionSetupConfirmed) {
    return (
      <div className="space-y-8 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center">
              <Edit3 className="mr-3 h-7 w-7 text-primary" />
              Inspection Setup
            </CardTitle>
            <CardDescription>Please select the department and MHE ID for the equipment you are inspecting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="departmentSelect" className="flex items-center"><Warehouse className="mr-2 h-4 w-4 text-muted-foreground"/>Department</Label>
              <Select value={selectedDepartmentId} onValueChange={handleDepartmentChange}>
                <SelectTrigger id="departmentSelect" className="w-full text-base">
                  <SelectValue placeholder="Select a department..." />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_DEPARTMENTS.map(dept => (
                    <SelectItem key={dept.id} value={dept.id} className="text-base py-2">
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mheSelect" className="flex items-center"><TruckIcon className="mr-2 h-4 w-4 text-muted-foreground"/>MHE ID</Label>
              <Select value={selectedMheId} onValueChange={setSelectedMheId} disabled={!selectedDepartmentId || filteredMHEs.length === 0}>
                <SelectTrigger id="mheSelect" className="w-full text-base">
                  <SelectValue placeholder={!selectedDepartmentId ? "Select department first" : "Select an MHE ID..."} />
                </SelectTrigger>
                <SelectContent>
                  {filteredMHEs.length > 0 ? (
                    filteredMHEs.map(mhe => (
                      <SelectItem key={mhe.id} value={mhe.id} className="text-base py-2">
                        {mhe.name} ({mhe.id})
                      </SelectItem>
                    ))
                  ) : selectedDepartmentId ? (
                     <div className="p-4 text-center text-sm text-muted-foreground">No MHEs found for this department.</div>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleStartInspectionSetup} size="lg" className="w-full text-base py-3" disabled={!selectedDepartmentId || !selectedMheId}>
              Start Inspection for {selectedMheId || "Selected MHE"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rest of the inspection page (when isInspectionSetupConfirmed is true)
  const selectedMheDetails = MOCK_MHES.find(mhe => mhe.id === selectedMheId);

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <ListChecks className="mr-3 h-8 w-8 text-primary" />
            Inspection: {selectedMheDetails?.name || selectedMheId}
          </CardTitle>
          <CardDescription>
            Complete all checklist items to ensure equipment safety.
            {isInspectionComplete && " All items inspected."}
          </CardDescription>
        </CardHeader>
        <CardContent>
             <Button onClick={() => resetInspectionState(true)} variant="outline" size="sm">
                Change Department/MHE
            </Button>
        </CardContent>
      </Card>

      {!isInspectionComplete ? (
        <>
          <CompletionProgress completedItems={completedItemsCount} totalItems={totalItemsCount} />

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Inspect Item</CardTitle>
              <CardDescription>Select an item to inspect or simulate a QR code scan (using the dropdown). The selected item will pop up in a modal.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
              <Select
                onValueChange={(value) => handleQrScanOrSelect(value)}
                value={currentItemIdToInspect || ""}
                disabled={availableItemsToInspect.length === 0 || isModalOpen}
              >
                <SelectTrigger className="w-full sm:w-[300px] text-base py-3 h-auto" aria-label="Select item to inspect">
                  <SelectValue placeholder="Select an item..." />
                </SelectTrigger>
                <SelectContent>
                  {availableItemsToInspect.map(item => (
                    <SelectItem key={item.id} value={item.id} className="text-base py-2">
                      {item.part_name}
                    </SelectItem>
                  ))}
                  {availableItemsToInspect.length === 0 && !isInspectionComplete && (
                    <div className="p-4 text-center text-sm text-muted-foreground">All items inspected. Preparing for next step.</div>
                  )}
                   {availableItemsToInspect.length === 0 && isInspectionComplete && (
                    <div className="p-4 text-center text-sm text-muted-foreground">All items inspected.</div>
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={() => currentItemIdToInspect && handleQrScanOrSelect(currentItemIdToInspect)}
                disabled={!currentItemIdToInspect || isModalOpen || availableItemsToInspect.length === 0}
                size="lg"
                className="w-full sm:w-auto text-base py-3"
              >
                <ScanLine className="mr-2 h-5 w-5" /> Simulate Scan & Inspect
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-xl">Checklist Status</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {inspectionItems.map(item => (
                  <li key={item.checklistItemId} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                    <span className="font-medium">{item.part_name}</span>
                    {item.completed ? (
                      item.is_safe ? (
                        <span className="flex items-center text-sm text-green-600">
                          <CheckCircle className="mr-1 h-4 w-4" /> Safe
                        </span>
                      ) : (
                        <span className="flex items-center text-sm text-red-600">
                          <AlertCircle className="mr-1 h-4 w-4" /> Unsafe {item.remarks && `(${item.remarks.substring(0,30)}...)`}
                        </span>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">Pending</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center mt-8 space-y-6">
          <Card className="shadow-lg w-full max-w-md mx-auto">
            <CardHeader className="text-center">
               {hasUnsafeItems ? (
                 <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-3" />
               ) : (
                 <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-3" />
               )}
              <CardTitle className="font-headline text-2xl">
                Inspection Complete for {selectedMheDetails?.name || selectedMheId}!
              </CardTitle>
              <CardDescription>
                Overall Status: <span className={hasUnsafeItems ? "font-bold text-destructive" : "font-bold text-green-600"}>{hasUnsafeItems ? "UNSAFE" : "SAFE"}</span>.
                All checklist items have been inspected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleSubmitReport} size="lg" className="w-full text-base py-3 bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmittingReport}>
                <Send className="mr-2 h-5 w-5" />
                {isSubmittingReport ? "Submitting..." : "Submit Report"}
              </Button>
              <Button onClick={() => resetInspectionState(true)} size="lg" variant="outline" className="w-full text-base py-3">
                Start New Inspection (Different MHE/Dept)
              </Button>
               <Button onClick={() => resetInspectionState(false)} size="lg" variant="outline" className="w-full text-base py-3">
                Inspect Same MHE Again ({selectedMheDetails?.name || selectedMheId})
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <SafetyCheckModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={currentChecklistItemDetails} // This still uses MOCK_CHECKLIST_ITEMS
        onSubmit={handleInspectionSubmitForItem}
      />

      <AlertDialog open={showUnsafeWarningDialog} onOpenChange={setShowUnsafeWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Unsafe MHE Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              This MHE has been marked as unsafe. Do not operate. Report to your supervisor immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowUnsafeWarningDialog(false)}>
              Acknowledge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
