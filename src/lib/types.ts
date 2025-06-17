

// For SafetyCheckModal props
export interface ChecklistItem {
  id: string;
  qr_code_data: string;
  part_name: string;
  description: string;
  question: string;
}

// For Inspection Record items within a submitted report (client-side state before API save)
export interface InspectionRecordClientState {
  checklistItemId: string; 
  part_name: string; 
  question: string; 
  is_safe: boolean | null; 
  photo_url: string | null; // base64 data URI
  timestamp: string | null; // ISO string
  completed: boolean;
  remarks?: string | null; 
}

// Inspection Report Item structure as expected by/returned from API
export interface InspectionReportItem {
  id?: string; // Optional on create, present on fetch
  report_id_fk?: string; // Optional on create if items are nested
  checklist_item_id_fk: string | null; // Link to master, or null if ad-hoc
  part_name_snapshot: string;
  question_snapshot: string;
  is_safe: boolean | null;
  photo_url: string | null; // Could be data URI on send, might be a URL on fetch
  timestamp: string | null; // ISO string
  remarks: string | null;
}

// Full Inspection Report structure as expected by/returned from API
export interface StoredInspectionReport {
  id: string; // UUID, from API
  unit_id_fk: string; // MHE Unit UUID, FK
  unit_code_display: string; // Denormalized
  date: string; // ISO string for timestamp of submission
  operator_username: string;
  status: 'Safe' | 'Unsafe';
  user_id_fk: string; // User UUID, FK
  items: InspectionReportItem[];
}

// Downtime Unsafe Items structure as expected by/returned from API (part of a downtime log)
export interface DowntimeUnsafeItem {
  id?: string; // Optional on create
  downtime_log_id_fk?: string; // Optional on create if nested
  part_name: string;
  remarks: string | null;
  photo_url: string | null; // Could be data URI on send
}

// Full Downtime Log structure as expected by/returned from API
export interface StoredDowntimeLog {
  id: string; // UUID, from API
  unit_id_fk: string; // MHE Unit UUID, FK
  unit_code_display: string; // Denormalized
  reason: string;
  start_time: string; // ISO string
  end_time?: string | null; // ISO string, optional
  logged_at: string; // ISO string, from API (when record was created in DB)
  source_report_id_fk?: string | null; // InspectionReport UUID, FK
  user_id_fk: string; // User UUID, FK
  unsafe_items?: DowntimeUnsafeItem[]; // Array of unsafe items
}


// --- Data types from Data Management for shared use (as returned by API) ---
export interface Department {
  id: string; // UUID
  name: string;
  description?: string | null;
}

export interface MheUnit {
  id: string; // UUID
  unit_code: string;
  name: string;
  department_id?: string | null; // Department UUID
  department_name?: string; // Often joined/added by frontend if API doesn't provide
  type?: string | null;
  status?: 'active' | 'inactive' | 'maintenance';
}

export interface ChecklistMasterItem {
  id: string; // UUID
  qr_code_data?: string | null;
  part_name: string;
  description?: string | null;
  question: string;
  is_active?: boolean; // API might return as 0/1 or true/false
}

// --- PMS Types (as returned by API) ---
export interface StoredPmsTaskMaster {
  id: string; // UUID
  name: string;
  description?: string | null;
  frequency_unit: 'days' | 'weeks' | 'months' | 'operating_hours';
  frequency_value: number;
  category?: string | null;
  estimated_duration_minutes?: number | null;
  is_active?: boolean; // Or number (0/1)
}

export interface StoredPmsScheduleEntry {
  id: string; // UUID
  mhe_unit_id: string; // MheUnit UUID, FK
  pms_task_master_id: string; // PmsTaskMaster UUID, FK
  due_date: string; // ISO Date string (YYYY-MM-DD)
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Skipped';
  completion_date?: string | null; // ISO Date string
  serviced_by_user_id_fk?: string | null; // User UUID, FK
  serviced_by_username_display?: string | null; // Denormalized
  notes?: string | null;
}

// Type for combined display data in PMS Schedule page
export interface PmsScheduleDisplayEntry extends StoredPmsScheduleEntry {
  mhe_unit_code: string;
  mhe_unit_name: string;
  task_name: string;
  task_description?: string | null;
  task_category?: string | null;
  task_frequency_display: string;
}

// User type from AuthContext (can be refined if API returns more/less)
export interface User {
  id: string; // UUID
  username: string;
  role: 'operator' | 'supervisor';
}
