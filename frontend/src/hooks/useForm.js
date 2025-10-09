import { useState, useCallback, useEffect } from 'react';

/**
 * @typedef {Object} UseFormReturn
 * @property {Object} formData - Current form data
 * @property {Function} updateField - Update a single field
 * @property {Function} updateForm - Update entire form
 * @property {Function} resetForm - Reset form to initial state
 * @property {Function} handleInputChange - Handle input change events
 */

/**
 * Custom hook for form state management with performance optimizations
 * @param {Object} initialData - Initial form data
 * @returns {UseFormReturn}
 */
export function useForm(initialData = {}) {
  const [formData, setFormData] = useState(initialData);

  /**
   * Update a single field in the form
   * @param {string} field - Field name
   * @param {any} value - Field value
   */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  /**
   * Update multiple fields or entire form
   * @param {Object} data - Data to update
   */
  const updateForm = useCallback((data) => {
    setFormData(prev => ({
      ...prev,
      ...data
    }));
  }, []);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData(initialData);
  }, [initialData]);

  /**
   * Handle standard input change events
   * @param {Event} event - Input change event
   */
  const handleInputChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    updateField(name, fieldValue);
  }, [updateField]);

  return {
    formData,
    updateField,
    updateForm,
    resetForm,
    handleInputChange
  };
}

/**
 * Custom hook for async operations with loading states
 * @param {Function} asyncFunction - Async function to execute
 * @returns {Object} Async state and execute function
 */
export function useAsync(asyncFunction) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset
  };
}

/**
 * Custom hook for debounced values
 * @param {any} value - Value to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {any} Debounced value
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for local storage with React state
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial value
 * @returns {Array} [value, setValue]
 */
export function useLocalStorage(key, initialValue) {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

export default useForm;