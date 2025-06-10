
import type { InspectionRecordClientState } from './mock-data';

export interface InspectionReportFull {
  id: string; // Unique ID for the report
  unitId: string;
  date: string; // ISO string for timestamp of submission
  operator: string;
  status: 'Safe' | 'Unsafe'; // Overall status based on items
  items: InspectionRecordClientState[];
  // photoUrl for the report page could be the first unsafe item's photo, or first item's photo
  // dataAiHint would be derived similarly
}

// This type will be used for what's stored in localStorage
export type StoredInspectionReport = InspectionReportFull;
