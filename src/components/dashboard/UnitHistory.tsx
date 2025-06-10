
import React from 'react';
import type { StoredInspectionReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { List } from 'lucide-react';

interface UnitHistoryProps {
  unitId: string;
  reports: StoredInspectionReport[];
}

const UnitHistory: React.FC<UnitHistoryProps> = ({ unitId, reports }) => {
  if (!unitId) {
    return <p className="text-muted-foreground">Please enter a Unit ID to see its history.</p>;
  }

  const historyData = reports
    .filter(report => report.unitId.toLowerCase() === unitId.toLowerCase())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by most recent first

  if (historyData.length === 0) {
    return <p className="text-muted-foreground">No inspection history found for Unit ID: {unitId}</p>;
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2 text-primary">Inspection Log for: {unitId}</h3>
      <ScrollArea className="h-72 w-full rounded-md border p-4 bg-secondary/30">
        {historyData.length > 0 ? (
          <ul className="space-y-3">
            {historyData.map((item) => (
              <li key={item.id} className="p-3 bg-background rounded-md shadow-sm border border-border">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm">
                    {new Date(item.date).toLocaleString()}
                  </p>
                  <Badge variant={item.status === 'Safe' ? 'default' : 'destructive'}
                         className={item.status === 'Safe' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}>
                    {item.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Operator: {item.operator}</p>
                {/* Optionally, add a button/link to view full report details if needed */}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No inspection records found for this unit.</p>
        )}
      </ScrollArea>
    </div>
  );
};

export default UnitHistory;
