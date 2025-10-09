import { API_CONFIG, HTTP_STATUS, ERROR_MESSAGES } from '../constants';
import { getAuthToken } from '../config';

/**
 * Base API client with error handling and retry logic
 */
class ApiClient {
  constructor(baseURL = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  /**
   * Get default headers for API requests
   * @returns {Object} Headers object
   */
  getHeaders() {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Make HTTP request with error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle different HTTP status codes
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Handle no content responses
      if (response.status === HTTP_STATUS.NO_CONTENT) {
        return null;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.blob();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      throw this.handleNetworkError(error);
    }
  }

  /**
   * Handle HTTP error responses
   * @param {Response} response - Fetch response
   */
  async handleErrorResponse(response) {
    let errorMessage = ERROR_MESSAGES.GENERIC_ERROR;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Use default error message if response is not JSON
    }

    switch (response.status) {
      case HTTP_STATUS.UNAUTHORIZED:
        errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
        // Trigger logout on auth failure
        window.dispatchEvent(new CustomEvent('auth:logout'));
        break;
      case HTTP_STATUS.FORBIDDEN:
        errorMessage = ERROR_MESSAGES.FORBIDDEN;
        break;
      case HTTP_STATUS.BAD_REQUEST:
        errorMessage = errorMessage || ERROR_MESSAGES.VALIDATION_ERROR;
        break;
    }

    throw new Error(errorMessage);
  }

  /**
   * Handle network errors
   * @param {Error} error - Network error
   */
  handleNetworkError(error) {
    if (!navigator.onLine) {
      return new Error('No internet connection. Please check your network.');
    }
    return new Error(ERROR_MESSAGES.NETWORK_ERROR);
  }

  // HTTP methods
  get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

/**
 * Authentication API service
 */
export const authApi = {
  login: (pin) => apiClient.post('/auth/login', { pin }),
  verify: () => apiClient.get('/auth/verify'),
  logout: () => apiClient.post('/auth/logout'),
};

/**
 * Entries API service
 */
export const entriesApi = {
  list: (scope) => apiClient.get(`/entries${scope ? `?scope=${scope}` : ''}`),
  create: (data) => apiClient.post('/entries', data),
  update: (id, data) => apiClient.put(`/entries/${id}`, data),
  delete: (id) => apiClient.delete(`/entries/${id}`),
  batchPreview: (data) => apiClient.post('/entries/batch/preview', data),
  batchImport: (data) => apiClient.post('/entries/batch/import', data),
};

/**
 * Invoices API service
 */
export const invoicesApi = {
  list: () => apiClient.get('/invoices'),
  create: (data) => apiClient.post('/invoices', data),
  submit: (data) => apiClient.post('/invoices/submit', data),
  approve: (id) => apiClient.post(`/invoices/${id}/approve`),
  markPaid: (id) => apiClient.post(`/invoices/${id}/paid`),
  withdraw: (id) => apiClient.post(`/invoices/${id}/withdraw`),
  download: (id) => apiClient.get(`/invoices/${id}/download`),
  deadlineStatus: () => apiClient.get('/invoices/deadline-status'),
  entries: (id) => apiClient.get(`/invoices/${id}/entries`),
  revertToDraft: (id) => apiClient.post(`/invoices/${id}/revert-to-draft`),
};

/**
 * Admin API service
 */
export const adminApi = {
  // Settings
  getSettings: () => apiClient.get('/admin/settings'),
  updateSettings: (data) => apiClient.put('/admin/settings', data),
  updateSetting: (key, value) => apiClient.put(`/admin/settings/${key}`, { value }),
  
  // Deadline settings
  getDeadlineSettings: () => apiClient.get('/admin/invoice-deadline'),
  setDeadlineSettings: (data) => apiClient.post('/admin/invoice-deadline', data),
  
  // Tags
  getTags: () => apiClient.get('/admin/tags'),
  getActiveTags: () => apiClient.get('/admin/tags/active'),
  createTag: (data) => apiClient.post('/admin/tags', data),
  updateTag: (id, data) => apiClient.put(`/admin/tags/${id}`, data),
  deleteTag: (id) => apiClient.delete(`/admin/tags/${id}`),
  
  // Reports
  getWeeklySummary: () => apiClient.get('/admin/weekly-summary'),
};

/**
 * Analytics API service
 */
export const analyticsApi = {
  getBurnRates: () => apiClient.get('/analytics/burn-rates'),
  getWeeklyExpenses: (week) => apiClient.get(`/analytics/weekly-expenses${week ? `/${week}` : ''}`),
  getTeamMetrics: () => apiClient.get('/analytics/team-metrics'),
  getInvoicesByWeek: () => apiClient.get('/analytics/invoices-by-week'),
  moveInvoice: (id, data) => apiClient.post(`/analytics/invoices/${id}/move`, data),
  getBudgetAnalysis: () => apiClient.get('/analytics/budget-analysis'),
};

export default apiClient;