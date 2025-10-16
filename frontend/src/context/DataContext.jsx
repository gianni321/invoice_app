import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useEntriesStore } from '../stores/entriesStore';
import { useInvoicesStore } from '../stores/invoicesStore';
import { api, getAuthHeaders } from '../config';

/**
 * Data Context Provider
 * Manages data fetching and synchronization for authenticated users
 */
const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { isLoggedIn, user } = useAuth();
  
  // Zustand store methods (get fresh references)
  const fetchEntries = useEntriesStore(state => state.fetchEntries);
  const fetchInvoices = useInvoicesStore(state => state.fetchInvoices);

  // Load initial data when user logs in
  useEffect(() => {
    if (isLoggedIn && user) {
      const loadInitialData = async () => {
        try {
          await Promise.all([
            fetchEntries('open'),
            fetchInvoices()
          ]);
        } catch (error) {
          console.error('Error loading initial data:', error);
        }
      };

      loadInitialData();
    }
  }, [isLoggedIn, user, fetchEntries, fetchInvoices]);

  // Provide data refresh methods
  const refreshAllData = async () => {
    if (!isLoggedIn) return;
    
    try {
      await Promise.all([
        fetchEntries('open'),
        fetchInvoices()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  };

  const refreshEntries = async (scope = 'open') => {
    if (!isLoggedIn) return;
    
    try {
      await fetchEntries(scope);
    } catch (error) {
      console.error('Error refreshing entries:', error);
      throw error;
    }
  };

  const refreshInvoices = async () => {
    if (!isLoggedIn) return;
    
    try {
      await fetchInvoices();
    } catch (error) {
      console.error('Error refreshing invoices:', error);
      throw error;
    }
  };

  const value = {
    refreshAllData,
    refreshEntries,
    refreshInvoices,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

/**
 * Hook for managing available tags
 * Separate from main data providers to avoid coupling
 */
export function useTags() {
  const [availableTags, setAvailableTags] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const defaultTags = [
    { name: 'Dev', color: '#10B981' },
    { name: 'Bug', color: '#EF4444' },
    { name: 'Call', color: '#8B5CF6' },
    { name: 'Meeting', color: '#F59E0B' }
  ];

  const fetchTags = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(api.admin.tagsActive(), { 
        headers: getAuthHeaders() 
      });
      
      if (response.ok) {
        const tagsData = await response.json();
        setAvailableTags(Array.isArray(tagsData) ? tagsData : defaultTags);
      } else {
        throw new Error('Failed to fetch tags');
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      setError(error.message);
      // Fallback to default tags
      setAvailableTags(defaultTags);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load tags on mount
  React.useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    availableTags,
    isLoading,
    error,
    refreshTags: fetchTags,
  };
}

export default DataContext;