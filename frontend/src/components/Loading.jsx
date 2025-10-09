import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * @typedef {Object} LoadingProps
 * @property {string} [size] - Size of the loading indicator ('sm', 'md', 'lg', 'xl')
 * @property {string} [text] - Loading text to display
 * @property {boolean} [fullscreen] - Whether to show fullscreen loading
 * @property {string} [className] - Additional CSS classes
 * @property {boolean} [overlay] - Whether to show overlay background
 * @property {string} [variant] - Loading variant ('spinner', 'dots', 'pulse')
 */

/**
 * Versatile loading component with multiple variants and sizes
 * @param {LoadingProps} props
 * @returns {JSX.Element}
 */
export function Loading({
  size = 'md',
  text = 'Loading...',
  fullscreen = false,
  className = '',
  overlay = false,
  variant = 'spinner',
  ...props
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const baseClasses = fullscreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center'
    : 'flex flex-col items-center justify-center p-4';

  const backgroundClasses = overlay || fullscreen
    ? 'bg-white bg-opacity-90 backdrop-blur-sm'
    : '';

  const renderSpinner = () => (
    <Loader2 
      className={`animate-spin text-blue-600 ${sizeClasses[size]}`}
      {...props}
    />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`bg-blue-600 rounded-full animate-pulse ${
            size === 'sm' ? 'h-2 w-2' :
            size === 'md' ? 'h-3 w-3' :
            size === 'lg' ? 'h-4 w-4' : 'h-5 w-5'
          }`}
          style={{
            animationDelay: `${index * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div 
      className={`bg-blue-600 rounded-full animate-pulse ${sizeClasses[size]}`}
      style={{ animationDuration: '1.5s' }}
    />
  );

  const renderLoadingIndicator = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'spinner':
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={`${baseClasses} ${backgroundClasses} ${className}`}>
      {renderLoadingIndicator()}
      {text && (
        <p className={`mt-3 text-gray-600 font-medium ${textSizeClasses[size]}`}>
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * Inline loading spinner for buttons and small components
 * @param {Object} props
 * @param {string} [props.size] - Size of the spinner
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element}
 */
export function LoadingSpinner({ size = 'sm', className = '', ...props }) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <Loader2 
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}

/**
 * Loading skeleton component for content placeholders
 * @param {Object} props
 * @param {number} [props.lines] - Number of skeleton lines
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.avatar] - Whether to show avatar skeleton
 * @returns {JSX.Element}
 */
export function LoadingSkeleton({ lines = 3, className = '', avatar = false }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {avatar && (
        <div className="flex space-x-4 mb-4">
          <div className="rounded-full bg-gray-300 h-12 w-12"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-4 bg-gray-300 rounded"></div>
            {index < lines - 1 && (
              <div className="h-4 bg-gray-300 rounded w-5/6"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Loading button component that shows spinner when loading
 * @param {Object} props
 * @param {boolean} props.loading - Whether the button is in loading state
 * @param {React.ReactNode} props.children - Button content
 * @param {boolean} [props.disabled] - Whether the button is disabled
 * @param {string} [props.loadingText] - Text to show when loading
 * @returns {JSX.Element}
 */
export function LoadingButton({ 
  loading, 
  children, 
  disabled, 
  loadingText,
  className = '',
  ...props 
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center ${className}`}
      {...props}
    >
      {loading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

/**
 * HOC to add loading state to any component
 * @param {React.Component} Component - Component to wrap
 * @param {Object} loadingProps - Props for Loading component
 * @returns {React.Component} Wrapped component
 */
export function withLoading(Component, loadingProps = {}) {
  return function LoadingWrapper({ isLoading, ...props }) {
    if (isLoading) {
      return <Loading {...loadingProps} />;
    }
    return <Component {...props} />;
  };
}

/**
 * Hook for managing loading states
 * @param {boolean} [initialState] - Initial loading state
 * @returns {Object} Loading state and controls
 */
export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const toggleLoading = React.useCallback(() => {
    setIsLoading(prev => !prev);
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    setIsLoading
  };
}

export default Loading;