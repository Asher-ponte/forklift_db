'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CompletionProgressProps {
  completedItems: number;
  totalItems: number;
}

export default function CompletionProgress({ completedItems, totalItems }: CompletionProgressProps) {
  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <Card className="shadow-md w-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Inspection Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={percentage} aria-label={`${percentage}% complete`} className="h-4 rounded-full" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{percentage}% Complete</span>
          <span>{completedItems} of {totalItems} items</span>
        </div>
      </CardContent>
    </Card>
  );
}
