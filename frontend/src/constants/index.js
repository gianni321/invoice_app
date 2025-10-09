/**
 * Application-wide constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
};

// Authentication
export const AUTH_CONFIG = {
  TOKEN_KEY: 'auth_token',
  TOKEN_EXPIRY_BUFFER: 300000, // 5 minutes in milliseconds
  PIN_LENGTH: 4,
  SESSION_TIMEOUT: 28800000, // 8 hours in milliseconds
};

// UI Constants
export const UI_CONFIG = {
  TOAST_DURATION: 5000,
  ANIMATION_DURATION: 200,
  DEBOUNCE_DELAY: 300,
  PAGE_SIZE: 20,
};

// Validation Rules
export const VALIDATION_RULES = {
  HOURS: {
    MIN: 0.25,
    MAX: 24,
    STEP: 0.25,
  },
  TASK: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200,
  },
  NOTES: {
    MAX_LENGTH: 500,
  },
  PIN: {
    MIN_LENGTH: 4,
    MAX_LENGTH: 10,
  },
};

// Time & Date
export const TIME_CONFIG = {
  WORK_WEEK_START: 1, // Monday (ISO weekday)
  WORK_WEEK_END: 7,   // Sunday
  BUSINESS_HOURS_START: 9,
  BUSINESS_HOURS_END: 17,
  TIMEZONE: 'America/Denver',
};

// User Roles
export const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  MEMBER: 'member',
});

// HTTP Status Codes
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
});

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
  LOGIN_FAILED: 'Invalid credentials. Please try again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Welcome back!',
  LOGOUT_SUCCESS: 'Logged out successfully',
  ENTRY_CREATED: 'Time entry added successfully',
  ENTRY_UPDATED: 'Time entry updated successfully',
  ENTRY_DELETED: 'Time entry deleted successfully',
  INVOICE_SUBMITTED: 'Invoice submitted successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  DATA_EXPORTED: 'Data exported successfully',
};

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: true,
  ENABLE_BATCH_ENTRY: true,
  ENABLE_WEEKLY_SUMMARY: true,
  ENABLE_DARK_MODE: false,
  ENABLE_NOTIFICATIONS: true,
};