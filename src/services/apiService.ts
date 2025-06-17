
// src/services/apiService.ts

// For proxied requests, the API_BASE_URL is the frontend URL.
// For direct calls (e.g., server-side, or if not using proxy), it would be the backend URL.
// Since we're using Next.js rewrites as a proxy, fetch calls will be relative to the frontend.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_KEY || ''; 

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: response.statusText || `API request failed with status ${response.status}` };
    }
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }
  if (response.status === 204) { // No Content
    return Promise.resolve(undefined as unknown as T);
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json() as Promise<T>;
  } else {
    const text = await response.text();
    if (text) {
      console.warn("API success response was not JSON but had content:", text);
      // If plain text is sometimes expected, this might need adjustment
      return text as unknown as T; 
    }
    return undefined as unknown as T; // Or handle as error if JSON always expected
  }
}


async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (!process.env.NEXT_PUBLIC_API_KEY && !endpoint.startsWith('http')) {
     // This check is more relevant if API_BASE_URL was intended for direct backend calls.
     // With proxy, relative paths are fine.
    const errorMessage = "NEXT_PUBLIC_API_KEY is not defined and a relative endpoint is used. This setup is for proxied requests. Ensure your Next.js proxy and backend server are configured.";
    console.error(errorMessage);
    // throw new Error(errorMessage); // Removed throw to allow relative paths for proxy
  }
  
  // If API_BASE_URL is set (e.g. http://localhost:9003 for proxied calls from client)
  // and endpoint starts with /api, it will become http://localhost:9003/api/...
  // If API_BASE_URL is empty, and endpoint is /api/..., it becomes a relative path.
  const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    return handleResponse<T>(response);
  } catch (error) {
    let errorMessage = `API request to ${url} failed.`;
    if (error instanceof TypeError && (error.message.toLowerCase().includes("failed to fetch") || error.message.toLowerCase().includes("networkerror"))) {
        errorMessage +=
            ` This often indicates a network issue, the API server (proxied to http://localhost:3001) is not running/accessible, ` +
            `or CORS is not configured correctly on the backend server if you were calling it directly (though proxy should handle this for client). Please check your API server and network configuration.`;
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
// Note: loginUser will use POST /api/auth/login (needs backend implementation)
export const loginUser = (credentials: { username?: string; password?: string }) => request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const signupUser = (userData: any) => request<any>('/api/users', { method: 'POST', body: JSON.stringify(userData) });
export const checkUser = (username: string) => request<any[]>(`/api/users?username=${encodeURIComponent(username)}`);


// Departments
export const fetchDepartments = () => request<any[]>('/api/departments');
export const addDepartment = (data: any) => request<any>('/api/departments', { method: 'POST', body: JSON.stringify(data) });
export const updateDepartment = (id: string, data: any) => request<any>(`/api/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDepartment = (id: string) => request<void>(`/api/departments/${id}`, { method: 'DELETE' });

// MHE Units
export const fetchMheUnits = () => request<any[]>('/api/mhe-units');
export const addMheUnit = (data: any) => request<any>('/api/mhe-units', { method: 'POST', body: JSON.stringify(data) });
export const updateMheUnit = (id: string, data: any) => request<any>(`/api/mhe-units/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMheUnit = (id: string) => request<void>(`/api/mhe-units/${id}`, { method: 'DELETE' });
export const fetchMheUnitsByDepartment = (departmentId: string) => request<any[]>(`/api/mhe-units?department_id=${departmentId}`);


// Checklist Items
export const fetchChecklistItems = () => request<any[]>('/api/checklist-items');
export const addChecklistItem = (data: any) => request<any>('/api/checklist-items', { method: 'POST', body: JSON.stringify(data) });
export const updateChecklistItem = (id: string, data: any) => request<any>(`/api/checklist-items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteChecklistItem = (id: string) => request<void>(`/api/checklist-items/${id}`, { method: 'DELETE' });

// Inspection Reports
export const fetchInspectionReports = () => request<any[]>('/api/inspection-reports');
export const fetchInspectionReportsByUnitId = (unitId: string) => request<any[]>(`/api/inspection-reports?unitId=${unitId}`);
export const addInspectionReport = (data: any) => request<any>('/api/inspection-reports', { method: 'POST', body: JSON.stringify(data) });
export const deleteInspectionReport = (id: string) => request<void>(`/api/inspection-reports/${id}`, { method: 'DELETE' });


// Downtime Logs
export const fetchDowntimeLogs = () => request<any[]>('/api/downtime-logs');
export const addDowntimeLog = (data: any) => request<any>('/api/downtime-logs', { method: 'POST', body: JSON.stringify(data) });
export const updateDowntimeLog = (id: string, data: any) => request<any>(`/api/downtime-logs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDowntimeLogBySourceReportId = (reportId: string) => request<void>(`/api/downtime-logs?sourceReportId=${reportId}`, { method: 'DELETE' });


// PMS Task Masters
export const fetchPmsTaskMasters = () => request<any[]>('/api/pms-task-masters');
export const addPmsTaskMaster = (data: any) => request<any>('/api/pms-task-masters', { method: 'POST', body: JSON.stringify(data) });
export const updatePmsTaskMaster = (id: string, data: any) => request<any>(`/api/pms-task-masters/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePmsTaskMaster = (id: string) => request<void>(`/api/pms-task-masters/${id}`, { method: 'DELETE' });

// PMS Schedule Entries
export const fetchPmsScheduleEntries = () => request<any[]>('/api/pms-schedule-entries');
export const addPmsScheduleEntry = (data: any) => request<any>('/api/pms-schedule-entries', { method: 'POST', body: JSON.stringify(data) });
export const updatePmsScheduleEntry = (id: string, data: any) => request<any>(`/api/pms-schedule-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
