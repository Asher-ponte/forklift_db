
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download, Filter, RefreshCw, CheckCircle, AlertCircle, ImageOff, MessageSquare, ZoomIn, Trash2, Edit, Loader2 } from "lucide-react";
import Image from 'next/image';
import { useState, useMemo, useEffect, useCallback } from "react";
import type { StoredInspectionReport, InspectionReportItem as ApiReportItem, StoredDowntimeLog } from '@/lib/types';
import { PLACEHOLDER_IMAGE_DATA_URL } from '@/lib/mock-data';
import ImageModal from '@/components/shared/ImageModal';
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
import * as apiService from '@/services/apiService';
import { parseISO } from "date-fns";


interface ReportDisplayEntry extends StoredInspectionReport {
  representativePhotoUrl: string;
  representativeDataAiHint: string;
  rawDate: Date;
  // items are already part of StoredInspectionReport
}

const isClickablePhoto = (url: string | null | undefined): url is string => {
  return !!(url && url !== PLACEHOLDER_IMAGE_DATA_URL && !url.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP"));
}

export default function ReportPage() {
  const [allReports, setAllReports] = useState<ReportDisplayEntry[]>([]);
  const [filterUnitId, setFilterUnitId] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<{ from: string, to: string }>({ from: '', to: '' });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [reportToDeleteId, setReportToDeleteId] = useState<string | null>(null);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageAlt, setSelectedImageAlt] = useState<string>("Enlarged view");

  const openImageModal = (url: string, alt: string) => {
    setSelectedImageUrl(url);
    setSelectedImageAlt(alt);
    setIsImageModalOpen(true);
  };

  const processReportsToDisplayEntries = (reportsFromApi: StoredInspectionReport[]): ReportDisplayEntry[] => {
    return reportsFromApi.map(report => {
      let representativePhoto = PLACEHOLDER_IMAGE_DATA_URL;
      let hint = 'forklift general';
      if (report.status === 'Unsafe') {
        const unsafeItemWithPhoto = report.items?.find(item => !item.is_safe && item.photo_url && item.photo_url !== PLACEHOLDER_IMAGE_DATA_URL);
        if (unsafeItemWithPhoto) {
          representativePhoto = unsafeItemWithPhoto.photo_url!;
          hint = unsafeItemWithPhoto.part_name_snapshot;
        } else {
           const firstItemWithPhoto = report.items?.find(item => item.photo_url && item.photo_url !== PLACEHOLDER_IMAGE_DATA_URL);
           if(firstItemWithPhoto) representativePhoto = firstItemWithPhoto.photo_url!;
           hint = "issue";
        }
      } else {
        const firstItemWithPhoto = report.items?.find(item => item.photo_url && item.photo_url !== PLACEHOLDER_IMAGE_DATA_URL);
        if(firstItemWithPhoto) {
          representativePhoto = firstItemWithPhoto.photo_url!;
          hint = firstItemWithPhoto.part_name_snapshot;
        }
      }
      return {
        ...report, // Spread the original report
        // date is already a string from API, formatted below for display
        representativePhotoUrl: representativePhoto,
        representativeDataAiHint: hint.substring(0,50),
        rawDate: parseISO(report.date), // Keep raw date for sorting
      };
    }).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  };

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const reportsFromApi = await apiService.fetchInspectionReports();
      setAllReports(processReportsToDisplayEntries(reportsFromApi));
      toast({ title: "Reports Loaded", description: "Data loaded from API.", duration: 3000 });
    } catch (error) {
      console.error("Failed to fetch reports from API:", error);
      toast({ title: "Error Loading Reports", description: (error instanceof Error) ? error.message : "Could not fetch reports from API.", variant: "destructive" });
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
      const unitIdMatch = filterUnitId ? report.unit_code_display.toLowerCase().includes(filterUnitId.toLowerCase()) : true;
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
    const headers = ["Inspection ID", "Unit ID", "Date", "Operator", "Overall Status", "Checklist Item", "Item Status", "Item Timestamp", "Remarks", "Photo URL (Data URI omitted for brevity)"];
    const csvRows: string[] = [headers.join(',')];

    filteredData.forEach(report => {
      (report.items || []).forEach(item => {
        const row = [
          report.id,
          report.unit_code_display,
          new Date(report.date).toLocaleString(),
          report.operator_username,
          report.status,
          item.part_name_snapshot,
          item.is_safe === null ? 'Pending' : item.is_safe ? 'Safe' : 'Unsafe',
          item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A',
          item.remarks || '',
          item.photo_url ? "Photo Available" : "No Photo" // Avoid large data URIs in CSV
        ].map(field => `"${String(field).replace(/"/g, '""')}"`);
        csvRows.push(row.join(','));
      });
       if (!report.items || report.items.length === 0) {
        const row = [
          report.id,
          report.unit_code_display,
          new Date(report.date).toLocaleString(),
          report.operator_username,
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

  const handleOpenDeleteDialog = (id: string) => {
    setReportToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDeleteId) return;
    try {
      await apiService.deleteInspectionReport(reportToDeleteId);
      toast({ title: "Report Deleted", description: `Report ID ${reportToDeleteId.substring(0,8)}... removed via API.` });
      
      // Also attempt to delete associated downtime log by sourceReportId
      // This assumes your API supports this specific deletion method.
      try {
        await apiService.deleteDowntimeLogBySourceReportId(reportToDeleteId);
        toast({ title: "Associated Downtime Log Checked/Deleted", description: `Downtime log linked to report ${reportToDeleteId.substring(0,8)}... also removed if it existed.`, duration: 4000 });
      } catch (downtimeError) {
        // It's possible no downtime log existed, or the specific delete by sourceReportId failed
        // Not critical to block report deletion, so just log it
        console.warn("Could not delete associated downtime log or it didn't exist:", downtimeError);
        toast({ title: "Note", description: "Could not automatically delete associated downtime log, or none existed.", variant:"default", duration: 4000});
      }
      
      loadReports(); // Refresh the list
    } catch (error) {
      console.error("Error deleting report via API:", error);
      toast({ title: "Deletion Error", description: (error instanceof Error) ? error.message : "Could not delete data from API.", variant: "destructive" });
    } finally {
      setIsDeleteConfirmOpen(false);
      setReportToDeleteId(null);
    }
  };

  return (
    <div className="space-y-8">
      <ImageModal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} imageUrl={selectedImageUrl} altText={selectedImageAlt} />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <FileText className="mr-3 h-8 w-8 text-primary" />
            Forklift Inspection Report
          </CardTitle>
          <CardDescription>View, filter, and manage forklift inspection history from API.</CardDescription>
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
            <Button onClick={handleExportCsv} className="w-full sm:w-auto text-base" disabled={filteredData.length === 0 || isLoading}>
              <Download className="mr-2 h-5 w-5" /> Export CSV
            </Button>
            <Button onClick={loadReports} variant="outline" className="w-full sm:w-auto text-base" disabled={isLoading}>
              <RefreshCw className="mr-2 h-5 w-5" /> {isLoading ? "Refreshing..." : "Refresh Data"}
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
              <div className="w-[20%] text-center">Photo</div>
              <div className="w-[0%]"></div> {/* For accordion chevron */}
            </div>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary"/><span className="ml-2 text-muted-foreground">Loading reports from API...</span></div>
          ) : (
          <Accordion type="multiple" className="w-full">
            {filteredData.map((report) => (
              <AccordionItem value={report.id} key={report.id} className="border-b last:border-b-0">
                 <AccordionTrigger className="hover:bg-muted/50 w-full p-0 data-[state=open]:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  <div className="flex flex-col md:flex-row flex-1 items-start md:items-center space-y-1 md:space-y-0 md:space-x-4 px-4 py-3 w-full text-left">
                    <div className="font-medium w-full md:w-[20%] truncate">
                      <span className="md:hidden font-semibold text-xs text-muted-foreground">Unit: </span>{report.unit_code_display}
                    </div>
                    <div className="text-sm text-muted-foreground w-full md:w-[25%] truncate">
                      <span className="md:hidden font-semibold text-xs text-muted-foreground">Date: </span>{new Date(report.date).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground w-full md:w-[20%] truncate">
                      <span className="md:hidden font-semibold text-xs text-muted-foreground">Operator: </span>{report.operator_username}
                    </div>
                    <div className="w-full md:w-[15%]">
                       <span className="md:hidden font-semibold text-xs text-muted-foreground">Status: </span>
                      <Badge
                        variant={report.status === 'Safe' ? 'default' : 'destructive'}
                        className={cn(
                          'text-xs',
                          report.status === 'Safe' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                        )}
                      >
                        {report.status}
                      </Badge>
                    </div>
                    <div className="w-full md:w-[20%] flex items-center md:justify-center">
                       <span className="md:hidden font-semibold text-xs text-muted-foreground mr-2">Rep. Photo: </span>
                       {isClickablePhoto(report.representativePhotoUrl) ? (
                          <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); openImageModal(report.representativePhotoUrl, `Inspection for ${report.unit_code_display}`);}} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); openImageModal(report.representativePhotoUrl, `Inspection for ${report.unit_code_display}`);}}} className="relative group p-0 border-none bg-transparent h-auto cursor-pointer">
                            <Image
                              src={report.representativePhotoUrl}
                              alt={`Inspection for ${report.unit_code_display}`}
                              width={60}
                              height={45}
                              className="rounded-md object-cover group-hover:opacity-80 transition-opacity"
                              data-ai-hint={report.representativeDataAiHint}
                              onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                            />
                             <ZoomIn className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1" />
                          </div>
                        ) : (
                          <Image
                            src={report.representativePhotoUrl || PLACEHOLDER_IMAGE_DATA_URL}
                            alt={`Inspection for ${report.unit_code_display}`}
                            width={60}
                            height={45}
                            className="rounded-md object-cover"
                            data-ai-hint={report.representativeDataAiHint}
                            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                          />
                        )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 bg-secondary/30 border-t">
                    <div className="flex justify-end space-x-2 mb-4">
                        <Button variant="outline" size="sm" className="text-xs" disabled> {/* Edit functionality not implemented */}
                            <Edit className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="text-xs" onClick={() => handleOpenDeleteDialog(report.id)}>
                            <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                    </div>
                    <h4 className="text-lg font-semibold mb-3">Inspection Items for Unit {report.unit_code_display}:</h4>
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
                              <TableRow key={`${report.id}-item-${item.checklist_item_id_fk || idx}`}>
                                <TableCell className="font-medium">{item.part_name_snapshot}</TableCell>
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
                                    <div role="button" tabIndex={0} onClick={() => openImageModal(item.photo_url!, item.part_name_snapshot)} onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') openImageModal(item.photo_url!, item.part_name_snapshot);}} className="relative group p-0 border-none bg-transparent h-auto cursor-pointer inline-block">
                                      <Image
                                        src={item.photo_url!}
                                        alt={item.part_name_snapshot}
                                        width={80}
                                        height={60}
                                        className="rounded-md object-cover mx-auto group-hover:opacity-80 transition-opacity"
                                        data-ai-hint={item.part_name_snapshot.toLowerCase()}
                                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                                      />
                                      <ZoomIn className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1" />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center text-muted-foreground text-xs">
                                      { item.photo_url && item.photo_url !== PLACEHOLDER_IMAGE_DATA_URL && !item.photo_url.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP") ? (
                                        <Image
                                          src={item.photo_url}
                                          alt={item.part_name_snapshot}
                                          width={80}
                                          height={60}
                                          className="rounded-md object-cover mx-auto"
                                          data-ai-hint={item.part_name_snapshot.toLowerCase()}
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
                      <td colSpan={6} className="p-4 align-middle text-center py-10 text-muted-foreground">
                        No inspection records found with current filters from API.
                      </td>
                    </tr>
                  </tbody>
                </table>
             </div>
           )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the inspection report
              (ID: {reportToDeleteId ? `${reportToDeleteId.substring(0,8)}...` : ''}) and any associated downtime log from the API.
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
