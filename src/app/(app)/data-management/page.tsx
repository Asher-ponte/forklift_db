
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, Warehouse, TruckIcon, Building } from "lucide-react"; // Added Building for Department

// In a real app, these would be forms and tables to manage data via API calls
// For now, they are placeholders.

export default function DataManagementPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Data Management</h1>
        <p className="text-muted-foreground">Manage core data for inspections and application settings.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <ListChecks className="mr-3 h-6 w-6 text-primary" />
              Manage Inspection Items
            </CardTitle>
            <CardDescription>
              Define and edit the checklist items used in forklift inspections. This will reflect in the inspection form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder content - In future, this would be a list/table of checklist items and a form to add/edit them */}
            <p className="text-sm text-muted-foreground mb-4">
              Currently, checklist items are managed via mock data (`MOCK_CHECKLIST_ITEMS` in `src/lib/mock-data.ts`).
              Future enhancements will allow dynamic management here.
            </p>
            <Button variant="outline" disabled>View & Edit Items (Coming Soon)</Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <TruckIcon className="mr-3 h-6 w-6 text-primary" />
              Manage MHE Details
            </CardTitle>
            <CardDescription>
              Encode and update details for Material Handling Equipment (e.g., Forklifts, Pallet Jacks). This will be used for selection during inspection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add, view, and edit MHE units, their IDs, types, and assigned departments.
            </p>
            <Button variant="outline" disabled>Manage MHEs (Coming Soon)</Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Building className="mr-3 h-6 w-6 text-primary" />
              Manage Departments
            </CardTitle>
            <CardDescription>
              Define operational departments. This will be used for MHE assignment and inspection filtering.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add, view, and edit department names and details.
            </p>
            <Button variant="outline" disabled>Manage Departments (Coming Soon)</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
