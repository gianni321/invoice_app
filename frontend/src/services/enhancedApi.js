import axios from 'axios';

/**
 * Enhanced API client with retry logic, error handling, and interceptors
 */
class EnhancedApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor for auth
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          localStorage.removeItem('authToken');
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return Promise.reject(error);
        }

        // Handle network errors with retry
        if (!error.response && originalRequest._retryCount < 3) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          
          // Exponential backoff
          const delay = Math.pow(2, originalRequest._retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.client(originalRequest);
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(data.error || 'Bad request');
        case 401:
          return new Error('Unauthorized - please login again');
        case 403:
          return new Error('Forbidden - insufficient permissions');
        case 404:
          return new Error('Resource not found');
        case 429:
          return new Error('Too many requests - please try again later');
        case 500:
          return new Error('Server error - please try again later');
        default:
          return new Error(data.error || 'An error occurred');
      }
    } else if (error.request) {
      // Network error
      if (!navigator.onLine) {
        return new Error('No internet connection');
      }
      return new Error('Network error - please check your connection');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  // HTTP methods with enhanced error handling
  async get(url, config = {}) {
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async post(url, data, config = {}) {
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async put(url, data, config = {}) {
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async delete(url, config = {}) {
    try {
      const response = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async patch(url, data, config = {}) {
    try {
      const response = await this.client.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // File download methods
  async downloadFile(url, filename) {
    try {
      const response = await this.client.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
const apiClient = new EnhancedApiClient();

// API service methods
export const apiService = {
  // Auth
  auth: {
    login: (pin) => apiClient.post('/auth/login', { pin }),
    verify: () => apiClient.get('/auth/verify'),
    logout: () => apiClient.post('/auth/logout'),
  },

  // Entries
  entries: {
    list: (scope) => apiClient.get(`/entries${scope ? `?scope=${scope}` : ''}`),
    create: (data) => apiClient.post('/entries', data),
    update: (id, data) => apiClient.put(`/entries/${id}`, data),
    delete: (id) => apiClient.delete(`/entries/${id}`),
    batchPreview: (data) => apiClient.post('/entries/batch/preview', data),
    batchImport: (data) => apiClient.post('/entries/batch/import', data),
  },

  // Invoices
  invoices: {
    list: () => apiClient.get('/invoices'),
    create: (data) => apiClient.post('/invoices', data),
    submit: () => apiClient.post('/invoices/submit'),
    approve: (id) => apiClient.post(`/invoices/${id}/approve`),
    markPaid: (id) => apiClient.post(`/invoices/${id}/paid`),
    withdraw: (id) => apiClient.post(`/invoices/${id}/withdraw`),
    exportPdf: (id) => apiClient.downloadFile(`/invoices/${id}/export/pdf`, `invoice-${id}.pdf`),
    exportCsv: (id) => apiClient.downloadFile(`/invoices/${id}/export/csv`, `invoice-${id}.csv`),
  },

  // Admin
  admin: {
    getSettings: () => apiClient.get('/admin/settings'),
    updateSettings: (data) => apiClient.put('/admin/settings', data),
    getTags: () => apiClient.get('/admin/tags'),
    getActiveTags: () => apiClient.get('/admin/tags/active'),
    createTag: (data) => apiClient.post('/admin/tags', data),
    updateTag: (id, data) => apiClient.put(`/admin/tags/${id}`, data),
    deleteTag: (id) => apiClient.delete(`/admin/tags/${id}`),
    getWeeklySummary: () => apiClient.get('/admin/weekly-summary'),
  },

  // Analytics
  analytics: {
    getBurnRates: () => apiClient.get('/analytics/burn-rates'),
    getWeeklyExpenses: (week) => apiClient.get(`/analytics/weekly-expenses${week ? `/${week}` : ''}`),
    getTeamMetrics: () => apiClient.get('/analytics/team-metrics'),
  },
};

export default apiClient;
