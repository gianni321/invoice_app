export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
  auth: {
    login: () => `${API_URL}/auth/login`,
  },
  entries: {
    list: (scope) => `${API_URL}/entries${scope ? `?scope=${scope}` : ''}`,
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
    withdraw: (id) => `${API_URL}/invoices/${id}/withdraw`,
    exportPdf: (id) => `${API_URL}/invoices/${id}/export/pdf`,
    exportCsv: (id) => `${API_URL}/invoices/${id}/export/csv`,
    deadlineStatus: () => `${API_URL}/invoices/deadline-status`,
    entries: (id) => `${API_URL}/invoices/${id}/entries`,
    revertToDraft: (id) => `${API_URL}/invoices/${id}/revert-to-draft`,
  },
  admin: {
    getDeadlineSettings: () => `${API_URL}/admin/invoice-deadline`,
    setDeadlineSettings: () => `${API_URL}/admin/invoice-deadline`,
    tags: () => `${API_URL}/admin/tags`,
    tagsActive: () => `${API_URL}/admin/tags/active`,
    tagCreate: () => `${API_URL}/admin/tags`,
    tagUpdate: (id) => `${API_URL}/admin/tags/${id}`,
    tagDelete: (id) => `${API_URL}/admin/tags/${id}`,
    settings: () => `${API_URL}/admin/settings`,
    settingsUpdate: () => `${API_URL}/admin/settings`,
    settingUpdate: (key) => `${API_URL}/admin/settings/${key}`,
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