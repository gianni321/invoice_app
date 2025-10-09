import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { ERROR_MESSAGES } from '../constants';

/**
 * @typedef {Object} ErrorBoundaryState
 * @property {boolean} hasError - Whether an error has occurred
 * @property {Error|null} error - The error that occurred
 * @property {Object|null} errorInfo - Additional error information
 * @property {string|null} eventId - Unique error event ID
 */

/**
 * @typedef {Object} ErrorBoundaryProps
 * @property {React.ReactNode} children - Child components to render
 * @property {Function} [fallback] - Custom fallback component
 * @property {Function} [onError] - Error callback handler
 * @property {boolean} [showStack] - Whether to show stack trace (dev mode)
 */

/**
 * Error Boundary component to catch and handle React runtime errors
 * Provides comprehensive error handling with logging and user-friendly fallback UI
 * @class ErrorBoundary
 * @extends {React.Component}
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      eventId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error: error,
      errorInfo: errorInfo,
      eventId: this.generateEventId()
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 React Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }

    // In production, you might want to send this to an error reporting service
    this.logErrorToService(error, errorInfo);
  }

  generateEventId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  logErrorToService(error, errorInfo) {
    // In a real application, you would send this to an error monitoring service
    // like Sentry, LogRocket, or Bugsnag
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      eventId: this.state.eventId
    };

    // Example: Send to your logging endpoint
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport)
    // }).catch(() => {
    //   // Silently fail if error reporting fails
    // });

    console.warn('Error report generated:', errorReport);
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      eventId: null 
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Our team has been notified and is working on a fix.
            </p>

            {/* Error ID for support */}
            {this.state.eventId && (
              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <p className="text-xs text-gray-500 mb-1">Error ID (for support):</p>
                <code className="text-xs font-mono text-gray-700 break-all">
                  {this.state.eventId}
                </code>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={16} />
                <span>Try Again</span>
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center space-x-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Home size={16} />
                <span>Go Home</span>
              </button>
            </div>

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Technical Details (Development Only)
                </summary>
                <div className="bg-gray-100 rounded p-3 text-xs">
                  <div className="mb-2">
                    <strong>Error:</strong>
                    <pre className="mt-1 text-red-600">{this.state.error.toString()}</pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version for functional components that need error boundary functionality
 */
export function withErrorBoundary(Component, fallback = null) {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Simple error fallback component for specific sections
 * @param {Object} props
 * @param {Error} props.error - The error that occurred
 * @param {Function} props.resetError - Function to reset the error state
 * @param {string} [props.componentName] - Name of the component that errored
 * @returns {JSX.Element}
 */
export function ErrorFallback({ error, resetError, componentName = 'Component' }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-1">
            {componentName} Error
          </h3>
          <p className="text-sm text-red-700 mb-3">
            {ERROR_MESSAGES.GENERIC_ERROR}
          </p>
          
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-3">
              <summary className="cursor-pointer text-xs font-medium text-red-800">
                Error Details
              </summary>
              <pre className="mt-1 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">
                {error.toString()}
              </pre>
            </details>
          )}
          
          {resetError && (
            <button
              onClick={resetError}
              className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Higher-order component to wrap components with error boundary
 * @param {React.Component} Component - Component to wrap
 * @param {Object} errorBoundaryProps - Props for ErrorBoundary
 * @returns {React.Component} Wrapped component
 */
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = React.forwardRef((props, ref) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} ref={ref} />
    </ErrorBoundary>
  ));
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook to handle errors in functional components
 * @returns {Function} Error handler function
 */
export function useErrorHandler() {
  return React.useCallback((error, errorInfo) => {
    // Log error
    console.error('Component error:', error, errorInfo);
    
    // You could also dispatch to a global error state here
    // or show a toast notification
  }, []);
}

export default ErrorBoundary;