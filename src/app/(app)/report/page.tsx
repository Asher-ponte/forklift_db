
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download, Filter, CalendarDays, RefreshCw } from "lucide-react";
import Image from 'next/image';
import { useState, useMemo, useEffect } from "react";
import type { StoredInspectionReport } from '@/lib/types';
import { PLACEHOLDER_IMAGE_DATA_URL } from '@/lib/mock-data';

const LOCAL_STORAGE_REPORTS_KEY = 'forkliftInspectionReports';

// Mock data for the report (can be kept as a fallback or initial data)
const mockReportData = [
  { id: 'mock_insp001', unitId: 'FL001', date: '2024-07-15T10:00:00Z', operator: 'John Doe', status: 'Safe' as 'Safe' | 'Unsafe', photoUrl: 'https://placehold.co/100x75?text=Fork+View' , dataAiHint: "forklift"},
  { id: 'mock_insp002', unitId: 'FL002', date: '2024-07-15T11:00:00Z', operator: 'Jane Smith', status: 'Unsafe' as 'Safe' | 'Unsafe', photoUrl: 'https://placehold.co/100x75?text=Tire+Issue', dataAiHint: "forklift tire"},
];

// Type for display in the table, derived from StoredInspectionReport
interface ReportDisplayEntry {
  id: string;
  unitId: string;
  date: string; // Keep as string for direct display after formatting
  operator: string;
  status: 'Safe' | 'Unsafe';
  photoUrl: string;
  dataAiHint: string;
  rawDate: Date; // For sorting
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
        photoUrl: mock.photoUrl || PLACEHOLDER_IMAGE_DATA_URL,
        dataAiHint: mock.dataAiHint || 'forklift',
        rawDate: new Date(mock.date),
      })),
      ...storedReports.map(report => {
        let representativePhoto = PLACEHOLDER_IMAGE_DATA_URL;
        let hint = 'forklift general';
        if (report.status === 'Unsafe') {
          const unsafeItemWithPhoto = report.items.find(item => !item.is_safe && item.photo_url);
          if (unsafeItemWithPhoto) {
            representativePhoto = unsafeItemWithPhoto.photo_url!;
            hint = report.unitId + " " + unsafeItemWithPhoto.part_name;
          } else {
             const firstItemWithPhoto = report.items.find(item => item.photo_url);
             if(firstItemWithPhoto) representativePhoto = firstItemWithPhoto.photo_url!;
             hint = report.unitId + " issue";
          }
        } else {
          const firstItemWithPhoto = report.items.find(item => item.photo_url);
          if(firstItemWithPhoto) {
            representativePhoto = firstItemWithPhoto.photo_url!;
            hint = report.unitId + " " + firstItemWithPhoto.part_name;
          }
        }
        return {
          id: report.id,
          unitId: report.unitId,
          date: new Date(report.date).toLocaleString(),
          operator: report.operator,
          status: report.status,
          photoUrl: representativePhoto,
          dataAiHint: hint.substring(0,50), // Limit hint length
          rawDate: new Date(report.date),
        };
      })
    ];
    
    // Deduplicate and sort by date descending
    const uniqueReports = Array.from(new Map(combinedReports.map(item => [item.id, item])).values());
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
        // Adjust toDate to be end of day for inclusive range
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
    const headers = ["Inspection ID", "Unit ID", "Date", "Operator", "Status"];
    const csvRows = [
      headers.join(','),
      ...filteredData.map(row => [row.id, row.unitId, row.date, row.operator, row.status].join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `forklift_report_${new Date().toISOString().split('T')[0]}.csv`);
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
          <CardDescription>View and filter forklift inspection history. Submitted reports are stored locally in your browser.</CardDescription>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit ID</TableHead>
                <TableHead><CalendarDays className="inline-block mr-1 h-4 w-4" />Date</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Photo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? filteredData.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.unitId}</TableCell>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.operator}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === 'Safe' ? 'default' : 'destructive'} 
                           className={entry.status === 'Safe' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Image 
                        src={entry.photoUrl || PLACEHOLDER_IMAGE_DATA_URL} 
                        alt={`Inspection for ${entry.unitId}`} 
                        width={100} 
                        height={75} 
                        className="rounded-md object-cover" 
                        data-ai-hint={entry.dataAiHint}
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_DATA_URL; }}
                    />
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No inspection records found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
