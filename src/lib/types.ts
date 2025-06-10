
import type { InspectionRecordClientState } from './mock-data';

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
}

// This type will be used for what's stored in localStorage for downtime logs
export type StoredDowntimeLog = DowntimeLogEntry;
