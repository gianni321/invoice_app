import React, { useState, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

/**
 * Reusable confirmation modal component
 * Replaces window.confirm() with a proper React modal
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default', // default, danger, warning, success, info
  confirmButtonClass = '',
  cancelButtonClass = '',
  children,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await onConfirm?.();
      onClose();
    } catch (error) {
      console.error('Confirmation action failed:', error);
      // Don't close modal on error, let user retry
    } finally {
      setIsLoading(false);
    }
  }, [onConfirm, onClose, isLoading]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    } else if (e.key === 'Enter' && !isLoading) {
      handleConfirm();
    }
  }, [onClose, handleConfirm, isLoading]);

  // Variant-specific styles
  const variants = {
    default: {
      icon: Info,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
    danger: {
      icon: XCircle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      confirmButton: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
  };

  const currentVariant = variants[variant] || variants.default;
  const IconComponent = currentVariant.icon;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div 
          className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              {/* Icon */}
              <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${currentVariant.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
                <IconComponent 
                  className={`h-6 w-6 ${currentVariant.iconColor}`} 
                  aria-hidden="true" 
                />
              </div>

              {/* Content */}
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 
                  className="text-base font-semibold leading-6 text-gray-900" 
                  id="modal-title"
                >
                  {title}
                </h3>
                <div className="mt-2">
                  {children ? (
                    children
                  ) : (
                    <p className="text-sm text-gray-500">
                      {message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonClass || currentVariant.confirmButton}`}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                confirmText
              )}
            </button>
            <button
              type="button"
              className={`mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed ${cancelButtonClass}`}
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing confirmation dialogs
 * Provides a clean API for showing confirmation modals
 */
export function useConfirmation() {
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'default',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  });

  const showConfirmation = useCallback(({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    variant = 'default',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
  }) => {
    return new Promise((resolve) => {
      setConfirmationState({
        isOpen: true,
        title,
        message,
        variant,
        confirmText,
        cancelText,
        onConfirm: async () => {
          try {
            await onConfirm?.();
            resolve(true);
          } catch (error) {
            console.error('Confirmation action failed:', error);
            throw error; // Re-throw to prevent modal from closing
          }
        },
      });
    });
  }, []);

  const hideConfirmation = useCallback(() => {
    setConfirmationState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // Shorthand methods for common confirmation types
  const confirmDelete = useCallback((itemName, onConfirm) => {
    return showConfirmation({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm,
    });
  }, [showConfirmation]);

  const confirmAction = useCallback((actionName, onConfirm) => {
    return showConfirmation({
      title: `Confirm ${actionName}`,
      message: `Are you sure you want to ${actionName.toLowerCase()}?`,
      variant: 'default',
      confirmText: actionName,
      onConfirm,
    });
  }, [showConfirmation]);

  const ConfirmationDialog = useCallback(() => (
    <ConfirmationModal
      {...confirmationState}
      onClose={hideConfirmation}
    />
  ), [confirmationState, hideConfirmation]);

  return {
    showConfirmation,
    confirmDelete,
    confirmAction,
    hideConfirmation,
    ConfirmationDialog,
    isOpen: confirmationState.isOpen,
  };
}

export default ConfirmationModal;