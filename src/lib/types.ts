
import type { InspectionRecordClientState } from './mock-data';

// New interface for unsafe items within a downtime log
export interface DowntimeUnsafeItem {
  part_name: string;
  remarks: string | null;
  photo_url: string | null;
}

export interface InspectionReportFull {
  id: string; // Unique ID for the report
  unitId: string;
  date: string; // ISO string for timestamp of submission
  operator: string;
  status: 'Safe' | 'Unsafe'; // Overall status based on items
  items: InspectionRecordClientState[];
}

// This type will be used for what's stored in localStorage for inspection reports
export type StoredInspectionReport = InspectionReportFull;

// New type for downtime log entries
export interface DowntimeLogEntry {
  id: string;
  unitId: string;
  reason: string;
  startTime: string; // ISO string
  endTime?: string | null; // ISO string, optional
  loggedAt: string; // ISO string, when the log was created by the user
  unsafeItems?: DowntimeUnsafeItem[]; // Array of unsafe items from inspection
  sourceReportId?: string; // ID of the inspection report that generated this log (if any)
}

// This type will be used for what's stored in localStorage for downtime logs
export type StoredDowntimeLog = DowntimeLogEntry;

