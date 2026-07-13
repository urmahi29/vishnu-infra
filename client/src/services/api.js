import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-unauthorized'));
      }

      // Check if the response data is an HTML page (like 502/504 proxy timeout)
      if (typeof error.response.data === 'string' && error.response.data.trim().startsWith('<')) {
        return Promise.reject({
          success: false,
          message: `Server Connection Error (${status}). Please make sure the API backend server is running.`,
        });
      }

      return Promise.reject(error.response.data || { success: false, message: 'Server error' });
    }

    if (error.request) {
      return Promise.reject({
        success: false,
        message: 'Network error. Please check your connection.',
      });
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  firebaseLogin: (data) => api.post('/auth/firebase-login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Projects API
export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  
  // Staff
  getStaff: (projectId) => api.get(`/projects/${projectId}/staff`),
  addStaff: (projectId, data) => api.post(`/projects/${projectId}/staff`, data),
  editStaff: (projectId, id, data) => api.put(`/projects/${projectId}/staff/${id}`, data),
  deleteStaff: (projectId, id) => api.delete(`/projects/${projectId}/staff/${id}`),
  
  // Vehicle
  getVehicles: (projectId) => api.get(`/projects/${projectId}/vehicles`),
  addVehicle: (projectId, data) => api.post(`/projects/${projectId}/vehicles`, data),
  editVehicle: (projectId, id, data) => api.put(`/projects/${projectId}/vehicles/${id}`, data),
  deleteVehicle: (projectId, id) => api.delete(`/projects/${projectId}/vehicles/${id}`),

  getMilestones: (projectId) => api.get(`/projects/${projectId}/milestones`),
  createMilestone: (projectId, data) => api.post(`/projects/${projectId}/milestones`, data),
  updateMilestone: (projectId, id, data) => api.put(`/projects/${projectId}/milestones/${id}`, data),
};

// Tasks API
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addComment: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),
};



// Materials API
export const materialsAPI = {
  getAll: (params) => api.get('/materials', { params }),
  getById: (id) => api.get(`/materials/${id}`),
  create: (data) => api.post('/materials', data),
  update: (id, data) => api.put(`/materials/${id}`, data),
  delete: (id) => api.delete(`/materials/${id}`),
  addStockMovement: (data) => api.post('/materials/stock-movement', data),
  getSuppliers: () => api.get('/materials/suppliers/list'),
  createSupplier: (data) => api.post('/materials/suppliers', data),
  getPurchaseOrders: (params) => api.get('/materials/purchase-orders/list', { params }),
};

// Budget API
export const budgetAPI = {
  getItems: (params) => api.get('/budget/items', { params }),
  createItem: (data) => api.post('/budget/items', data),
  updateItem: (id, data) => api.put(`/budget/items/${id}`, data),
  getExpenses: (params) => api.get('/budget/expenses', { params }),
  createExpense: (data) => api.post('/budget/expenses', data),
  updateExpenseStatus: (id, data) => api.put(`/budget/expenses/${id}/status`, data),
  getSummary: (projectId) => api.get(`/budget/summary/${projectId}`),
  getInvoices: (params) => api.get('/budget/invoices', { params }),
  createInvoice: (data) => api.post('/budget/invoices', data),
  recordPayment: (invoiceId, data) => api.post(`/budget/invoices/${invoiceId}/payments`, data),
  getProjectExpenses: (projectId) => api.get('/budget/project-expenses', { params: { project_id: projectId } }),
  createProjectExpense: (data) => api.post('/budget/project-expenses', data),
  updateProjectExpense: (id, data) => api.put(`/budget/project-expenses/${id}`, data),
  deleteProjectExpense: (id) => api.delete(`/budget/project-expenses/${id}`),
};

// Workforce API
export const workforceAPI = {
  getAll: (params) => api.get('/workforce', { params }),
  getById: (id) => api.get(`/workforce/${id}`),
  create: (data) => api.post('/workforce', data),
  update: (id, data) => api.put(`/workforce/${id}`, data),
  delete: (id) => api.delete(`/workforce/${id}`),
  markAttendance: (data) => api.post('/workforce/attendance', data),
  processPayroll: (data) => api.post('/workforce/payroll/process', data),
  getDocuments: (employeeId) => api.get(`/workforce/${employeeId}/documents`),
  uploadDocument: (employeeId, data) => api.post(`/workforce/${employeeId}/documents`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteDocument: (employeeId, docId) => api.delete(`/workforce/${employeeId}/documents/${docId}`),
};

// Reports API
export const reportsAPI = {
  getDashboardKPIs: () => api.get('/reports/dashboard/kpis'),
  getProjectStatus: () => api.get('/reports/projects/status'),
  getMonthlyExpenses: (year) => api.get('/reports/expenses/monthly', { params: { year } }),
  getEquipmentUtilization: () => api.get('/reports/equipment/utilization'),
  getWorkforceDistribution: () => api.get('/reports/workforce/distribution'),
  getBudgetVsActual: () => api.get('/reports/budget/vs-actual'),
  getSafetyReport: () => api.get('/reports/safety/overview'),
  exportReport: (type) => api.get(`/reports/export/${type}`, { responseType: 'blob' }),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  create: (data) => api.post('/notifications', data),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Documents API
export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (data) => api.post('/documents', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  checkFile: (id) => api.get(`/documents/check-file/${id}`),
  updateVehicleFolder: (vehicleNumber, data) => api.put(`/documents/vehicle/${vehicleNumber}`, data),
  getVehicleInfo: (vehicleNumber) => api.get(`/documents/vehicle-info/${vehicleNumber}`),
};

// Safety API
export const safetyAPI = {
  getIncidents: (params) => api.get('/safety/incidents', { params }),
  createIncident: (data) => api.post('/safety/incidents', data),
  updateIncident: (id, data) => api.put(`/safety/incidents/${id}`, data),
  getInspections: (params) => api.get('/safety/inspections', { params }),
  createInspection: (data) => api.post('/safety/inspections', data),
  getTraining: () => api.get('/safety/training'),
  createTraining: (data) => api.post('/safety/training', data),
  addTrainingAttendee: (trainingId, data) => api.post(`/safety/training/${trainingId}/attendees`, data),
};

// Dashboard API
export const dashboardAPI = {
  getAdmin: () => api.get('/dashboard/admin'),
  getUser: () => api.get('/dashboard/user'),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getAuditLogs: (params) => api.get('/users/audit/logs', { params }),
  getPendingRegistrations: (params) => api.get('/users/registrations/pending', { params }),
  getPendingCount: () => api.get('/users/registrations/pending-count'),
  approveRegistration: (id) => api.put(`/users/${id}/approve`),
  rejectRegistration: (id, data) => api.put(`/users/${id}/reject`, data),
};

// Fuel API
export const fuelAPI = {
  getAll: (params) => api.get('/fuel', { params }),
  getById: (id) => api.get(`/fuel/${id}`),
  create: (data) => api.post('/fuel', data),
  update: (id, data) => api.put(`/fuel/${id}`, data),
  delete: (id) => api.delete(`/fuel/${id}`),
  getVehicleReport: () => api.get('/fuel/reports/vehicles'),
  getMonthlyReport: () => api.get('/fuel/reports/monthly'),
};

// Staff Expenses API
export const staffExpensesAPI = {
  getAll: (params) => api.get('/staff-expenses', { params }),
  getById: (id) => api.get(`/staff-expenses/${id}`),
  create: (data) => api.post('/staff-expenses', data),
  update: (id, data) => api.put(`/staff-expenses/${id}`, data),
  delete: (id) => api.delete(`/staff-expenses/${id}`),
  getEmployeeReport: () => api.get('/staff-expenses/reports/employees'),
  getMonthlyReport: () => api.get('/staff-expenses/reports/monthly'),
};

// Trips API
export const tripsAPI = {
  getAll: (params) => api.get('/trips', { params }),
  getById: (id) => api.get(`/trips/${id}`),
  create: (data) => api.post('/trips', data),
  update: (id, data) => api.put(`/trips/${id}`, data),
  delete: (id) => api.delete(`/trips/${id}`),
  start: (id) => api.patch(`/trips/${id}/start`),
  complete: (id, data) => api.patch(`/trips/${id}/complete`, data),
};

// Project-Level Fuel API
export const projectFuelAPI = {
  getEntries: (projectId) => api.get(`/project-fuel/project/${projectId}`),
  create: (data) => api.post('/project-fuel', data),
  update: (id, data) => api.put(`/project-fuel/${id}`, data),
  delete: (id) => api.delete(`/project-fuel/${id}`),
};

// Project-Level Staff Expenses API
export const projectStaffExpensesAPI = {
  getEntries: (projectId) => api.get(`/project-staff-expenses/project/${projectId}`),
  create: (data) => api.post('/project-staff-expenses', data),
  update: (id, data) => api.put(`/project-staff-expenses/${id}`, data),
  delete: (id) => api.delete(`/project-staff-expenses/${id}`),
};

// Project-Level Trips API
export const projectTripsAPI = {
  getEntries: (projectId) => api.get(`/project-trips/project/${projectId}`),
  create: (data) => api.post('/project-trips', data),
  update: (id, data) => api.put(`/project-trips/${id}`, data),
  delete: (id) => api.delete(`/project-trips/${id}`),
  saveSheet: (data) => api.post('/project-trips/sheet', data),
  deleteSheet: (projectId, date, type) => api.delete('/project-trips/sheet', { params: { project_id: projectId, trip_date: date, trip_type: type } }),
};

export default api;
