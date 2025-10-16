/**
 * Frontend configuration with environment variable support
 * Uses Vite's import.meta.env for environment-specific settings
 */

// Environment-based API URL configuration
const getApiUrl = () => {
  // Production: Use environment variable
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || '/api';
  }
  
  // Development: Allow override or use default
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();
export const BASE_URL = API_URL.replace('/api', '');

// Application configuration
export const config = {
  api: {
    baseUrl: API_URL,
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000, // 10 seconds
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
  },
  auth: {
    // Use secure HTTP-only cookies in production
    useSecureCookies: import.meta.env.PROD,
    tokenStorageKey: 'auth_token',
    refreshInterval: parseInt(import.meta.env.VITE_AUTH_REFRESH_INTERVAL) || 900000, // 15 minutes
  },
  ui: {
    toastDuration: parseInt(import.meta.env.VITE_TOAST_DURATION) || 5000,
    pageSize: parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 20,
    autoSaveInterval: parseInt(import.meta.env.VITE_AUTOSAVE_INTERVAL) || 30000, // 30 seconds
  },
  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
    enableBatchImport: import.meta.env.VITE_ENABLE_BATCH_IMPORT !== 'false',
    enableNotifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS !== 'false',
  }
};

// API endpoints
export const api = {
  base: BASE_URL,
  auth: {
    login: () => `${API_URL}/auth/login`,
    logout: () => `${API_URL}/auth/logout`,
    refresh: () => `${API_URL}/auth/refresh`,
    verify: () => `${API_URL}/auth/verify`,
    changePassword: () => `${API_URL}/auth/change-password`,
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
    create: () => `${API_URL}/invoices`,
    submit: () => `${API_URL}/invoices/submit`,
    approve: (id) => `${API_URL}/invoices/${id}/approve`,
    markPaid: (id) => `${API_URL}/invoices/${id}/paid`,
    withdraw: (id) => `${API_URL}/invoices/${id}/withdraw`,
    download: (id) => `${API_URL}/invoices/${id}/download`,
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
    weeklySummary: () => `${API_URL}/admin/weekly-summary`,
  },
  analytics: {
    burnRates: () => `${API_URL}/analytics/burn-rates`,
    weeklyExpenses: (week) => `${API_URL}/analytics/weekly-expenses${week ? `/${week}` : ''}`,
    teamMetrics: () => `${API_URL}/analytics/team-metrics`,
    invoicesByWeek: () => `${API_URL}/analytics/invoices-by-week`,
    moveInvoice: (id) => `${API_URL}/analytics/invoices/${id}/move`,
    budgetAnalysis: () => `${API_URL}/analytics/budget-analysis`,
  },
};

/**
 * Enhanced authentication service with secure token handling
 */
class AuthService {
  constructor() {
    this.tokenKey = config.auth.tokenStorageKey;
    this.refreshTimer = null;
  }

  /**
   * Get authentication token
   * Prefer secure cookies in production
   */
  getAuthToken() {
    if (config.auth.useSecureCookies) {
      // In production, tokens should be in HTTP-only cookies
      // This is handled by the browser automatically
      return 'cookie'; // Signal that we're using cookies
    }
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    if (config.auth.useSecureCookies) {
      // In production, let the server set HTTP-only cookies
      // We don't store tokens in localStorage
      return;
    }
    localStorage.setItem(this.tokenKey, token);
    this.scheduleTokenRefresh();
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    if (config.auth.useSecureCookies) {
      // In production, call logout endpoint to clear cookies
      fetch(api.auth.logout(), {
        method: 'POST',
        credentials: 'include'
      }).catch(console.error);
      return;
    }
    localStorage.removeItem(this.tokenKey);
    this.clearTokenRefresh();
  }

  /**
   * Get authentication headers
   */
  getAuthHeaders() {
    const token = this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    if (config.auth.useSecureCookies) {
      // Include cookies for secure authentication
      return { ...headers, credentials: 'include' };
    }

    if (token && token !== 'cookie') {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make authenticated fetch request
   */
  async authenticatedFetch(url, options = {}) {
    const authHeaders = this.getAuthHeaders();
    
    const requestOptions = {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    };

    if (config.auth.useSecureCookies) {
      requestOptions.credentials = 'include';
    }

    try {
      const response = await fetch(url, requestOptions);
      
      // Handle token refresh if needed
      if (response.status === 401 && !config.auth.useSecureCookies) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the request with new token
          const newAuthHeaders = this.getAuthHeaders();
          return fetch(url, {
            ...requestOptions,
            headers: {
              ...newAuthHeaders,
              ...options.headers,
            },
          });
        }
      }

      return response;
    } catch (error) {
      console.error('Authenticated fetch error:', error);
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      const response = await fetch(api.auth.refresh(), {
        method: 'POST',
        credentials: config.auth.useSecureCookies ? 'include' : 'same-origin',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken && !config.auth.useSecureCookies) {
          this.setAuthToken(data.accessToken);
        }
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    return false;
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh() {
    this.clearTokenRefresh();
    
    if (!config.auth.useSecureCookies && config.auth.refreshInterval > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, config.auth.refreshInterval);
    }
  }

  /**
   * Clear token refresh timer
   */
  clearTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Create singleton auth service
export const authService = new AuthService();

// Legacy exports for backward compatibility
export const getAuthToken = () => authService.getAuthToken();
export const setAuthToken = (token) => authService.setAuthToken(token);
export const clearAuthToken = () => authService.clearAuthToken();
export const getAuthHeaders = () => authService.getAuthHeaders();

// Enhanced fetch for authenticated requests
export const authenticatedFetch = (url, options) => authService.authenticatedFetch(url, options);