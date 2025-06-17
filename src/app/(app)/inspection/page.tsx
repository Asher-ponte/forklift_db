
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CompletionProgress from '@/components/inspection/CompletionProgress';
import SafetyCheckModal from '@/components/inspection/SafetyCheckModal';
import type { ChecklistItem as SafetyCheckModalItem } from '@/lib/mock-data'; // Keep this for modal prop type
import type { StoredInspectionReport, Department, MheUnit, ChecklistMasterItem, DowntimeUnsafeItem, StoredDowntimeLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, ScanLine, AlertCircle, CheckCircle, AlertTriangle, Send, Edit3, Warehouse, TruckIcon, Loader2, Info, ZoomIn, ImageOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import ImageModal from '@/components/shared/ImageModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { isValid, parseISO } from 'date-fns';
import { PLACEHOLDER_IMAGE_DATA_URL } from '@/lib/mock-data';
import * as apiService from '@/services/apiService';

export interface InspectionRecordClientState {
  checklistItemId: string; // This will be the ID from ChecklistMasterItem
  part_name: string; // Snapshot from ChecklistMasterItem
  question: string; // Snapshot from ChecklistMasterItem
  is_safe: boolean | null;
  photo_url: string | null; // Data URI
  timestamp: string | null; // ISO string
  completed: boolean;
  remarks: string | null;
}

const isClickablePhoto = (url: string | null | undefined): url is string => {
  return !!(url && url !== PLACEHOLDER_IMAGE_DATA_URL && !url.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP"));
}

export default function InspectionPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [mheUnits, setMheUnits] = useState<MheUnit[]>([]);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedMheId, setSelectedMheId] = useState<string>(''); // This will be MheUnit.id (UUID)
  const [isInspectionSetupConfirmed, setIsInspectionSetupConfirmed] = useState(false);
  
  const [masterChecklist, setMasterChecklist] = useState<ChecklistMasterItem[]>([]);
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);

  const [inspectionItems, setInspectionItems] = useState<InspectionRecordClientState[]>([]);
  const [currentItemIdToInspect, setCurrentItemIdToInspect] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUnsafeWarningDialog, setShowUnsafeWarningDialog] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [previousReport, setPreviousReport] = useState<StoredInspectionReport | null>(null);
  const [isLoadingPreviousReport, setIsLoadingPreviousReport] = useState(false);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageAlt, setSelectedImageAlt] = useState<string>("Enlarged view");

  const openImageModal = (url: string, alt: string) => {
    setSelectedImageUrl(url);
    setSelectedImageAlt(alt);
    setIsImageModalOpen(true);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingInitialData(true);
      try {
        const [fetchedDepartments, fetchedMheUnits] = await Promise.all([
          apiService.fetchDepartments(),
          apiService.fetchMheUnits()
        ]);
        setDepartments(fetchedDepartments);
        setMheUnits(fetchedMheUnits);
        if (fetchedDepartments.length === 0) {
          toast({ title: "No Departments", description: "No departments found. Please configure them in Data Management.", variant: "default", duration: 5000 });
        }
      } catch (error) {
        toast({ title: "Error Loading Setup Data", description: (error instanceof Error) ? error.message : "Could not load departments or MHE units.", variant: "destructive" });
        setDepartments([]);
        setMheUnits([]);
      } finally {
        setIsLoadingInitialData(false);
      }
    };
    fetchInitialData();
  }, [toast]);

  const filteredMHEs = useMemo(() => {
    if (!selectedDepartmentId) return [];
    // Assuming MheUnit has department_id and status properties
    return mheUnits.filter(mhe => mhe.department_id === selectedDepartmentId && mhe.status !== 'inactive');
  }, [selectedDepartmentId, mheUnits]);

  useEffect(() => {
    if (isInspectionSetupConfirmed) {
      const fetchChecklist = async () => {
        setIsLoadingChecklist(true);
        try {
          const storedItems = await apiService.fetchChecklistItems();
          const activeItems = storedItems.filter(item => item.is_active !== false);

          if (activeItems.length > 0) {
            setMasterChecklist(activeItems);
          } else {
            setMasterChecklist([]);
            toast({
              title: "No Checklist Items",
              description: "No active inspection items found. Please configure them in Data Management. Inspection cannot proceed.",
              variant: "destructive",
              duration: 7000
            });
          }
        } catch (error) {
          setMasterChecklist([]);
          toast({ title: "Error Loading Checklist", description: (error instanceof Error) ? error.message : "Could not load checklist items.", variant: "destructive" });
        } finally {
          setIsLoadingChecklist(false);
        }
      };
      fetchChecklist();
    }
  }, [isInspectionSetupConfirmed, toast]);

  const resetInspectionState = useCallback((resetSelections = false) => {
    const initialItems = masterChecklist.map(item => ({
      checklistItemId: item.id, // Store the ID from the master checklist
      part_name: item.part_name, // Snapshot
      question: item.question, // Snapshot
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
      setMasterChecklist([]);
    }
  }, [masterChecklist]);

  useEffect(() => {
    if (isInspectionSetupConfirmed) {
      if (masterChecklist.length > 0) {
        resetInspectionState(false);
      } else if (!isLoadingChecklist) { 
        setInspectionItems([]);
        setCurrentItemIdToInspect(null);
      }
    }
  }, [isInspectionSetupConfirmed, masterChecklist, resetInspectionState, isLoadingChecklist]);

  const completedItemsCount = useMemo(() => inspectionItems.filter(item => item.completed).length, [inspectionItems]);
  const totalItemsCount = useMemo(() => masterChecklist.length, [masterChecklist]);
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

  const currentChecklistItemDetails: SafetyCheckModalItem | null = useMemo(() => {
    if (!currentItemIdToInspect) return null;
    const foundItem = masterChecklist.find(item => item.id === currentItemIdToInspect);
    if (!foundItem) return null;
    return {
      id: foundItem.id,
      qr_code_data: foundItem.qr_code_data || '', 
      part_name: foundItem.part_name,
      description: foundItem.description || 'No description provided.', 
      question: foundItem.question,
    };
  }, [currentItemIdToInspect, masterChecklist]);

  const selectedMheDetails = useMemo(() => {
    return mheUnits.find(mhe => mhe.id === selectedMheId); // MheUnit.id is UUID
  }, [selectedMheId, mheUnits]);

  useEffect(() => {
    if (selectedMheDetails?.unit_code && isInspectionSetupConfirmed) { // Use unit_code for fetching
      const unitCode = selectedMheDetails.unit_code;
      const fetchPreviousReport = async () => {
        setIsLoadingPreviousReport(true);
        setPreviousReport(null); 
        try {
          const reportsForUnit = await apiService.fetchInspectionReportsByUnitId(unitCode);
          const sortedReports = reportsForUnit
            .sort((a, b) => {
              try {
                const dateA = parseISO(a.date);
                const dateB = parseISO(b.date);
                if (!isValid(dateA) && !isValid(dateB)) return 0;
                if (!isValid(dateA)) return 1; 
                if (!isValid(dateB)) return -1;
                return dateB.getTime() - dateA.getTime();
              } catch (e) { return 0; }
            });
          
          setPreviousReport(sortedReports.length > 0 ? sortedReports[0] : null);
        } catch (error) {
          toast({ title: "Error Loading Previous Report", description: (error instanceof Error) ? error.message : "Could not load data.", variant: "destructive" });
          setPreviousReport(null);
        } finally {
          setIsLoadingPreviousReport(false);
        }
      };
      fetchPreviousReport();
    } else {
      setPreviousReport(null); 
      if(isLoadingPreviousReport) setIsLoadingPreviousReport(false);
    }
  }, [selectedMheDetails, isInspectionSetupConfirmed, toast]); 

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
    setSelectedMheId(''); 
    setIsInspectionSetupConfirmed(false); 
    setPreviousReport(null); 
  };

  const handleQrScanOrSelect = (itemId: string) => {
    const itemToInspect = masterChecklist.find(i => i.id === itemId);
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

  const availableItemsToInspect = useMemo(() => masterChecklist.filter(mItem =>
    !inspectionItems.find(iItem => iItem.checklistItemId === mItem.id)?.completed
  ), [masterChecklist, inspectionItems]);

  const handleSubmitReport = async () => {
    if (!isInspectionComplete || !user || !selectedMheDetails || totalItemsCount === 0) {
        if (totalItemsCount === 0) {
            toast({ title: "Cannot Submit", description: "No checklist items were available for this inspection.", variant: "destructive" });
        }
        return;
    }
    setIsSubmittingReport(true);

    const overallStatus = hasUnsafeItems ? 'Unsafe' : 'Safe';
    const reportDate = new Date().toISOString();

    // Prepare report items for API submission
    const reportItemsForApi = inspectionItems.map(item => ({
      checklist_item_id_fk: item.checklistItemId, // Link to master item
      part_name_snapshot: item.part_name,
      question_snapshot: item.question,
      is_safe: item.is_safe,
      photo_url: item.photo_url, // This will be a base64 data URI
      timestamp: item.timestamp,
      remarks: item.remarks,
    }));

    const newReportPayload = {
      unit_id_fk: selectedMheDetails.id, // Use the UUID of the MHE Unit
      unit_code_display: selectedMheDetails.unit_code,
      date: reportDate,
      operator_username: user.username,
      status: overallStatus,
      user_id_fk: user.id, // Assuming user object has id from API
      items: reportItemsForApi,
    };

    try {
      const savedReport = await apiService.addInspectionReport(newReportPayload);
      toast({
        title: "Report Submitted",
        description: `Inspection report for MHE ${selectedMheDetails.unit_code} has been saved via API.`,
      });

      if (savedReport.status === 'Unsafe') {
        const unsafeItemsForDowntimeLog: DowntimeUnsafeItem[] = (savedReport.items || [])
          .filter(item => item.is_safe === false)
          .map(item => ({
            part_name: item.part_name_snapshot, // Use snapshot
            remarks: item.remarks || null,
            photo_url: item.photo_url || null, // Data URI
          }));

        let downtimeReason = `Unit ${savedReport.unit_code_display} failed inspection.`;
        if (unsafeItemsForDowntimeLog.length > 0) {
          downtimeReason += ` ${unsafeItemsForDowntimeLog.length} item(s) reported as unsafe.`;
        }

        const newDowntimeLogPayload: Omit<StoredDowntimeLog, 'id' | 'logged_at'> = { // API will set id and logged_at
          unit_id_fk: selectedMheDetails.id, // MHE Unit UUID
          unit_code_display: selectedMheDetails.unit_code,
          reason: downtimeReason,
          start_time: reportDate,
          end_time: null,
          user_id_fk: user.id,
          unsafe_items: unsafeItemsForDowntimeLog.length > 0 ? unsafeItemsForDowntimeLog : undefined,
          source_report_id_fk: savedReport.id, // ID of the inspection report from API response
        };
        
        await apiService.addDowntimeLog(newDowntimeLogPayload);
        toast({
            title: "Downtime Logged Automatically",
            description: `Unsafe unit ${savedReport.unit_code_display}. Downtime logged with ${unsafeItemsForDowntimeLog.length} unsafe item(s) via API.`,
            variant: "default"
        });
      }
      resetInspectionState(true); 
    } catch (error) {
      console.error("Error submitting report via API:", error);
      toast({
        title: "Submission Error",
        description: (error instanceof Error) ? error.message : "Could not save data via API.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (isLoadingInitialData) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading setup data from API...</p>
      </div>
    );
  }

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
              <Select value={selectedDepartmentId} onValueChange={handleDepartmentChange} disabled={departments.length === 0}>
                <SelectTrigger id="departmentSelect" className="w-full text-base">
                  <SelectValue placeholder={departments.length === 0 ? "No departments defined" : "Select a department..."} />
                </SelectTrigger>
                <SelectContent>
                  {departments.length > 0 ? departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id} className="text-base py-2">
                      {dept.name}
                    </SelectItem>
                  )) : <div className="p-4 text-center text-sm text-muted-foreground">No departments available. <Link href="/data-management" className="text-primary hover:underline">Add Departments</Link></div>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mheSelect" className="flex items-center"><TruckIcon className="mr-2 h-4 w-4 text-muted-foreground"/>MHE ID</Label>
              <Select value={selectedMheId} onValueChange={setSelectedMheId} disabled={!selectedDepartmentId || filteredMHEs.length === 0}>
                <SelectTrigger id="mheSelect" className="w-full text-base">
                  <SelectValue placeholder={!selectedDepartmentId ? "Select department first" : (filteredMHEs.length === 0 ? "No MHEs in department" : "Select an MHE ID...")} />
                </SelectTrigger>
                <SelectContent>
                  {filteredMHEs.length > 0 ? (
                    filteredMHEs.map(mhe => (
                      <SelectItem key={mhe.id} value={mhe.id} className="text-base py-2">
                        {mhe.name} ({mhe.unit_code})
                      </SelectItem>
                    ))
                  ) : selectedDepartmentId ? (
                     <div className="p-4 text-center text-sm text-muted-foreground">No MHEs found for this department. <Link href="/data-management" className="text-primary hover:underline">Add MHE Units</Link></div>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleStartInspectionSetup} size="lg" className="w-full text-base py-3" disabled={!selectedDepartmentId || !selectedMheId || isLoadingChecklist || (departments.length === 0 || filteredMHEs.length === 0 && !!selectedDepartmentId) }>
              {isLoadingChecklist ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Start Inspection for {selectedMheDetails?.unit_code || "Selected MHE"}
            </Button>
             {departments.length === 0 && (
                <p className="text-sm text-center text-muted-foreground">
                    Please add Departments in <Link href="/data-management" className="text-primary hover:underline">Data Management</Link> first.
                </p>
            )}
            {selectedDepartmentId && filteredMHEs.length === 0 && departments.length > 0 && (
                 <p className="text-sm text-center text-muted-foreground">
                    No MHE units available in the selected department. Add them in <Link href="/data-management" className="text-primary hover:underline">Data Management</Link>.
                </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingChecklist) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading checklist items from API...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ImageModal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} imageUrl={selectedImageUrl} altText={selectedImageAlt} />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <ListChecks className="mr-3 h-8 w-8 text-primary" />
            Inspection: {selectedMheDetails?.name || selectedMheDetails?.unit_code || selectedMheId}
          </CardTitle>
          <CardDescription>
            Complete all checklist items to ensure equipment safety. Data saved via API.
            {totalItemsCount === 0 && " No checklist items loaded. Please configure them in Data Management."}
            {isInspectionComplete && totalItemsCount > 0 && " All items inspected."}
          </CardDescription>
        </CardHeader>
        <CardContent>
             <Button onClick={() => resetInspectionState(true)} variant="outline" size="sm">
                Change Department/MHE
            </Button>
        </CardContent>
      </Card>

      {isInspectionSetupConfirmed && selectedMheDetails && (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="text-xl flex items-center">
                    <Info className="mr-2 h-5 w-5 text-primary" /> Previous Inspection Summary
                </CardTitle>
                <CardDescription>
                    For MHE: {selectedMheDetails.name} ({selectedMheDetails.unit_code})
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingPreviousReport ? (
                    <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading previous report from API...</div>
                ) : previousReport ? (
                    <Accordion type="single" collapsible className="w-full" defaultValue="previous-report-details">
                        <AccordionItem value="previous-report-details">
                            <AccordionTrigger className="text-base hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-md px-2 -mx-2">
                                <div className="flex justify-between items-center w-full">
                                    <span className="text-left">
                                        Last Inspected: {new Date(previousReport.date).toLocaleString()}
                                    </span>
                                    <Badge 
                                        variant={previousReport.status === 'Safe' ? 'default' : 'destructive'}
                                        className={previousReport.status === 'Safe' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}
                                    >
                                        {previousReport.status}
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-3">
                                <p><span className="font-semibold">Operator:</span> {previousReport.operator_username}</p>
                                <p><span className="font-semibold">Report ID:</span> <span className="text-xs font-mono">{previousReport.id}</span></p>
                                {previousReport.status === 'Unsafe' && previousReport.items.some(item => item.is_safe === false) && (
                                    <div>
                                        <h4 className="font-semibold text-destructive mb-2">Unsafe Items Noted:</h4>
                                        <ul className="space-y-3">
                                            {previousReport.items.filter(item => item.is_safe === false).map((item, index) => (
                                                <li key={`unsafe-${index}-${item.checklistItemId || index}`} className="flex items-start space-x-3 p-2 border-l-4 border-destructive bg-destructive/5 rounded-md">
                                                    <div className="flex-shrink-0 w-16 h-12 relative">
                                                        {isClickablePhoto(item.photo_url) ? (
                                                          <div role="button" tabIndex={0} onClick={() => openImageModal(item.photo_url!, item.part_name_snapshot || 'Unsafe item image')} onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') openImageModal(item.photo_url!, item.part_name_snapshot || 'Unsafe item image');}} className="relative group block w-full h-full p-0 border-none bg-transparent cursor-pointer">
                                                            <Image
                                                              src={item.photo_url!}
                                                              alt={item.part_name_snapshot || 'Unsafe item image'}
                                                              width={64}
                                                              height={48}
                                                              objectFit="cover"
                                                              className="rounded-md group-hover:opacity-80 transition-opacity"
                                                              data-ai-hint={item.part_name_snapshot ? item.part_name_snapshot.toLowerCase().split(' ').slice(0,2).join(' ') : "defect detail"}
                                                              onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                                                            />
                                                            <ZoomIn className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-0.5" />
                                                          </div>
                                                        ) : (
                                                          <div className="w-full h-full flex items-center justify-center bg-muted rounded-md">
                                                            <ImageOff className="h-6 w-6 text-muted-foreground" />
                                                          </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-medium text-sm">{item.part_name_snapshot}</p>
                                                        {item.remarks && <p className="text-xs text-muted-foreground mt-0.5">{item.remarks}</p>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                 {previousReport.status === 'Safe' && (
                                    <p className="text-green-600">All items were reported as safe in the previous inspection.</p>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                ) : (
                    <p className="text-muted-foreground">No previous inspection data found for this MHE unit via API.</p>
                )}
            </CardContent>
        </Card>
      )}

      {totalItemsCount === 0 && !isLoadingChecklist && isInspectionSetupConfirmed ? (
         <Card className="shadow-md">
            <CardHeader><CardTitle className="text-xl text-destructive">No Inspection Items</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    There are no active inspection items configured in the API. Please go to the 
                    <Link href="/data-management" className="text-primary hover:underline mx-1">Data Management</Link> 
                    page to add checklist items before starting an inspection.
                </p>
            </CardContent>
         </Card>
      ) : isInspectionSetupConfirmed && !isInspectionComplete ? (
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
                disabled={availableItemsToInspect.length === 0 || isModalOpen || totalItemsCount === 0}
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
                  {availableItemsToInspect.length === 0 && !isInspectionComplete && totalItemsCount > 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">All items inspected. Preparing for next step.</div>
                  )}
                   {availableItemsToInspect.length === 0 && isInspectionComplete && totalItemsCount > 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">All items inspected.</div>
                  )}
                  {totalItemsCount === 0 && (
                     <div className="p-4 text-center text-sm text-muted-foreground">No items to inspect.</div>
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={() => currentItemIdToInspect && handleQrScanOrSelect(currentItemIdToInspect)}
                disabled={!currentItemIdToInspect || isModalOpen || availableItemsToInspect.length === 0 || totalItemsCount === 0}
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
      ) : isInspectionSetupConfirmed && isInspectionComplete && totalItemsCount > 0 ? ( 
        <div className="text-center mt-8 space-y-6">
          <Card className="shadow-lg w-full max-w-md mx-auto">
            <CardHeader className="text-center">
               {hasUnsafeItems ? (
                 <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-3" />
               ) : (
                 <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-3" />
               )}
              <CardTitle className="font-headline text-2xl">
                Inspection Complete for {selectedMheDetails?.name || selectedMheDetails?.unit_code || selectedMheId}!
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
                Inspect Same MHE Again ({selectedMheDetails?.name || selectedMheDetails?.unit_code || selectedMheId})
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <SafetyCheckModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={currentChecklistItemDetails} 
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
