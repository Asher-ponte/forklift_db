
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download, Filter, RefreshCw, CheckCircle, AlertCircle, ImageOff, MessageSquare } from "lucide-react";
import Image from 'next/image';
import { useState, useMemo, useEffect, useCallback } from "react";
import type { StoredInspectionReport } from '@/lib/types';
import type { InspectionRecordClientState } from '@/lib/mock-data';
import { PLACEHOLDER_IMAGE_DATA_URL } from '@/lib/mock-data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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

export default function ReportPage() {
  const [allReports, setAllReports] = useState<ReportDisplayEntry[]>([]);
  const [filterUnitId, setFilterUnitId] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<{ from: string, to: string }>({ from: '', to: '' });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const processApiReportsToDisplayEntries = (reportsFromApi: StoredInspectionReport[]): ReportDisplayEntry[] => {
    return reportsFromApi.map(report => {
      let representativePhoto = PLACEHOLDER_IMAGE_DATA_URL;
      let hint = 'forklift general';
      if (report.status === 'Unsafe') {
        const unsafeItemWithPhoto = report.items?.find(item => !item.is_safe && item.photo_url);
        if (unsafeItemWithPhoto) {
          representativePhoto = unsafeItemWithPhoto.photo_url!;
          hint = unsafeItemWithPhoto.part_name;
        } else {
           const firstItemWithPhoto = report.items?.find(item => item.photo_url);
           if(firstItemWithPhoto) representativePhoto = firstItemWithPhoto.photo_url!;
           hint = "issue";
        }
      } else {
        const firstItemWithPhoto = report.items?.find(item => item.photo_url);
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

  const loadReportsFromAPI = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const queryParams = new URLSearchParams();
      if (filterUnitId) queryParams.append('unitId', filterUnitId);
      if (filterDateRange.from) queryParams.append('dateFrom', new Date(filterDateRange.from).toISOString());
      if (filterDateRange.to) {
        const toDate = new Date(filterDateRange.to);
        toDate.setHours(23, 59, 59, 999);
        queryParams.append('dateTo', toDate.toISOString());
      }

      const response = await fetch(`${apiBaseUrl}/inspection_reports.php?${queryParams.toString()}`);

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorData;
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json().catch(() => ({ message: 'Failed to parse JSON error response from server.' }));
        } else {
          const textError = await response.text().catch(() => 'Unknown server error, non-JSON response from server.');
          errorData = { message: `Server error (non-JSON): ${textError.substring(0, 200)}... Contact backend administrator.` };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const reportsFromAPI: StoredInspectionReport[] = await response.json();

      if (!Array.isArray(reportsFromAPI)) {
        console.error("API did not return an array for reports:", reportsFromAPI);
        throw new Error("Invalid data format received from server. Expected an array.");
      }

      setAllReports(processApiReportsToDisplayEntries(reportsFromAPI));

    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast({ title: "Error Loading Reports", description: (error instanceof Error) ? error.message : "Could not fetch reports from the server.", variant: "destructive" });
      setAllReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, filterUnitId, filterDateRange.from, filterDateRange.to]);


  useEffect(() => {
    loadReportsFromAPI();
  }, [loadReportsFromAPI]);

  const handleFilterAndRefresh = () => {
    loadReportsFromAPI();
  };


  const filteredData = useMemo(() => {
    return allReports;
  }, [allReports]);


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

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <FileText className="mr-3 h-8 w-8 text-primary" />
            Forklift Inspection Report
          </CardTitle>
          <CardDescription>View and filter forklift inspection history. Reports are fetched from the backend server.</CardDescription>
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
            <Button onClick={handleFilterAndRefresh} variant="outline" className="w-full sm:w-auto text-base">
              <RefreshCw className="mr-2 h-5 w-5" /> Apply Filters & Refresh
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
              <div className="w-[15%] text-center">Photo</div>
              <div className="w-[5%]"></div> {/* Spacer for chevron */}
            </div>
          {isLoading ? (
            <div className="text-center p-10 text-muted-foreground">Loading reports...</div>
          ) : (
          <Accordion type="multiple" className="w-full">
            {filteredData.map((report) => (
              <AccordionItem value={report.id} key={report.id} className="border-b last:border-b-0">
                 <AccordionTrigger className="hover:bg-muted/50 w-full p-0 data-[state=open]:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background">
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
                    <div className="w-full md:w-[15%] flex items-center md:justify-center">
                       <span className="md:hidden font-semibold text-xs text-muted-foreground mr-2">Rep. Photo: </span>
                      <Image
                        src={report.representativePhotoUrl || PLACEHOLDER_IMAGE_DATA_URL}
                        alt={`Inspection for ${report.unitId}`}
                        width={60}
                        height={45}
                        className="rounded-md object-cover"
                        data-ai-hint={report.representativeDataAiHint}
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                      />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 bg-secondary/30 border-t">
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
                                  {item.photo_url && item.photo_url !== PLACEHOLDER_IMAGE_DATA_URL && !item.photo_url.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP") ? (
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
                                    <div className="flex items-center justify-center text-muted-foreground text-xs">
                                      <ImageOff className="mr-1 h-4 w-4"/> No Photo
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
                      <td colSpan={5} className="p-4 align-middle text-center py-10 text-muted-foreground">
                        No inspection records found.
                      </td>
                    </tr>
                  </tbody>
                </table>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
