'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Filter, CalendarDays } from "lucide-react";
import Image from 'next/image';
import { useState, useMemo } from "react";

// Mock data for the report
const mockReportData = [
  { id: 'insp001', unitId: 'FL001', date: '2024-07-15', operator: 'John Doe', status: 'Safe', photoUrl: 'https://placehold.co/100x75?text=Fork+View' , dataAiHint: "forklift"},
  { id: 'insp002', unitId: 'FL002', date: '2024-07-15', operator: 'Jane Smith', status: 'Unsafe', photoUrl: 'https://placehold.co/100x75?text=Tire+Issue', dataAiHint: "forklift tire"},
  { id: 'insp003', unitId: 'FL001', date: '2024-07-14', operator: 'John Doe', status: 'Safe', photoUrl: 'https://placehold.co/100x75?text=Lights+OK', dataAiHint: "forklift lights"},
  { id: 'insp004', unitId: 'FL003', date: '2024-07-14', operator: 'Mike Brown', status: 'Safe', photoUrl: 'https://placehold.co/100x75?text=Brakes+Good', dataAiHint: "forklift brakes"},
  { id: 'insp005', unitId: 'FL002', date: '2024-07-13', operator: 'Jane Smith', status: 'Safe', photoUrl: 'https://placehold.co/100x75?text=Fork+Fine', dataAiHint: "forklift"},
];

type ReportEntry = typeof mockReportData[0];

export default function ReportPage() {
  const [filterUnitId, setFilterUnitId] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<{ from: string, to: string }>({ from: '', to: '' });

  const filteredData = useMemo(() => {
    return mockReportData.filter(entry => {
      const unitFilterMatch = filterUnitId ? entry.unitId.toLowerCase().includes(filterUnitId.toLowerCase()) : true;
      
      let dateFilterMatch = true;
      if (filterDateRange.from && filterDateRange.to) {
        const entryDate = new Date(entry.date);
        const fromDate = new Date(filterDateRange.from);
        const toDate = new Date(filterDateRange.to);
        dateFilterMatch = entryDate >= fromDate && entryDate <= toDate;
      } else if (filterDateRange.from) {
        const entryDate = new Date(entry.date);
        const fromDate = new Date(filterDateRange.from);
        dateFilterMatch = entryDate >= fromDate;
      } else if (filterDateRange.to) {
        const entryDate = new Date(entry.date);
        const toDate = new Date(filterDateRange.to);
        dateFilterMatch = entryDate <= toDate;
      }
      
      return unitFilterMatch && dateFilterMatch;
    });
  }, [filterUnitId, filterDateRange]);

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
      link.setAttribute('download', 'forklift_report.csv');
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
          <CardDescription>View and filter forklift inspection history. Export data as CSV.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Filter className="mr-2 h-5 w-5" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
          <Button onClick={handleExportCsv} className="w-full md:w-auto text-base">
            <Download className="mr-2 h-5 w-5" /> Export CSV
          </Button>
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
                  <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                  <TableCell>{entry.operator}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === 'Safe' ? 'default' : 'destructive'} 
                           className={entry.status === 'Safe' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Image src={entry.photoUrl} alt={`Inspection for ${entry.unitId}`} width={100} height={75} className="rounded-md object-cover" data-ai-hint={entry.dataAiHint} />
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
