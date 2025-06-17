
// src/services/apiService.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_KEY;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // Try to parse error response from API
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // If response is not JSON, use statusText
      errorData = { message: response.statusText || `API request failed with status ${response.status}` };
    }
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }
  // If response is OK, try to parse JSON, handle cases where body might be empty for 204 etc.
  const contentType = response.headers.get("content-type");
  if (response.status === 204) { // No Content
    return Promise.resolve(undefined as unknown as T);
  }
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json() as Promise<T>;
  } else {
    // Handle non-JSON success responses by returning the text or undefined if empty
    const text = await response.text();
    if (text.length > 0) {
        console.warn("API success response was not JSON:", text);
        // Depending on expectations, you might want to return text here
        // For this app's design, if it's not JSON and not 204, it's unexpected for most endpoints.
        // Consider if any of your GET endpoints might return plain text intentionally.
    }
    // If you expect plain text for some successful GETs, you might need to adjust this.
    // Otherwise, for an API that's supposed to return JSON or 204, this is an anomaly.
    return undefined as unknown as T;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    const errorMessage = "API_BASE_URL (NEXT_PUBLIC_API_KEY) is not defined. Please check your .env.local file and ensure the Next.js development server was restarted after changes.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header if/when auth tokens are implemented
        ...options?.headers,
      },
      ...options,
    });
    return handleResponse<T>(response);
  } catch (error) {
    let errorMessage = `API request to ${url} failed.`;

    if (error instanceof TypeError && (error.message.toLowerCase().includes("failed to fetch") || error.message.toLowerCase().includes("networkerror"))) {
        errorMessage +=
            ` This often indicates a network issue, the API server at ${API_BASE_URL} is not running/accessible, ` +
            `or CORS is not configured correctly on the server to accept requests from this origin. Please check your API server and network configuration.`;
    } else if (error instanceof Error) {
        errorMessage += ` Details: ${error.message}`;
    } else {
        errorMessage += ` An unknown error occurred.`;
    }
    console.error(errorMessage, error); 
    throw new Error(errorMessage); 
  }
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

