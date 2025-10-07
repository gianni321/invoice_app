import { create } from 'zustand';
import { api, getAuthHeaders } from '../config';

/**
 * Entries store for time entry management
 */
export const useEntriesStore = create((set, get) => ({
  // State
  entries: [],
  isLoading: false,
  error: null,
  filters: {
    scope: 'all', // 'all', 'open'
    dateRange: null
  },

  // Actions
  setEntries: (entries) => set({ entries, error: null }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

  fetchEntries: async (options = {}) => {
    set({ isLoading: true, error: null });
    
    try {
      const params = new URLSearchParams();
      const { scope } = get().filters;
      
      if (scope && scope !== 'all') {
        params.set('scope', scope);
      }
      
      // Add any additional options
      Object.entries(options).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.set(key, value);
        }
      });

      const response = await api.get(`/entries?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      
      set({ 
        entries: response.data, 
        isLoading: false, 
        error: null 
      });
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch entries';
      set({ 
        entries: [], 
        isLoading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  createEntry: async (entryData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.post('/entries', entryData, {
        headers: getAuthHeaders()
      });
      
      const newEntry = response.data;
      const currentEntries = get().entries;
      
      set({ 
        entries: [newEntry, ...currentEntries], 
        isLoading: false, 
        error: null 
      });
      
      return newEntry;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create entry';
      set({ 
        isLoading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  updateEntry: async (entryId, updateData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.put(`/entries/${entryId}`, updateData, {
        headers: getAuthHeaders()
      });
      
      const updatedEntry = response.data;
      const currentEntries = get().entries;
      
      set({ 
        entries: currentEntries.map(entry => 
          entry.id === entryId ? updatedEntry : entry
        ), 
        isLoading: false, 
        error: null 
      });
      
      return updatedEntry;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update entry';
      set({ 
        isLoading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  deleteEntry: async (entryId) => {
    set({ isLoading: true, error: null });
    
    try {
      await api.delete(`/entries/${entryId}`, {
        headers: getAuthHeaders()
      });
      
      const currentEntries = get().entries;
      
      set({ 
        entries: currentEntries.filter(entry => entry.id !== entryId), 
        isLoading: false, 
        error: null 
      });
      
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete entry';
      set({ 
        isLoading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Batch operations
  batchImport: async (entries) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.post('/entries/batch', { entries }, {
        headers: getAuthHeaders()
      });
      
      const importedEntries = response.data;
      const currentEntries = get().entries;
      
      set({ 
        entries: [...importedEntries, ...currentEntries], 
        isLoading: false, 
        error: null 
      });
      
      return importedEntries;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to import entries';
      set({ 
        isLoading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Get filtered entries
  getFilteredEntries: () => {
    const { entries, filters } = get();
    
    let filtered = [...entries];
    
    // Apply scope filter
    if (filters.scope === 'open') {
      filtered = filtered.filter(entry => !entry.invoice_id);
    }
    
    // Apply date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
      });
    }
    
    return filtered;
  },

  // Get entry statistics
  getEntryStats: () => {
    const entries = get().getFilteredEntries();
    
    const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
    const totalAmount = entries.reduce((sum, entry) => sum + (entry.hours * entry.rate || 0), 0);
    
    return {
      totalEntries: entries.length,
      totalHours,
      totalAmount,
      openEntries: entries.filter(e => !e.invoice_id).length,
      invoicedEntries: entries.filter(e => e.invoice_id).length
    };
  }
}));