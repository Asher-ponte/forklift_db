
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download, Filter, RefreshCw, CheckCircle, AlertCircle, ImageOff, MessageSquare, ExternalLink, Trash2, Edit } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { useState, useMemo, useEffect, useCallback } from "react";
import type { StoredInspectionReport, StoredDowntimeLog } from '@/lib/types';
import type { InspectionRecordClientState } from '@/lib/mock-data';
import { PLACEHOLDER_IMAGE_DATA_URL } from '@/lib/mock-data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ReportDisplayEntry {
  id: string;
  unitId: string;
  date: string;
  operator: string;
  status: 'Safe' | 'Unsafe';
  representativePhotoUrl: string;
  representativeDataAiHint: string;
  rawDate: Date;
  items: InspectionRecordClientState[];
}

const REPORTS_STORAGE_KEY = 'forkliftInspectionReports';
const DOWNTIME_STORAGE_KEY = 'forkliftDowntimeLogs';


const getFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const item = localStorage.getItem(key);
  if (item) {
    try {
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`Error parsing localStorage item ${key}:`, e);
      return defaultValue;
    }
  }
  return defaultValue;
};

const saveToLocalStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving to localStorage item ${key}:`, e);
  }
};

export default function ReportPage() {
  const [allReports, setAllReports] = useState<ReportDisplayEntry[]>([]);
  const [filterUnitId, setFilterUnitId] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<{ from: string, to: string }>({ from: '', to: '' });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [reportToDeleteId, setReportToDeleteId] = useState<string | null>(null);

  const processReportsToDisplayEntries = (reportsFromStorage: StoredInspectionReport[]): ReportDisplayEntry[] => {
    return reportsFromStorage.map(report => {
      let representativePhoto = PLACEHOLDER_IMAGE_DATA_URL;
      let hint = 'forklift general';
      if (report.status === 'Unsafe') {
        const unsafeItemWithPhoto = report.items?.find(item => !item.is_safe && item.photo_url && item.photo_url !== PLACEHOLDER_IMAGE_DATA_URL);
        if (unsafeItemWithPhoto) {
          representativePhoto = unsafeItemWithPhoto.photo_url!;
          hint = unsafeItemWithPhoto.part_name;
        } else {
           const firstItemWithPhoto = report.items?.find(item => item.photo_url && item.photo_url !== PLACEHOLDER_IMAGE_DATA_URL);
           if(firstItemWithPhoto) representativePhoto = firstItemWithPhoto.photo_url!;
           hint = "issue";
        }
      } else {
        const firstItemWithPhoto = report.items?.find(item => item.photo_url && item.photo_url !== PLACEHOLDER_IMAGE_DATA_URL);
        if(firstItemWithPhoto) {
          representativePhoto = firstItemWithPhoto.photo_url!;
          hint = firstItemWithPhoto.part_name;
        }
      }
      return {
        id: report.id,
        unitId: report.unitId,
        date: new Date(report.date).toLocaleString(),
        operator: report.operator,
        status: report.status,
        representativePhotoUrl: representativePhoto,
        representativeDataAiHint: hint.substring(0,50),
        rawDate: new Date(report.date),
        items: report.items || [],
      };
    }).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  };

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      let reportsFromStorage = getFromLocalStorage<StoredInspectionReport[]>(REPORTS_STORAGE_KEY, []);
      
      setAllReports(processReportsToDisplayEntries(reportsFromStorage));
      toast({ title: "Reports Loaded", description: "Data loaded from local storage.", duration: 3000 });

    } catch (error) {
      console.error("Failed to fetch reports from localStorage:", error);
      toast({ title: "Error Loading Reports", description: (error instanceof Error) ? error.message : "Could not fetch reports from local storage.", variant: "destructive" });
      setAllReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    loadReports();
  }, [loadReports]);


  const filteredData = useMemo(() => {
    return allReports.filter(report => {
      const unitIdMatch = filterUnitId ? report.unitId.toLowerCase().includes(filterUnitId.toLowerCase()) : true;
      
      let dateMatch = true;
      if (filterDateRange.from || filterDateRange.to) {
        const reportDateOnly = new Date(report.rawDate);
        reportDateOnly.setHours(0,0,0,0);

        if (filterDateRange.from) {
          const fromDate = new Date(filterDateRange.from);
          fromDate.setHours(0,0,0,0); 
          if (reportDateOnly < fromDate) dateMatch = false;
        }
        if (filterDateRange.to && dateMatch) {
          const toDate = new Date(filterDateRange.to);
          toDate.setHours(23,59,59,999); 
          if (reportDateOnly > toDate) dateMatch = false;
        }
      }
      return unitIdMatch && dateMatch;
    });
  }, [allReports, filterUnitId, filterDateRange.from, filterDateRange.to]);


  const handleExportCsv = () => {
    const headers = ["Inspection ID", "Unit ID", "Date", "Operator", "Overall Status", "Checklist Item", "Item Status", "Item Timestamp", "Remarks", "Photo URL"];
    const csvRows: string[] = [headers.join(',')];

    filteredData.forEach(report => {
      (report.items || []).forEach(item => {
        const row = [
          report.id,
          report.unitId,
          report.date,
          report.operator,
          report.status,
          item.part_name,
          item.is_safe === null ? 'Pending' : item.is_safe ? 'Safe' : 'Unsafe',
          item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A',
          item.remarks || '',
          item.photo_url || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`);
        csvRows.push(row.join(','));
      });
       if (!report.items || report.items.length === 0) {
        const row = [
          report.id,
          report.unitId,
          report.date,
          report.operator,
          report.status,
          'N/A', 'N/A', 'N/A', '', ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`);
        csvRows.push(row.join(','));
      }
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `forklift_report_detailed_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isClickablePhoto = (url: string | null | undefined) => url && url !== PLACEHOLDER_IMAGE_DATA_URL && !url.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP");

  const handleOpenDeleteDialog = (id: string) => {
    setReportToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!reportToDeleteId) return;

    try {
      // Delete the inspection report
      const currentReports = getFromLocalStorage<StoredInspectionReport[]>(REPORTS_STORAGE_KEY, []);
      const updatedReports = currentReports.filter(report => report.id !== reportToDeleteId);
      saveToLocalStorage(REPORTS_STORAGE_KEY, updatedReports);
      toast({ title: "Report Deleted", description: `Report ID ${reportToDeleteId.substring(0,8)}... removed from local storage.` });

      // Check for and delete associated downtime log
      const currentDowntimeLogs = getFromLocalStorage<StoredDowntimeLog[]>(DOWNTIME_STORAGE_KEY, []);
      const updatedDowntimeLogs = currentDowntimeLogs.filter(log => log.sourceReportId !== reportToDeleteId);

      if (currentDowntimeLogs.length !== updatedDowntimeLogs.length) {
        saveToLocalStorage(DOWNTIME_STORAGE_KEY, updatedDowntimeLogs);
        toast({ title: "Associated Downtime Log Deleted", description: `Downtime log linked to report ${reportToDeleteId.substring(0,8)}... also removed.`, duration: 4000 });
      }
      
      loadReports(); // Refresh the list on the current page
    } catch (error) {
      console.error("Error deleting report or associated downtime log from localStorage:", error);
      toast({ title: "Deletion Error", description: (error instanceof Error) ? error.message : "Could not delete data from local storage.", variant: "destructive" });
    } finally {
      setIsDeleteConfirmOpen(false);
      setReportToDeleteId(null);
    }
  };


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <FileText className="mr-3 h-8 w-8 text-primary" />
            Forklift Inspection Report
          </CardTitle>
          <CardDescription>View, filter, and manage forklift inspection history from local storage.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Filter className="mr-2 h-5 w-5" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="filterUnitId" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Unit ID</label>
            <Input
              id="filterUnitId"
              placeholder="e.g. FL001"
              value={filterUnitId}
              onChange={(e) => setFilterUnitId(e.target.value)}
              className="text-base"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="filterDateFrom" className="block text-sm font-medium text-muted-foreground mb-1">Date From</label>
              <Input
                id="filterDateFrom"
                type="date"
                value={filterDateRange.from}
                onChange={(e) => setFilterDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="text-base"
              />
            </div>
            <div>
              <label htmlFor="filterDateTo" className="block text-sm font-medium text-muted-foreground mb-1">Date To</label>
              <Input
                id="filterDateTo"
                type="date"
                value={filterDateRange.to}
                onChange={(e) => setFilterDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="text-base"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:col-span-1 lg:col-span-1 lg:items-end">
            <Button onClick={handleExportCsv} className="w-full sm:w-auto text-base">
              <Download className="mr-2 h-5 w-5" /> Export CSV
            </Button>
            <Button onClick={loadReports} variant="outline" className="w-full sm:w-auto text-base">
              <RefreshCw className="mr-2 h-5 w-5" /> Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-0">
           <div className="hidden md:flex items-center px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
              <div className="w-[20%] pl-1">Unit ID</div>
              <div className="w-[25%]">Date</div>
              <div className="w-[20%]">Operator</div>
              <div className="w-[15%]">Status</div>
              <div className="w-[20%] text-center">Photo</div> {/* Adjusted widths slightly */}
              {/* Actions column header removed as buttons are moved */}
              <div className="w-[0%]"></div> {/* Spacer for chevron, adjust if needed */}
            </div>
          {isLoading ? (
            <div className="text-center p-10 text-muted-foreground">Loading reports...</div>
          ) : (
          <Accordion type="multiple" className="w-full">
            {filteredData.map((report) => (
              <AccordionItem value={report.id} key={report.id} className="border-b last:border-b-0">
                 <AccordionTrigger className="hover:bg-muted/50 w-full p-0 data-[state=open]:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  <div className="flex flex-col md:flex-row flex-1 items-start md:items-center space-y-1 md:space-y-0 md:space-x-4 px-4 py-3 w-full text-left">
                    <div className="font-medium w-full md:w-[20%] truncate">
                      <span className="md:hidden font-semibold text-xs text-muted-foreground">Unit: </span>{report.unitId}
                    </div>
                    <div className="text-sm text-muted-foreground w-full md:w-[25%] truncate">
                      <span className="md:hidden font-semibold text-xs text-muted-foreground">Date: </span>{report.date}
                    </div>
                    <div className="text-sm text-muted-foreground w-full md:w-[20%] truncate">
                      <span className="md:hidden font-semibold text-xs text-muted-foreground">Operator: </span>{report.operator}
                    </div>
                    <div className="w-full md:w-[15%]">
                       <span className="md:hidden font-semibold text-xs text-muted-foreground">Status: </span>
                      <Badge
                        variant={report.status === 'Safe' ? 'default' : 'destructive'}
                        className={cn(
                          'text-xs',
                          report.status === 'Safe' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                        )}
                      >
                        {report.status}
                      </Badge>
                    </div>
                    <div className="w-full md:w-[20%] flex items-center md:justify-center">
                       <span className="md:hidden font-semibold text-xs text-muted-foreground mr-2">Rep. Photo: </span>
                       {isClickablePhoto(report.representativePhotoUrl) ? (
                          <a href={report.representativePhotoUrl} target="_blank" rel="noopener noreferrer" className="relative group" onClick={(e) => e.stopPropagation()}>
                            <Image
                              src={report.representativePhotoUrl}
                              alt={`Inspection for ${report.unitId}`}
                              width={60}
                              height={45}
                              className="rounded-md object-cover group-hover:opacity-80 transition-opacity"
                              data-ai-hint={report.representativeDataAiHint}
                              onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                            />
                             <ExternalLink className="absolute top-1 right-1 h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-sm p-0.5" />
                          </a>
                        ) : (
                          <Image
                            src={report.representativePhotoUrl || PLACEHOLDER_IMAGE_DATA_URL}
                            alt={`Inspection for ${report.unitId}`}
                            width={60}
                            height={45}
                            className="rounded-md object-cover"
                            data-ai-hint={report.representativeDataAiHint}
                            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                          />
                        )}
                    </div>
                    {/* Action buttons are removed from here */}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 bg-secondary/30 border-t">
                    <div className="flex justify-end space-x-2 mb-4">
                        <Button variant="outline" size="sm" className="text-xs" disabled> {/* onClick={(e) => console.log("Edit clicked for " + report.id)}} */}
                            <Edit className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="text-xs" onClick={() => handleOpenDeleteDialog(report.id)}>
                            <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                    </div>
                    <h4 className="text-lg font-semibold mb-3">Inspection Items for Unit {report.unitId}:</h4>
                    {report.items && report.items.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[150px]">Item</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="min-w-[150px]">Timestamp</TableHead>
                              <TableHead className="min-w-[150px]">Remarks</TableHead>
                              <TableHead className="text-center">Photo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {report.items.map((item, idx) => (
                              <TableRow key={`${report.id}-item-${item.checklistItemId}-${idx}`}>
                                <TableCell className="font-medium">{item.part_name}</TableCell>
                                <TableCell>
                                  {item.is_safe === null ? <span className="text-muted-foreground">Pending</span> :
                                  item.is_safe ?
                                    <span className="flex items-center text-green-600"><CheckCircle className="mr-1 h-4 w-4"/>Safe</span> :
                                    <span className="flex items-center text-red-600"><AlertCircle className="mr-1 h-4 w-4"/>Unsafe</span>
                                  }
                                </TableCell>
                                <TableCell>{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}</TableCell>
                                <TableCell>
                                  {item.remarks ? (
                                     <div className="flex items-start">
                                        <MessageSquare className="mr-2 h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm">{item.remarks}</span>
                                     </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">No remarks</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isClickablePhoto(item.photo_url) ? (
                                    <a href={item.photo_url!} target="_blank" rel="noopener noreferrer" className="relative group inline-block">
                                      <Image
                                        src={item.photo_url!}
                                        alt={item.part_name}
                                        width={80}
                                        height={60}
                                        className="rounded-md object-cover mx-auto group-hover:opacity-80 transition-opacity"
                                        data-ai-hint={item.part_name.toLowerCase()}
                                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                                      />
                                      <ExternalLink className="absolute top-1 right-1 h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-sm p-0.5" />
                                    </a>
                                  ) : (
                                    <div className="flex items-center justify-center text-muted-foreground text-xs">
                                      { item.photo_url && item.photo_url !== PLACEHOLDER_IMAGE_DATA_URL && !item.photo_url.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP") ? (
                                        <Image
                                          src={item.photo_url}
                                          alt={item.part_name}
                                          width={80}
                                          height={60}
                                          className="rounded-md object-cover mx-auto"
                                          data-ai-hint={item.part_name.toLowerCase()}
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
                      <p className="text-muted-foreground text-center py-4">No inspection items recorded for this report.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          )}
           { !isLoading && filteredData.length === 0 && (
             <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <tbody className="[&_tr:last-child]:border-0">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td colSpan={6} className="p-4 align-middle text-center py-10 text-muted-foreground"> {/* Increased colspan for actions */}
                        No inspection records found with current filters.
                      </td>
                    </tr>
                  </tbody>
                </table>
             </div>
           )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the inspection report
              (ID: {reportToDeleteId ? `${reportToDeleteId.substring(0,8)}...` : ''}) and any associated downtime log from local storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReportToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    

