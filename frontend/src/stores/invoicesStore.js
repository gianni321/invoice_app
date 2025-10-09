import { create } from 'zustand';
import { api, getAuthHeaders } from '../config';

/**
 * Enhanced invoices store with proper state management
 */
export const useInvoicesStore = create((set, get) => ({
  // State
  invoices: [],
  loading: false,
  error: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  // Fetch invoices
  fetchInvoices: async () => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(api.invoices.list(), { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const data = await response.json();
      set({ 
        invoices: Array.isArray(data) ? data : [], 
        loading: false 
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
    }
  },

  // Submit invoice
  submitInvoice: async () => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(api.invoices.submit(), {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit invoice');
      }

      const newInvoice = await response.json();
      
      set(state => ({ 
        invoices: [newInvoice, ...state.invoices],
        loading: false 
      }));
      
      return newInvoice;
    } catch (error) {
      console.error('Error submitting invoice:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  // Approve invoice
  approveInvoice: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(api.invoices.approve(id), {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve invoice');
      }

      const updatedInvoice = await response.json();
      
      set(state => ({
        invoices: state.invoices.map(i => i.id === id ? updatedInvoice : i),
        loading: false
      }));
      
      return updatedInvoice;
    } catch (error) {
      console.error('Error approving invoice:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  // Mark invoice as paid
  markInvoicePaid: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(api.invoices.markPaid(id), {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark invoice as paid');
      }

      const updatedInvoice = await response.json();
      
      set(state => ({
        invoices: state.invoices.map(i => i.id === id ? updatedInvoice : i),
        loading: false
      }));
      
      return updatedInvoice;
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  // Withdraw invoice
  withdrawInvoice: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(api.invoices.withdraw(id), {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to withdraw invoice');
      }

      const result = await response.json();
      
      // Refresh invoices after withdrawal
      await get().fetchInvoices();
      
      return result;
    } catch (error) {
      console.error('Error withdrawing invoice:', error);
      set({ 
        error: error.message, 
        loading: false 
      });
      throw error;
    }
  },

  // Export invoice PDF
  exportInvoicePdf: async (id) => {
    try {
      const response = await fetch(api.invoices.exportPdf(id), {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw error;
    }
  },

  // Export invoice CSV
  exportInvoiceCsv: async (id) => {
    try {
      const response = await fetch(api.invoices.exportCsv(id), {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  },

  // Selectors
  getInvoicesByUser: (userId) => {
    const { invoices } = get();
    return invoices.filter(i => i.userId === userId);
  },

  getPendingInvoices: (userId) => {
    const { invoices } = get();
    return invoices.filter(i => i.userId === userId && i.status === 'submitted');
  },

  getApprovedInvoices: (userId) => {
    const { invoices } = get();
    return invoices.filter(i => i.userId === userId && (i.status === 'approved' || i.status === 'paid'));
  },

  getPaidInvoices: (userId) => {
    const { invoices } = get();
    return invoices.filter(i => i.userId === userId && i.status === 'paid');
  }
}));