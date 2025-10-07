import { toast } from 'react-toastify';

/**
 * Centralized notification system with standardized messages
 */
export class NotificationService {
  // Success notifications
  static success(message, options = {}) {
    toast.success(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  }

  // Error notifications
  static error(message, options = {}) {
    toast.error(message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  }

  // Warning notifications
  static warning(message, options = {}) {
    toast.warning(message, {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  }

  // Info notifications
  static info(message, options = {}) {
    toast.info(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  }

  // Loading notifications with promise
  static loading(promise, messages = {}) {
    const defaultMessages = {
      pending: 'Processing...',
      success: 'Operation completed successfully',
      error: 'Operation failed'
    };

    const finalMessages = { ...defaultMessages, ...messages };

    return toast.promise(promise, finalMessages, {
      position: "top-right"
    });
  }

  // Dismiss all notifications
  static dismissAll() {
    toast.dismiss();
  }

  // Standardized messages for common operations
  static auth = {
    loginSuccess: (userName) => NotificationService.success(`Welcome back, ${userName}!`),
    loginError: (error) => NotificationService.error(error || 'Login failed. Please check your credentials.'),
    logoutSuccess: () => NotificationService.info('You have been signed out'),
    sessionExpired: () => NotificationService.warning('Your session has expired. Please sign in again.')
  };

  static entries = {
    created: () => NotificationService.success('Time entry created successfully'),
    updated: () => NotificationService.success('Time entry updated successfully'),
    deleted: () => NotificationService.success('Time entry deleted successfully'),
    batchImported: (count) => NotificationService.success(`${count} time entries imported successfully`),
    createError: (error) => NotificationService.error(error || 'Failed to create time entry'),
    updateError: (error) => NotificationService.error(error || 'Failed to update time entry'),
    deleteError: (error) => NotificationService.error(error || 'Failed to delete time entry'),
    fetchError: (error) => NotificationService.error(error || 'Failed to load time entries')
  };

  static invoices = {
    created: () => NotificationService.success('Invoice submitted successfully'),
    updated: () => NotificationService.success('Invoice updated successfully'),
    deleted: () => NotificationService.success('Invoice deleted successfully'),
    downloaded: () => NotificationService.success('Invoice downloaded successfully'),
    statusUpdated: (status) => NotificationService.success(`Invoice marked as ${status}`),
    createError: (error) => NotificationService.error(error || 'Failed to create invoice'),
    updateError: (error) => NotificationService.error(error || 'Failed to update invoice'),
    deleteError: (error) => NotificationService.error(error || 'Failed to delete invoice'),
    downloadError: (error) => NotificationService.error(error || 'Failed to download invoice'),
    fetchError: (error) => NotificationService.error(error || 'Failed to load invoices')
  };

  static validation = {
    required: (field) => NotificationService.warning(`${field} is required`),
    invalid: (field) => NotificationService.warning(`Please enter a valid ${field}`),
    minLength: (field, length) => NotificationService.warning(`${field} must be at least ${length} characters`),
    maxLength: (field, length) => NotificationService.warning(`${field} cannot exceed ${length} characters`),
    range: (field, min, max) => NotificationService.warning(`${field} must be between ${min} and ${max}`)
  };

  static network = {
    offline: () => NotificationService.warning('You appear to be offline. Some features may not work.'),
    online: () => NotificationService.info('Connection restored'),
    slowConnection: () => NotificationService.info('Slow connection detected. Please be patient.'),
    serverError: () => NotificationService.error('Server error. Please try again later.'),
    timeout: () => NotificationService.error('Request timed out. Please check your connection.')
  };

  static general = {
    saved: () => NotificationService.success('Changes saved successfully'),
    copied: () => NotificationService.info('Copied to clipboard'),
    unsavedChanges: () => NotificationService.warning('You have unsaved changes'),
    operationCancelled: () => NotificationService.info('Operation cancelled'),
    featureNotAvailable: () => NotificationService.info('This feature is not available yet'),
    maintenanceMode: () => NotificationService.warning('System is under maintenance. Some features may be limited.')
  };
}

// Create a more convenient export for common usage
export const notify = NotificationService;