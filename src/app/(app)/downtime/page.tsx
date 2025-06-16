
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
import { RefreshCw, ListChecks, CheckSquare, Edit, Eye, ZoomIn, ImageOff, PlusCircle, History } from 'lucide-react';
import type { StoredDowntimeLog, DowntimeUnsafeItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import ImageModal from '@/components/shared/ImageModal';
import { PLACEHOLDER_IMAGE_DATA_URL } from '@/lib/mock-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DOWNTIME_STORAGE_KEY = 'forkliftDowntimeLogs';

const getStoredDowntimeLogs = (): StoredDowntimeLog[] => {
  if (typeof window === 'undefined') return [];
  const logsJson = localStorage.getItem(DOWNTIME_STORAGE_KEY);
  return logsJson ? JSON.parse(logsJson) : [];
};

const saveStoredDowntimeLogs = (logs: StoredDowntimeLog[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DOWNTIME_STORAGE_KEY, JSON.stringify(logs));
};


export default function DowntimePage() {
  const [downtimeLogs, setDowntimeLogs] = useState<StoredDowntimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEndTimeModalOpen, setIsEndTimeModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<StoredDowntimeLog | null>(null);
  const [currentEditingEndTime, setCurrentEditingEndTime] = useState('');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<StoredDowntimeLog | null>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("viewLogs");

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageAlt, setSelectedImageAlt] = useState<string>("Enlarged view");

  const openImageModal = (url: string, alt: string) => {
    setSelectedImageUrl(url);
    setSelectedImageAlt(alt);
    setIsImageModalOpen(true);
  };

  const loadDowntimeLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const logsFromStorage = getStoredDowntimeLogs();
      
      const validLogs = logsFromStorage.filter(log =>
        log && typeof log.id === 'string' && typeof log.unitId === 'string' &&
        typeof log.reason === 'string' && typeof log.startTime === 'string' &&
        typeof log.loggedAt === 'string' && (log.endTime === null || typeof log.endTime === 'string' || typeof log.endTime === 'undefined') &&
        (log.unsafeItems === undefined || Array.isArray(log.unsafeItems)) 
      ).sort((a, b) => {
          let dateAVal: number, dateBVal: number;
          try { dateAVal = new Date(a.loggedAt).getTime(); } catch { dateAVal = NaN; }
          try { dateBVal = new Date(b.loggedAt).getTime(); } catch { dateBVal = NaN; }

          if (isNaN(dateAVal) && isNaN(dateBVal)) return 0;
          if (isNaN(dateAVal)) return 1;
          if (isNaN(dateBVal)) return -1;
          return dateBVal - dateAVal;
        });

      setDowntimeLogs(validLogs);
      if (typeof window !== 'undefined') {
        toast({ title: "Downtime Logs Loaded", description: "Data loaded from local storage.", duration: 3000 });
      }
    } catch (error) {
      console.error("An unexpected error occurred while loading downtime logs from localStorage:", error);
      setDowntimeLogs([]); 
      if (typeof window !== 'undefined') {
        toast({
          title: "Error Loading Downtime Logs",
          description: (error instanceof Error) ? error.message : "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDowntimeLogs();
  }, [loadDowntimeLogs]);

  const formatDateTime = (isoString: string | null | undefined) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date string encountered in formatDateTime: ${isoString}`);
        return 'Invalid Date';
      }
      return date.toLocaleString();
    } catch (e) {
      console.error(`Error formatting date string: ${isoString}`, e);
      return 'Error Date';
    }
  };

  const handleOpenEditEndTimeModal = (log: StoredDowntimeLog) => {
    setSelectedLogForEdit(log);
    let initialEndTime = '';

    if (log.endTime && typeof log.endTime === 'string') {
        try {
            const d = new Date(log.endTime);
            if (!isNaN(d.getTime())) {
                const offset = d.getTimezoneOffset() * 60000;
                initialEndTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
            } else {
                 console.warn(`Invalid log.endTime for input: ${log.endTime}`);
            }
        } catch (e) {
            console.error(`Error processing log.endTime for input: ${log.endTime}`, e);
        }
    }

    if (!initialEndTime) {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        initialEndTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    }
    
    setCurrentEditingEndTime(initialEndTime);
    setIsEndTimeModalOpen(true);
  };

  const handleSaveEndTime = async () => {
    if (!selectedLogForEdit || !currentEditingEndTime) {
      toast({ title: "Error", description: "End time cannot be empty.", variant: "destructive" });
      return;
    }

    try {
      const currentLogs = getStoredDowntimeLogs();
      const logIndex = currentLogs.findIndex(log => log.id === selectedLogForEdit.id);

      if (logIndex === -1) {
        toast({ title: "Update Error", description: "Log not found in local storage.", variant: "destructive" });
        return;
      }
      
      currentLogs[logIndex].endTime = new Date(currentEditingEndTime).toISOString();
      saveStoredDowntimeLogs(currentLogs);
      
      toast({ title: "Success", description: `End time updated for unit ${selectedLogForEdit.unitId} in local storage.` });
      
      loadDowntimeLogs(); 
      setIsEndTimeModalOpen(false);
      setSelectedLogForEdit(null);

    } catch (error) {
        console.error("Error updating end time in localStorage:", error);
        toast({ title: "Update Error", description: (error instanceof Error) ? error.message : "Could not update end time locally.", variant: "destructive" });
    }
  };

  const handleOpenDetailsModal = (log: StoredDowntimeLog) => {
    setSelectedLogForDetails(log);
    setIsDetailsModalOpen(true);
  };

  const isClickablePhoto = (url: string | null | undefined): url is string => {
    return !!(url && url !== PLACEHOLDER_IMAGE_DATA_URL && !url.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP"));
  }

  const handleLogAdded = () => {
    loadDowntimeLogs();
    setActiveTab("viewLogs");
  }

  return (
    <div className="space-y-8">
      <ImageModal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} imageUrl={selectedImageUrl} altText={selectedImageAlt} />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="logNew" className="py-2.5 text-sm">
             <PlusCircle className="mr-2 h-5 w-5"/> Log New Downtime
          </TabsTrigger>
          <TabsTrigger value="viewLogs" className="py-2.5 text-sm">
            <History className="mr-2 h-5 w-5"/> View Downtime Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logNew">
          <DowntimeForm onLogAdded={handleLogAdded} />
        </TabsContent>

        <TabsContent value="viewLogs">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle className="font-headline text-2xl flex items-center">
                  <ListChecks className="mr-3 h-7 w-7 text-primary" />
                  Recent Downtime Logs
                </CardTitle>
                <CardDescription>List of all recorded forklift downtime incidents from local storage. Set end times to mark repairs as complete. View details for inspection-generated logs.</CardDescription>
              </div>
              <Button onClick={loadDowntimeLogs} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" /> {isLoading ? "Refreshing..." : "Refresh Logs"}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-4">Loading downtime logs from local storage...</p>
              ) : downtimeLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No downtime logs recorded locally yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit ID</TableHead>
                      <TableHead className="min-w-[200px]">Reason</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Logged At</TableHead>
                      <TableHead className="text-center">Details</TableHead>
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
                        <TableCell className="text-center">
                          {log.unsafeItems && log.unsafeItems.length > 0 ? (
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDetailsModal(log)}>
                              <Eye className="mr-1 h-4 w-4" /> View
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">N/A</span>
                          )}
                        </TableCell>
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
        </TabsContent>
      </Tabs>

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

      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Unsafe Item Details for Unit {selectedLogForDetails?.unitId}</DialogTitle>
            <DialogDescription>
              The following items were reported as unsafe during the inspection that triggered this downtime log.
            </DialogDescription>
          </DialogHeader>
          {selectedLogForDetails?.unsafeItems && selectedLogForDetails.unsafeItems.length > 0 ? (
            <div className="py-4 max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-center">Photo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedLogForDetails.unsafeItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.part_name}</TableCell>
                      <TableCell>{item.remarks || <span className="text-xs text-muted-foreground italic">No remarks</span>}</TableCell>
                      <TableCell className="text-center">
                        {isClickablePhoto(item.photo_url) ? (
                          <div role="button" tabIndex={0} onClick={() => openImageModal(item.photo_url!, item.part_name || 'Unsafe item image')} onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') openImageModal(item.photo_url!, item.part_name || 'Unsafe item image');}} className="relative group p-0 border-none bg-transparent h-auto cursor-pointer inline-block">
                            <Image
                              src={item.photo_url!}
                              alt={item.part_name || 'Unsafe item image'}
                              width={100}
                              height={75}
                              className="rounded-md object-cover mx-auto group-hover:opacity-80 transition-opacity"
                              data-ai-hint={item.part_name ? item.part_name.toLowerCase().split(' ').slice(0,2).join(' ') : "defect detail"}
                              onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                            />
                            <ZoomIn className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1" />
                          </div>
                        ) : (
                           <div className="flex items-center justify-center text-muted-foreground text-xs">
                              { item.photo_url && item.photo_url !== PLACEHOLDER_IMAGE_DATA_URL && !item.photo_url.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP") ? (
                                <Image
                                  src={item.photo_url}
                                  alt={item.part_name || 'Unsafe item image'}
                                  width={100}
                                  height={75}
                                  className="rounded-md object-cover mx-auto"
                                  data-ai-hint={item.part_name ? item.part_name.toLowerCase().split(' ').slice(0,2).join(' ') : "defect detail"}
                                  onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                                />
                              ) : (
                                <><ImageOff className="mr-1 h-4 w-4"/> No Photo</>
                              )}
                            </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-4 text-muted-foreground">No specific unsafe items were recorded with this downtime log.</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

