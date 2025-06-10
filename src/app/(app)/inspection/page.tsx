
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CompletionProgress from '@/components/inspection/CompletionProgress';
import SafetyCheckModal from '@/components/inspection/SafetyCheckModal';
import { MOCK_CHECKLIST_ITEMS, PLACEHOLDER_IMAGE_DATA_URL } from '@/lib/mock-data';
import type { ChecklistItem, InspectionRecordClientState } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, ScanLine, AlertCircle, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function InspectionPage() {
  const [inspectionItems, setInspectionItems] = useState<InspectionRecordClientState[]>([]);
  const [currentItemIdToInspect, setCurrentItemIdToInspect] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUnsafeWarningDialog, setShowUnsafeWarningDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    resetInspectionState();
  }, []);

  const resetInspectionState = () => {
    const initialItems = MOCK_CHECKLIST_ITEMS.map(item => ({
      checklistItemId: item.id,
      part_name: item.part_name,
      question: item.question,
      is_safe: null,
      photo_url: null,
      timestamp: null,
      completed: false,
    }));
    setInspectionItems(initialItems);
    setCurrentItemIdToInspect(initialItems.length > 0 ? initialItems[0].checklistItemId : null);
    setShowUnsafeWarningDialog(false); // Reset dialog state
  }

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


  const handleQrScanOrSelect = (itemId: string) => {
    const itemToInspect = MOCK_CHECKLIST_ITEMS.find(i => i.id === itemId);
    if (itemToInspect) {
      setCurrentItemIdToInspect(itemToInspect.id);
      setIsModalOpen(true);
    } else {
      toast({ title: "Error", description: "Checklist item not found.", variant: "destructive" });
    }
  };

  const handleInspectionSubmit = (itemId: string, isSafe: boolean, photoUrl: string) => {
    setInspectionItems(prevItems =>
      prevItems.map(item =>
        item.checklistItemId === itemId
          ? { ...item, is_safe: isSafe, photo_url: photoUrl, timestamp: new Date().toISOString(), completed: true }
          : item
      )
    );
    
    const nextUncompletedItem = inspectionItems.find(item => !item.completed && item.checklistItemId !== itemId);
    // Find the *next* item that isn't the one just submitted and isn't completed
    // This needs to be based on the *updated* state, so we check against prevItems implicitly
     setInspectionItems(currentItems => {
        const updatedItems = currentItems.map(item =>
            item.checklistItemId === itemId
            ? { ...item, is_safe: isSafe, photo_url: photoUrl, timestamp: new Date().toISOString(), completed: true }
            : item
        );

        const stillPendingItems = updatedItems.filter(i => !i.completed);
        if (stillPendingItems.length > 0) {
            setCurrentItemIdToInspect(stillPendingItems[0].checklistItemId);
        } else {
            setCurrentItemIdToInspect(null); // All items are completed
        }
        return updatedItems;
    });


    setIsModalOpen(false);
  };
  
  const availableItemsToInspect = MOCK_CHECKLIST_ITEMS.filter(mItem => 
    !inspectionItems.find(iItem => iItem.checklistItemId === mItem.id)?.completed
  );

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <ListChecks className="mr-3 h-8 w-8 text-primary" />
            Forklift Inspection
          </CardTitle>
          <CardDescription>
            Complete all checklist items to ensure forklift safety. 
            {isInspectionComplete && " All items inspected."}
          </CardDescription>
        </CardHeader>
      </Card>

      {!isInspectionComplete ? (
        <>
          <CompletionProgress completedItems={completedItemsCount} totalItems={totalItemsCount} />
          
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Inspect Item</CardTitle>
              <CardDescription>Select an item to inspect or simulate a QR code scan.</CardDescription>
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
                          <AlertCircle className="mr-1 h-4 w-4" /> Unsafe
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
        <div className="text-center mt-8 space-y-4">
          <Card className="shadow-lg w-full max-w-md mx-auto">
            <CardHeader className="text-center">
               <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-3" />
              <CardTitle className="font-headline text-2xl">
                Inspection Complete!
              </CardTitle>
              <CardDescription>All checklist items have been successfully inspected.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={resetInspectionState} size="lg" className="w-full text-base py-3">
                Start New Inspection
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <SafetyCheckModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={currentChecklistItemDetails}
        onSubmit={handleInspectionSubmit}
      />

      <AlertDialog open={showUnsafeWarningDialog} onOpenChange={setShowUnsafeWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsafe MHE Warning</AlertDialogTitle>
            <AlertDialogDescription>
              Do not use the MHE report to supervisor.
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
