import { create } from 'zustand';
import { api, getAuthHeaders } from '../config';

/**
 * Enhanced entries store with decoupled selectors and better error handling
 */

// Define data models to decouple from SQL schema
const EntryModel = {
  fromAPI: (apiData) => ({
    id: apiData.id,
    date: apiData.date,
    hours: Number(apiData.hours) || 0,
    task: apiData.task || '',
    notes: apiData.notes || '',
    tag: apiData.tag || '',
    rate: Number(apiData.rate) || 0,
    invoiceId: apiData.invoice_id || apiData.invoiceId, // Handle both formats
    userId: apiData.user_id || apiData.userId,
    createdAt: apiData.created_at || apiData.createdAt,
    updatedAt: apiData.updated_at || apiData.updatedAt,
  }),
  
  toAPI: (entryData) => ({
    date: entryData.date,
    hours: entryData.hours,
    task: entryData.task,
    notes: entryData.notes,
    tag: entryData.tag,
    rate: entryData.rate,
  }),
};

// Status constants
const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

export const useEntriesStore = create((set, get) => ({
  // State
  entries: [],
  status: STATUS.IDLE,
  error: null,
  editingEntry: null,
  lastFetch: null,
  
  // Request state for individual operations
  operations: {
    create: STATUS.IDLE,
    update: STATUS.IDLE,
    delete: STATUS.IDLE,
  },

  // Actions
  setStatus: (status) => set({ status }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  setEditingEntry: (entry) => set({ editingEntry: entry }),

  setOperationStatus: (operation, status) => 
    set(state => ({
      operations: { ...state.operations, [operation]: status }
    })),

  // Enhanced fetch entries with caching
  fetchEntries: async (scope = 'open', force = false) => {
    const { lastFetch, entries } = get();
    
    // Simple caching - avoid refetch if recent (unless forced)
    if (!force && lastFetch && Date.now() - lastFetch < 30000 && entries.length > 0) {
      return entries;
    }

    set({ status: STATUS.LOADING, error: null });
    
    try {
      const response = await fetch(api.entries.list(scope), { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch entries (${response.status})`);
      }
      
      const data = await response.json();
      const normalizedEntries = Array.isArray(data) 
        ? data.map(EntryModel.fromAPI)
        : [];
      
      set({ 
        entries: normalizedEntries, 
        status: STATUS.SUCCESS,
        lastFetch: Date.now(),
      });
      
      return normalizedEntries;
    } catch (error) {
      console.error('Error fetching entries:', error);
      set({ 
        error: error.message, 
        status: STATUS.ERROR,
      });
      throw error;
    }
  },

  // Add entry with optimistic updates
  addEntry: async (entryData) => {
    const tempId = Date.now(); // Temporary ID for optimistic update
    const optimisticEntry = {
      ...EntryModel.fromAPI(entryData),
      id: tempId,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    set(state => ({ 
      entries: [optimisticEntry, ...state.entries],
      operations: { ...state.operations, create: STATUS.LOADING }
    }));
    
    try {
      const response = await fetch(api.entries.create(), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(EntryModel.toAPI(entryData))
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create entry (${response.status})`);
      }

      const newEntry = await response.json();
      const normalizedEntry = EntryModel.fromAPI(newEntry);
      
      // Replace optimistic entry with real entry
      set(state => ({ 
        entries: state.entries.map(e => e.id === tempId ? normalizedEntry : e),
        operations: { ...state.operations, create: STATUS.SUCCESS }
      }));
      
      return normalizedEntry;
    } catch (error) {
      console.error('Error adding entry:', error);
      
      // Revert optimistic update
      set(state => ({
        entries: state.entries.filter(e => e.id !== tempId),
        error: error.message,
        operations: { ...state.operations, create: STATUS.ERROR }
      }));
      
      throw error;
    }
  },

  // Update entry with optimistic updates
  updateEntry: async (id, entryData) => {
    const { entries } = get();
    const originalEntry = entries.find(e => e.id === id);
    
    if (!originalEntry) {
      throw new Error('Entry not found');
    }

    const optimisticEntry = { ...originalEntry, ...entryData };

    // Optimistic update
    set(state => ({
      entries: state.entries.map(e => e.id === id ? optimisticEntry : e),
      operations: { ...state.operations, update: STATUS.LOADING }
    }));
    
    try {
      const response = await fetch(api.entries.update(id), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(EntryModel.toAPI(entryData))
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update entry (${response.status})`);
      }

      const updatedEntry = await response.json();
      const normalizedEntry = EntryModel.fromAPI(updatedEntry);
      
      set(state => ({
        entries: state.entries.map(e => e.id === id ? normalizedEntry : e),
        editingEntry: null,
        operations: { ...state.operations, update: STATUS.SUCCESS }
      }));
      
      return normalizedEntry;
    } catch (error) {
      console.error('Error updating entry:', error);
      
      // Revert optimistic update
      set(state => ({
        entries: state.entries.map(e => e.id === id ? originalEntry : e),
        error: error.message,
        operations: { ...state.operations, update: STATUS.ERROR }
      }));
      
      throw error;
    }
  },

  // Delete entry with optimistic updates
  deleteEntry: async (id) => {
    const { entries } = get();
    const entryToDelete = entries.find(e => e.id === id);
    
    if (!entryToDelete) {
      throw new Error('Entry not found');
    }

    // Optimistic update
    set(state => ({
      entries: state.entries.filter(e => e.id !== id),
      operations: { ...state.operations, delete: STATUS.LOADING }
    }));
    
    try {
      const response = await fetch(api.entries.delete(id), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete entry (${response.status})`);
      }

      set(state => ({
        operations: { ...state.operations, delete: STATUS.SUCCESS }
      }));
    } catch (error) {
      console.error('Error deleting entry:', error);
      
      // Revert optimistic update
      set(state => ({
        entries: [...state.entries, entryToDelete].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        error: error.message,
        operations: { ...state.operations, delete: STATUS.ERROR }
      }));
      
      throw error;
    }
  },

  // Robust selectors decoupled from SQL schema
  getOpenEntries: () => {
    const { entries } = get();
    return entries.filter(entry => !entry.invoiceId);
  },

  getInvoicedEntries: () => {
    const { entries } = get();
    return entries.filter(entry => !!entry.invoiceId);
  },

  getEntriesByDateRange: (startDate, endDate) => {
    const { entries } = get();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= start && entryDate <= end;
    });
  },

  getEntriesByTag: (tag) => {
    const { entries } = get();
    return entries.filter(entry => entry.tag === tag);
  },

  getEntriesByUser: (userId) => {
    const { entries } = get();
    return entries.filter(entry => entry.userId === userId);
  },

  // Computed values
  getTotalHours: (filterFn = () => true) => {
    const { entries } = get();
    return entries
      .filter(filterFn)
      .reduce((sum, entry) => sum + (entry.hours || 0), 0);
  },

  getTotalAmount: (filterFn = () => true) => {
    const { entries } = get();
    return entries
      .filter(filterFn)
      .reduce((sum, entry) => sum + ((entry.hours || 0) * (entry.rate || 0)), 0);
  },

  getHoursByDate: () => {
    const { entries } = get();
    return entries.reduce((acc, entry) => {
      const date = entry.date;
      acc[date] = (acc[date] || 0) + (entry.hours || 0);
      return acc;
    }, {});
  },

  getHoursByTag: () => {
    const { entries } = get();
    return entries.reduce((acc, entry) => {
      const tag = entry.tag || 'Untagged';
      acc[tag] = (acc[tag] || 0) + (entry.hours || 0);
      return acc;
    }, {});
  },

  // Utility methods
  isLoading: () => {
    const { status, operations } = get();
    return status === STATUS.LOADING || 
           Object.values(operations).some(op => op === STATUS.LOADING);
  },

  hasError: () => {
    const { error } = get();
    return !!error;
  },

  // Refresh data
  refresh: () => {
    return get().fetchEntries('open', true);
  },

  // Reset store
  reset: () => {
    set({
      entries: [],
      status: STATUS.IDLE,
      error: null,
      editingEntry: null,
      lastFetch: null,
      operations: {
        create: STATUS.IDLE,
        update: STATUS.IDLE,
        delete: STATUS.IDLE,
      },
    });
  },
}));

// Export constants for use in components
export { STATUS };