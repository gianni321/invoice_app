export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = {
  auth: {
    login: () => `${API_URL}/auth/login`,
  },
  entries: {
    list: () => `${API_URL}/entries`,
    create: () => `${API_URL}/entries`,
    update: (id) => `${API_URL}/entries/${id}`,
    delete: (id) => `${API_URL}/entries/${id}`,
    batchPreview: () => `${API_URL}/entries/batch/preview`,
    batchImport: () => `${API_URL}/entries/batch/import`,
  },
  invoices: {
    list: () => `${API_URL}/invoices`,
    submit: () => `${API_URL}/invoices/submit`,
    approve: (id) => `${API_URL}/invoices/${id}/approve`,
    markPaid: (id) => `${API_URL}/invoices/${id}/paid`,
    deadlineStatus: () => `${API_URL}/invoices/deadline-status`,
  },
  admin: {
    getDeadlineSettings: () => `${API_URL}/admin/invoice-deadline`,
    setDeadlineSettings: () => `${API_URL}/admin/invoice-deadline`,
  },
};

export function getAuthToken() {
  return localStorage.getItem('token');
}

export function setAuthToken(token) {
  localStorage.setItem('token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('token');
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}