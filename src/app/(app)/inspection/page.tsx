'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CompletionProgress from '@/components/inspection/CompletionProgress';
import SafetyCheckModal from '@/components/inspection/SafetyCheckModal';
import SafetyAnalysisResult from '@/components/inspection/SafetyAnalysisResult';
import { MOCK_CHECKLIST_ITEMS, PLACEHOLDER_IMAGE_DATA_URL } from '@/lib/mock-data';
import type { ChecklistItem, InspectionRecordClientState } from '@/lib/mock-data';
import { analyzeForkliftSafety, type AnalyzeForkliftSafetyInput, type AnalyzeForkliftSafetyOutput } from '@/ai/flows/analyze-forklift-safety';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, ScanLine, AlertCircle, CheckCircle, Bot } from 'lucide-react';

export default function InspectionPage() {
  const [inspectionItems, setInspectionItems] = useState<InspectionRecordClientState[]>([]);
  const [currentItemIdToInspect, setCurrentItemIdToInspect] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeForkliftSafetyOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
    setCurrentItemIdToInspect(initialItems.length > 0 ? initialItems[0].id : null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
  }

  const completedItemsCount = useMemo(() => inspectionItems.filter(item => item.completed).length, [inspectionItems]);
  const totalItemsCount = MOCK_CHECKLIST_ITEMS.length;
  const isInspectionComplete = completedItemsCount === totalItemsCount;

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
    
    // Move to next uncompleted item or finish
    const nextUncompletedItem = inspectionItems.find(item => !item.completed && item.checklistItemId !== itemId);
    if (nextUncompletedItem) {
      setCurrentItemIdToInspect(nextUncompletedItem.checklistItemId);
    } else if (inspectionItems.every(item => item.completed || item.checklistItemId === itemId)) { // All items are now completed
      setCurrentItemIdToInspect(null); // No more items to select by default
    }
    setIsModalOpen(false);
  };

  const handleAnalyzeSafety = async () => {
    if (!isInspectionComplete) {
      toast({ title: "Incomplete Inspection", description: "Please complete all checklist items before analysis.", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);

    const inspectionRecordsForAI: AnalyzeForkliftSafetyInput['inspection_records'] = inspectionItems.map(item => ({
      checklist_item_id: item.checklistItemId,
      // Ensure photo_url is a valid data URI string, use placeholder if null
      photo_url: item.photo_url || PLACEHOLDER_IMAGE_DATA_URL, 
      is_safe: item.is_safe ?? false, // Default to false if null, though should always be boolean by this stage
      timestamp: item.timestamp || new Date().toISOString(),
    }));

    try {
      const result = await analyzeForkliftSafety({ inspection_records: inspectionRecordsForAI });
      setAnalysisResult(result);
      if(result.is_safe){
        toast({ title: "Safety Analysis Complete", description: "Forklift is safe for operation.", variant: "default" });
      } else {
         toast({ title: "Safety Analysis Complete", description: "Forklift is UNSAFE. Follow instructions.", variant: "destructive", duration: 10000 });
      }
    } catch (error) {
      console.error("Safety analysis failed:", error);
      toast({ title: "Analysis Error", description: "Could not analyze forklift safety.", variant: "destructive" });
      // Provide a mock unsafe result on AI error for user flow demonstration
      setAnalysisResult({is_safe: false, reason: "AI analysis failed. For safety, assume forklift is unsafe and contact supervisor."});
    } finally {
      setIsAnalyzing(false);
    }
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
            {isInspectionComplete && !analysisResult && " Ready for AI safety analysis."}
          </CardDescription>
        </CardHeader>
      </Card>

      {!analysisResult ? (
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
                  {availableItemsToInspect.length === 0 && (
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

          {/* Display checklist status */}
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


          {isInspectionComplete && (
            <div className="text-center mt-8">
              <Button onClick={handleAnalyzeSafety} disabled={isAnalyzing} size="lg" className="text-base py-3">
                <Bot className="mr-2 h-5 w-5" />
                {isAnalyzing ? 'Analyzing...' : 'Analyze Forklift Safety (AI)'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center space-y-6">
          <SafetyAnalysisResult analysisResult={analysisResult} isLoading={isAnalyzing} onResetInspection={resetInspectionState}/>
           {!analysisResult.is_safe && ( // This button might be redundant if the modal has one, but good for non-modal scenarios.
            <Button onClick={resetInspectionState} variant="outline" size="lg" className="mt-4">
              Start New Inspection
            </Button>
           )}
           {analysisResult.is_safe && (
            <Button onClick={resetInspectionState} variant="default" size="lg" className="mt-4">
                Start New Inspection
            </Button>
           )}
        </div>
      )}

      <SafetyCheckModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={currentChecklistItemDetails}
        onSubmit={handleInspectionSubmit}
      />
    </div>
  );
}
