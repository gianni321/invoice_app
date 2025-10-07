/**
 * Accessibility utility functions and hooks
 */

import { useEffect, useRef } from 'react';

/**
 * Hook to manage focus for modals and overlays
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Function to call when Escape is pressed
 */
export function useFocusTrap(isOpen, onClose) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store the previously focused element
    previousFocusRef.current = document.activeElement;

    // Focus the container or first focusable element
    const container = containerRef.current;
    if (container) {
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        container.focus();
      }
    }

    // Handle Escape key
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    // Handle Tab key for focus trapping
    const handleTab = (event) => {
      if (event.key !== 'Tab' || !container) return;

      const focusableElements = getFocusableElements(container);
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);

      // Restore focus to previously focused element
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return containerRef;
}

/**
 * Get all focusable elements within a container
 * @param {HTMLElement} container 
 * @returns {HTMLElement[]}
 */
function getFocusableElements(container) {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors));
}

/**
 * Hook to announce messages to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function useScreenReaderAnnouncement() {
  const announce = (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return announce;
}

/**
 * Hook to manage loading announcements
 * @param {boolean} isLoading 
 * @param {string} loadingMessage 
 * @param {string} completeMessage 
 */
export function useLoadingAnnouncement(isLoading, loadingMessage = 'Loading...', completeMessage = 'Loading complete') {
  const announce = useScreenReaderAnnouncement();

  useEffect(() => {
    if (isLoading) {
      announce(loadingMessage, 'polite');
    } else {
      announce(completeMessage, 'polite');
    }
  }, [isLoading, loadingMessage, completeMessage, announce]);
}

/**
 * Component for screen reader only content
 */
export function ScreenReaderOnly({ children, as: Component = 'span', ...props }) {
  return (
    <Component 
      className="sr-only" 
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Component for live region announcements
 */
export function LiveRegion({ children, priority = 'polite', atomic = true }) {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
}

/**
 * Enhanced button component with accessibility features
 */
export function AccessibleButton({ 
  children, 
  icon, 
  iconPosition = 'left',
  loading = false,
  loadingText = 'Loading...',
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props 
}) {
  const isIconOnly = !children && icon;
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-label={isIconOnly ? ariaLabel : undefined}
      aria-describedby={loading ? `${props.id}-loading` : ariaDescribedBy}
    >
      {loading && (
        <ScreenReaderOnly id={`${props.id}-loading`}>
          {loadingText}
        </ScreenReaderOnly>
      )}
      
      {icon && iconPosition === 'left' && (
        <span aria-hidden="true" className="icon-left">
          {icon}
        </span>
      )}
      
      {children && (
        <span>{loading ? loadingText : children}</span>
      )}
      
      {icon && iconPosition === 'right' && (
        <span aria-hidden="true" className="icon-right">
          {icon}
        </span>
      )}
    </button>
  );
}

/**
 * Enhanced input component with accessibility features
 */
export function AccessibleInput({
  label,
  error,
  hint,
  required = false,
  id,
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-field">
      <label htmlFor={inputId} className="form-label">
        {label}
        {required && <span aria-label="required"> *</span>}
      </label>
      
      {hint && (
        <div id={hintId} className="form-hint">
          {hint}
        </div>
      )}
      
      <input
        {...props}
        id={inputId}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={`form-input ${error ? 'form-input-error' : ''} ${props.className || ''}`}
      />
      
      {error && (
        <div id={errorId} className="form-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Skip link component for keyboard navigation
 */
export function SkipLink({ href = '#main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={href}
      className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
    >
      {children}
    </a>
  );
}

/**
 * Utility to generate unique IDs for form elements
 */
export function useUniqueId(prefix = 'id') {
  const id = useRef(`${prefix}-${Math.random().toString(36).substr(2, 9)}`);
  return id.current;
}

/**
 * Hook to detect if user prefers reduced motion
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Utility to validate color contrast ratio
 * @param {string} foreground - Foreground color (hex)
 * @param {string} background - Background color (hex)
 * @returns {number} Contrast ratio
 */
export function getContrastRatio(foreground, background) {
  const getLuminance = (color) => {
    const rgb = parseInt(color.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const sRGB = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);

  return (brightest + 0.05) / (darkest + 0.05);
}