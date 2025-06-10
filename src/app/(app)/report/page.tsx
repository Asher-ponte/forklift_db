
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download, Filter, CalendarDays, RefreshCw, CheckCircle, AlertCircle, ImageOff, ChevronDown } from "lucide-react";
import Image from 'next/image';
import { useState, useMemo, useEffect } from "react";
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

const LOCAL_STORAGE_REPORTS_KEY = 'forkliftInspectionReports';

// Mock data for the report (can be kept as a fallback or initial data)
const mockReportData = [
  { id: 'mock_insp001', unitId: 'FL001', date: '2024-07-15T10:00:00Z', operator: 'John Doe', status: 'Safe' as 'Safe' | 'Unsafe', photoUrl: 'https://placehold.co/100x75.png', dataAiHint: "forklift", items: [] },
  { id: 'mock_insp002', unitId: 'FL002', date: '2024-07-15T11:00:00Z', operator: 'Jane Smith', status: 'Unsafe' as 'Safe' | 'Unsafe', photoUrl: 'https://placehold.co/100x75.png', dataAiHint: "forklift tire", items: [] },
];

// Type for display in the table, derived from StoredInspectionReport
interface ReportDisplayEntry {
  id: string;
  unitId: string;
  date: string; // Keep as string for direct display after formatting
  operator: string;
  status: 'Safe' | 'Unsafe';
  representativePhotoUrl: string; // Photo for the summary row
  representativeDataAiHint: string; // Hint for the summary row photo
  rawDate: Date; // For sorting
  items: InspectionRecordClientState[];
}

export default function ReportPage() {
  const [allReports, setAllReports] = useState<ReportDisplayEntry[]>([]);
  const [filterUnitId, setFilterUnitId] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<{ from: string, to: string }>({ from: '', to: '' });

  const loadReports = () => {
    const storedReportsRaw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    const storedReports: StoredInspectionReport[] = storedReportsRaw ? JSON.parse(storedReportsRaw) : [];

    const combinedReports: ReportDisplayEntry[] = [
      ...mockReportData.map(mock => ({
        ...mock,
        representativePhotoUrl: mock.photoUrl || PLACEHOLDER_IMAGE_DATA_URL,
        representativeDataAiHint: mock.dataAiHint || 'forklift',
        rawDate: new Date(mock.date),
        items: mock.items.length > 0 ? mock.items : [ // Add dummy item if mock items are empty for structure
            { checklistItemId: 'mock-item', part_name: 'Mock Part', question: 'Is it okay?', is_safe: true, photo_url: mock.photoUrl, timestamp: new Date().toISOString(), completed: true }
        ],
      })),
      ...storedReports.map(report => {
        let representativePhoto = PLACEHOLDER_IMAGE_DATA_URL;
        let hint = 'forklift general';
        if (report.status === 'Unsafe') {
          const unsafeItemWithPhoto = report.items.find(item => !item.is_safe && item.photo_url);
          if (unsafeItemWithPhoto) {
            representativePhoto = unsafeItemWithPhoto.photo_url!;
            hint = unsafeItemWithPhoto.part_name;
          } else {
             const firstItemWithPhoto = report.items.find(item => item.photo_url);
             if(firstItemWithPhoto) representativePhoto = firstItemWithPhoto.photo_url!;
             hint = "issue";
          }
        } else {
          const firstItemWithPhoto = report.items.find(item => item.photo_url);
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
          items: report.items,
        };
      })
    ];

    const uniqueReportsMap = new Map<string, ReportDisplayEntry>();
    combinedReports.forEach(item => {
        // Prioritize non-mock reports if IDs clash, or just use the first encountered
        if (!uniqueReportsMap.has(item.id) || (uniqueReportsMap.get(item.id)?.items.length === 0 && item.items.length > 0)) {
           uniqueReportsMap.set(item.id, item);
        }
    });
    const uniqueReports = Array.from(uniqueReportsMap.values());
    uniqueReports.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    setAllReports(uniqueReports);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredData = useMemo(() => {
    return allReports.filter(entry => {
      const unitFilterMatch = filterUnitId ? entry.unitId.toLowerCase().includes(filterUnitId.toLowerCase()) : true;

      let dateFilterMatch = true;
      const entryDate = entry.rawDate;
      if (filterDateRange.from && filterDateRange.to) {
        const fromDate = new Date(filterDateRange.from);
        const toDate = new Date(filterDateRange.to);
        toDate.setHours(23, 59, 59, 999);
        dateFilterMatch = entryDate >= fromDate && entryDate <= toDate;
      } else if (filterDateRange.from) {
        const fromDate = new Date(filterDateRange.from);
        dateFilterMatch = entryDate >= fromDate;
      } else if (filterDateRange.to) {
        const toDate = new Date(filterDateRange.to);
        toDate.setHours(23, 59, 59, 999);
        dateFilterMatch = entryDate <= toDate;
      }

      return unitFilterMatch && dateFilterMatch;
    });
  }, [allReports, filterUnitId, filterDateRange]);

  const handleExportCsv = () => {
    const headers = ["Inspection ID", "Unit ID", "Date", "Operator", "Overall Status", "Checklist Item", "Item Status", "Item Timestamp"];
    const csvRows: string[] = [headers.join(',')];

    filteredData.forEach(report => {
      report.items.forEach(item => {
        const row = [
          report.id,
          report.unitId,
          report.date,
          report.operator,
          report.status,
          item.part_name,
          item.is_safe ? 'Safe' : 'Unsafe',
          item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'
        ].map(field => `"${String(field).replace(/"/g, '""')}"`); // Escape quotes
        csvRows.push(row.join(','));
      });
       if (report.items.length === 0) { // Handle reports with no items for CSV
        const row = [
          report.id,
          report.unitId,
          report.date,
          report.operator,
          report.status,
          'N/A',
          'N/A',
          'N/A'
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
          <CardDescription>View and filter forklift inspection history. Click on a report to see item details. Submitted reports are stored locally in your browser.</CardDescription>
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
          <div className="flex flex-col sm:flex-row gap-2 md:col-span-1">
            <Button onClick={handleExportCsv} className="w-full text-base">
              <Download className="mr-2 h-5 w-5" /> Export CSV
            </Button>
            <Button onClick={loadReports} variant="outline" className="w-full text-base">
              <RefreshCw className="mr-2 h-5 w-5" /> Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-0">
          {filteredData.length > 0 && (
            <div className="hidden md:flex items-center px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
              <div className="w-[20%] pl-1">Unit ID</div>
              <div className="w-[25%]">Date</div>
              <div className="w-[20%]">Operator</div>
              <div className="w-[15%]">Status</div>
              <div className="w-[15%] text-center">Photo</div>
              <div className="w-[5%]"></div> {/* Spacer for chevron */}
            </div>
          )}
          <Accordion type="multiple" className="w-full">
            {filteredData.map((report) => (
              <AccordionItem value={report.id} key={report.id}>
                <AccordionTrigger className="hover:bg-muted/50 w-full p-0 data-[state=open]:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1">
                  <div className="flex flex-1 items-center space-x-0 md:space-x-4 px-4 py-3 w-full">
                    <div className="font-medium w-full md:w-[20%] truncate">
                      <span className="md:hidden font-semibold">Unit: </span>{report.unitId}
                    </div>
                    <div className="text-sm text-muted-foreground w-full mt-1 md:mt-0 md:w-[25%] truncate">
                      <span className="md:hidden font-semibold">Date: </span>{report.date}
                    </div>
                    <div className="text-sm text-muted-foreground w-full mt-1 md:mt-0 md:w-[20%] truncate">
                      <span className="md:hidden font-semibold">Operator: </span>{report.operator}
                    </div>
                    <div className="w-full mt-1 md:mt-0 md:w-[15%]">
                       <span className="md:hidden font-semibold">Status: </span>
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
                    <div className="w-full mt-1 md:mt-0 md:w-[15%] flex md:justify-center">
                       <span className="md:hidden font-semibold mr-2">Photo: </span>
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
                    {/* Chevron is part of AccordionTrigger, this is a placeholder for alignment on larger screens if needed, but usually not */}
                    {/* <div className="w-[5%] hidden md:block"></div> */}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 bg-secondary/30">
                    <h4 className="text-lg font-semibold mb-2">Inspection Items for Unit {report.unitId}:</h4>
                    {report.items && report.items.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Photo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.items.map((item) => (
                            <TableRow key={item.checklistItemId}>
                              <TableCell>{item.part_name}</TableCell>
                              <TableCell>
                                {item.is_safe === null ? <span className="text-muted-foreground">Pending</span> :
                                 item.is_safe ?
                                  <span className="flex items-center text-green-600"><CheckCircle className="mr-1 h-4 w-4"/>Safe</span> :
                                  <span className="flex items-center text-red-600"><AlertCircle className="mr-1 h-4 w-4"/>Unsafe</span>
                                }
                              </TableCell>
                              <TableCell>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A'}</TableCell>
                              <TableCell>
                                {item.photo_url && item.photo_url !== PLACEHOLDER_IMAGE_DATA_URL ? (
                                  <Image
                                    src={item.photo_url}
                                    alt={item.part_name}
                                    width={60}
                                    height={45}
                                    className="rounded-md object-cover"
                                    data-ai-hint={item.part_name.toLowerCase()}
                                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                                  />
                                ) : (
                                  <div className="flex items-center text-muted-foreground">
                                    <ImageOff className="mr-1 h-4 w-4"/> No Photo
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground">No inspection items recorded for this report.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
           {filteredData.length === 0 && (
             <Table>
               <TableBody>
                 <TableRow>
                   <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                     No inspection records found matching your filters.
                   </TableCell>
                 </TableRow>
               </TableBody>
             </Table>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
