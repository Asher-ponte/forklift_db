
// src/services/apiService.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      // Add Authorization header if/when auth tokens are implemented
      ...options?.headers,
    },
    ...options,
  });
  return handleResponse<T>(response);
}

// Auth
export const loginUser = (credentials: { username?: string; password?: string }) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const signupUser = (userData: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(userData) });
export const checkUser = (username: string) => request<any[]>(`/users?username=${encodeURIComponent(username)}`);


// Departments
export const fetchDepartments = () => request<any[]>('/departments');
export const addDepartment = (data: any) => request<any>('/departments', { method: 'POST', body: JSON.stringify(data) });
export const updateDepartment = (id: string, data: any) => request<any>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDepartment = (id: string) => request<void>(`/departments/${id}`, { method: 'DELETE' });

// MHE Units
export const fetchMheUnits = () => request<any[]>('/mhe-units');
export const addMheUnit = (data: any) => request<any>('/mhe-units', { method: 'POST', body: JSON.stringify(data) });
export const updateMheUnit = (id: string, data: any) => request<any>(`/mhe-units/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMheUnit = (id: string) => request<void>(`/mhe-units/${id}`, { method: 'DELETE' });
export const fetchMheUnitsByDepartment = (departmentId: string) => request<any[]>(`/mhe-units?department_id=${departmentId}`);


// Checklist Items
export const fetchChecklistItems = () => request<any[]>('/checklist-items');
export const addChecklistItem = (data: any) => request<any>('/checklist-items', { method: 'POST', body: JSON.stringify(data) });
export const updateChecklistItem = (id: string, data: any) => request<any>(`/checklist-items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteChecklistItem = (id: string) => request<void>(`/checklist-items/${id}`, { method: 'DELETE' });

// Inspection Reports
export const fetchInspectionReports = () => request<any[]>('/inspection-reports');
export const fetchInspectionReportsByUnitId = (unitId: string) => request<any[]>(`/inspection-reports?unitId=${unitId}`);
export const addInspectionReport = (data: any) => request<any>('/inspection-reports', { method: 'POST', body: JSON.stringify(data) });
export const deleteInspectionReport = (id: string) => request<void>(`/inspection-reports/${id}`, { method: 'DELETE' });


// Downtime Logs
export const fetchDowntimeLogs = () => request<any[]>('/downtime-logs');
export const addDowntimeLog = (data: any) => request<any>('/downtime-logs', { method: 'POST', body: JSON.stringify(data) });
export const updateDowntimeLog = (id: string, data: any) => request<any>(`/downtime-logs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDowntimeLogBySourceReportId = (reportId: string) => request<void>(`/downtime-logs?sourceReportId=${reportId}`, { method: 'DELETE' });


// PMS Task Masters
export const fetchPmsTaskMasters = () => request<any[]>('/pms-task-masters');
export const addPmsTaskMaster = (data: any) => request<any>('/pms-task-masters', { method: 'POST', body: JSON.stringify(data) });
export const updatePmsTaskMaster = (id: string, data: any) => request<any>(`/pms-task-masters/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePmsTaskMaster = (id: string) => request<void>(`/pms-task-masters/${id}`, { method: 'DELETE' });

// PMS Schedule Entries
export const fetchPmsScheduleEntries = () => request<any[]>('/pms-schedule-entries');
export const addPmsScheduleEntry = (data: any) => request<any>('/pms-schedule-entries', { method: 'POST', body: JSON.stringify(data) });
export const updatePmsScheduleEntry = (id: string, data: any) => request<any>(`/pms-schedule-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
// Note: Deleting schedule entries might be handled differently, e.g., by task master deletion or not at all.
// For now, assuming no direct deletion endpoint or it's handled by API logic.

