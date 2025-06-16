

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

// Data types from Data Management for shared use
export interface Department {
  id: string;
  name: string;
  description?: string | null;
}

export interface MheUnit {
  id: string; // uuid
  unit_code: string;
  name: string;
  department_id?: string | null;
  department_name?: string; // This might be added dynamically if needed
  type?: string | null;
  status?: 'active' | 'inactive' | 'maintenance';
}

// PMS - Master Task Definition
export interface PmsTaskMaster {
  id: string; // uuid
  name: string; // e.g., "Engine Oil and Filter Change"
  description?: string | null;
  frequency_unit: 'days' | 'weeks' | 'months' | 'operating_hours';
  frequency_value: number; // e.g., 30 (days), 4 (weeks), 1 (month), 250 (operating_hours)
  estimated_duration_minutes?: number | null; // e.g., 60
  category?: string | null; // e.g., "Engine", "Hydraulics", "Electrical", "General Safety"
  is_active?: boolean; // Default true
}

// PMS - Scheduled Entry for a specific MHE
export interface PmsScheduleEntry {
  id: string; // uuid
  mhe_unit_id: string; // Foreign key to MheUnit.id
  pms_task_master_id: string; // Foreign key to PmsTaskMaster.id
  due_date: string; // ISO Date string (YYYY-MM-DD)
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Skipped';
  completion_date?: string | null; // ISO Date string (YYYY-MM-DD)
  serviced_by_user_id?: string | null; // User.id who completed/serviced
  serviced_by_username?: string | null; // For display convenience
  notes?: string | null;
  // next_due_date could be calculated upon completion based on frequency
  // For simplicity, we might handle next_due_date generation when a task is marked complete
}

// Stored types for PMS
export type StoredPmsTaskMaster = PmsTaskMaster;
export type StoredPmsScheduleEntry = PmsScheduleEntry;

// Type for combined display data
export interface PmsScheduleDisplayEntry extends PmsScheduleEntry {
  mhe_unit_code: string;
  mhe_unit_name: string;
  task_name: string;
  task_description?: string | null;
  task_category?: string | null;
  task_frequency_display: string; // e.g. "Every 30 days"
}
