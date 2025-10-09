/**
 * @fileoverview Application monitoring utilities for error tracking and analytics
 */

/**
 * Error categories for tracking and analysis
 * @readonly
 * @enum {string}
 */
export const ErrorCategory = {
  API: 'api',
  VALIDATION: 'validation',
  AUTHENTICATION: 'auth',
  NETWORK: 'network',
  PERFORMANCE: 'performance',
  UI: 'ui'
};

/**
 * Performance metrics tracking
 * @readonly
 * @enum {string}
 */
export const PerformanceMetric = {
  PAGE_LOAD: 'page_load',
  API_REQUEST: 'api_request',
  COMPONENT_RENDER: 'component_render',
  USER_INTERACTION: 'user_interaction'
};

/**
 * User action events for analytics
 * @readonly
 * @enum {string}
 */
export const UserAction = {
  INVOICE_CREATED: 'invoice_created',
  INVOICE_UPDATED: 'invoice_updated',
  INVOICE_SENT: 'invoice_sent',
  INVOICE_PAID: 'invoice_paid',
  TIME_ENTRY_ADDED: 'time_entry_added',
  TIME_ENTRY_EDITED: 'time_entry_edited',
  TIME_ENTRY_DELETED: 'time_entry_deleted',
  SETTINGS_UPDATED: 'settings_updated',
  EXPORT_GENERATED: 'export_generated'
};

/**
 * Application monitoring and analytics class
 */
class AppMonitoring {
  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production';
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.errorQueue = [];
    this.performanceQueue = [];
    this.eventQueue = [];
    this.maxQueueSize = 100;
  }

  /**
   * Initialize monitoring with user context
   * @param {string} userId - Current user identifier
   */
  initialize(userId) {
    this.userId = userId;
    this.trackEvent('session_started', { sessionId: this.sessionId });
    this.setupErrorListeners();
    this.setupPerformanceObserver();
  }

  /**
   * Generate unique session identifier
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup global error listeners
   * @private
   */
  setupErrorListeners() {
    if (!this.isEnabled) return;

    window.addEventListener('error', (event) => {
      this.trackError({
        category: ErrorCategory.UI,
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        category: ErrorCategory.API,
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack
      });
    });
  }

  /**
   * Setup performance observer for monitoring
   * @private
   */
  setupPerformanceObserver() {
    if (!this.isEnabled || !window.PerformanceObserver) return;

    try {
      // Monitor navigation timing
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.trackPerformance(PerformanceMetric.PAGE_LOAD, {
              loadTime: entry.loadEventEnd - entry.loadEventStart,
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              firstPaint: entry.responseEnd - entry.requestStart
            });
          }
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });

      // Monitor largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.trackPerformance(PerformanceMetric.COMPONENT_RENDER, {
            lcp: entry.startTime,
            element: entry.element?.tagName
          });
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  /**
   * Track application errors
   * @param {Object} errorData - Error information
   * @param {string} errorData.category - Error category
   * @param {string} errorData.message - Error message
   * @param {string} [errorData.stack] - Error stack trace
   * @param {Object} [errorData.context] - Additional context
   */
  trackError(errorData) {
    const error = {
      ...errorData,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errorQueue.push(error);
    this.maintainQueueSize(this.errorQueue);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Tracked Error:', error);
    }

    // Send to monitoring service in production
    if (this.isEnabled) {
      this.sendToMonitoringService('errors', error);
    }
  }

  /**
   * Track performance metrics
   * @param {string} metric - Performance metric type
   * @param {Object} data - Performance data
   */
  trackPerformance(metric, data) {
    const performanceData = {
      metric,
      ...data,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId
    };

    this.performanceQueue.push(performanceData);
    this.maintainQueueSize(this.performanceQueue);

    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Metric:', performanceData);
    }

    if (this.isEnabled) {
      this.sendToMonitoringService('performance', performanceData);
    }
  }

  /**
   * Track user events and analytics
   * @param {string} event - Event name
   * @param {Object} [properties] - Event properties
   */
  trackEvent(event, properties = {}) {
    const eventData = {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        userId: this.userId,
        url: window.location.href
      }
    };

    this.eventQueue.push(eventData);
    this.maintainQueueSize(this.eventQueue);

    if (process.env.NODE_ENV === 'development') {
      console.log('Tracked Event:', eventData);
    }

    if (this.isEnabled) {
      this.sendToMonitoringService('events', eventData);
    }
  }

  /**
   * Track API request performance
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {number} duration - Request duration in ms
   * @param {number} status - HTTP status code
   * @param {boolean} success - Request success status
   */
  trackAPIRequest(endpoint, method, duration, status, success) {
    this.trackPerformance(PerformanceMetric.API_REQUEST, {
      endpoint,
      method,
      duration,
      status,
      success
    });

    if (!success) {
      this.trackError({
        category: ErrorCategory.API,
        message: `API request failed: ${method} ${endpoint}`,
        context: { status, endpoint, method }
      });
    }
  }

  /**
   * Track component render performance
   * @param {string} componentName - Component name
   * @param {number} renderTime - Render time in ms
   */
  trackComponentRender(componentName, renderTime) {
    this.trackPerformance(PerformanceMetric.COMPONENT_RENDER, {
      component: componentName,
      renderTime
    });
  }

  /**
   * Track user interactions
   * @param {string} action - User action
   * @param {string} element - Element interacted with
   * @param {Object} [context] - Additional context
   */
  trackUserInteraction(action, element, context = {}) {
    this.trackPerformance(PerformanceMetric.USER_INTERACTION, {
      action,
      element,
      ...context
    });
  }

  /**
   * Maintain queue size limits
   * @param {Array} queue - Queue to maintain
   * @private
   */
  maintainQueueSize(queue) {
    if (queue.length > this.maxQueueSize) {
      queue.splice(0, queue.length - this.maxQueueSize);
    }
  }

  /**
   * Send data to monitoring service
   * @param {string} type - Data type (errors, performance, events)
   * @param {Object} data - Data to send
   * @private
   */
  async sendToMonitoringService(type, data) {
    if (!this.isEnabled) return;

    try {
      // In a real application, replace with your monitoring service endpoint
      const endpoint = process.env.REACT_APP_MONITORING_ENDPOINT;
      if (!endpoint) return;

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Failed to send monitoring data:', error);
    }
  }

  /**
   * Get current monitoring statistics
   * @returns {Object} Monitoring statistics
   */
  getStats() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      errorCount: this.errorQueue.length,
      performanceCount: this.performanceQueue.length,
      eventCount: this.eventQueue.length,
      isEnabled: this.isEnabled
    };
  }

  /**
   * Export queued data for debugging
   * @returns {Object} All queued monitoring data
   */
  exportData() {
    return {
      errors: [...this.errorQueue],
      performance: [...this.performanceQueue],
      events: [...this.eventQueue],
      stats: this.getStats()
    };
  }

  /**
   * Clear all monitoring data
   */
  clearData() {
    this.errorQueue = [];
    this.performanceQueue = [];
    this.eventQueue = [];
  }
}

// Create singleton instance
const monitoring = new AppMonitoring();

export default monitoring;

/**
 * React hook for component performance monitoring
 * @param {string} componentName - Name of the component
 * @returns {Object} Performance tracking utilities
 */
export const usePerformanceMonitoring = (componentName) => {
  const startTime = React.useRef(null);

  const startRender = React.useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endRender = React.useCallback(() => {
    if (startTime.current) {
      const renderTime = performance.now() - startTime.current;
      monitoring.trackComponentRender(componentName, renderTime);
      startTime.current = null;
    }
  }, [componentName]);

  React.useEffect(() => {
    startRender();
    return endRender;
  });

  return {
    trackInteraction: (action, element, context) => 
      monitoring.trackUserInteraction(action, element, context),
    trackError: (error, context) => 
      monitoring.trackError({
        category: ErrorCategory.UI,
        message: error.message,
        stack: error.stack,
        context: { component: componentName, ...context }
      })
  };
};