
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CalendarCheck } from 'lucide-react';

export default function PmsSchedulePage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <CalendarCheck className="mr-3 h-8 w-8 text-primary" />
            PMS Schedule
          </CardTitle>
          <CardDescription>
            Preventive Maintenance Schedule for MHE Units. (Placeholder Page)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page will display the Preventive Maintenance Schedule for Material Handling Equipment.
            Functionality to view, add, and manage PMS tasks will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
