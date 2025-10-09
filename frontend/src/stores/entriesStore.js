import { create } from 'zustand';
import { api, getAuthHeaders } from '../config';

/**
 * Enhanced entries store with proper state management
 */
export const useEntriesStore = create((set, get) => ({
  // State
  entries: [],
  loading: false,
  error: null,
  editingEntry: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  setEditingEntry: (entry) => set({ editingEntry: entry }),

  // Fetch entries
  fetchEntries: async (scope = 'open') => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(api.entries.list(scope), { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch entries');
      }
      
      const data = await response.json();
      set({ 
        entries: Array.isArray(data) ? data : [], 
        loading: false 
      });
    } catch (error) {
      console.error('Error fetching entries:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
    }
  },

  // Add entry
  addEntry: async (entryData) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(api.entries.create(), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(entryData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create entry');
      }

      const newEntry = await response.json();
      
      set(state => ({ 
        entries: [newEntry, ...state.entries],
        loading: false 
      }));
      
      return newEntry;
    } catch (error) {
      console.error('Error adding entry:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  // Update entry
  updateEntry: async (id, entryData) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(api.entries.update(id), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(entryData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update entry');
      }

      const updatedEntry = await response.json();
      
      set(state => ({
        entries: state.entries.map(e => e.id === id ? updatedEntry : e),
        editingEntry: null,
        loading: false
      }));
      
      return updatedEntry;
    } catch (error) {
      console.error('Error updating entry:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  // Delete entry
  deleteEntry: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(api.entries.delete(id), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete entry');
      }

      set(state => ({
        entries: state.entries.filter(e => e.id !== id),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting entry:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  // Selectors
  getOpenEntries: () => {
    const { entries } = get();
    return entries.filter(e => !e.invoiceId);
  },

  getEntriesByDate: (date) => {
    const { entries } = get();
    return entries.filter(e => e.date === date);
  },

  getTotalHours: () => {
    const { entries } = get();
    return entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
  },

  getTotalAmount: () => {
    const { entries } = get();
    return entries.reduce((sum, e) => sum + ((Number(e.hours) || 0) * (Number(e.rate) || 0)), 0);
  }
}));