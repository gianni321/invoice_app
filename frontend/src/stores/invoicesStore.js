import { create } from 'zustand';
import { api, getAuthHeaders } from '../config';

/**
 * Invoices store for invoice management
 */
export const useInvoicesStore = create((set, get) => ({
  // State
  invoices: [],
  isLoading: false,
  error: null,
  deadlineStatus: null,

  // Actions
  setInvoices: (invoices) => set({ invoices, error: null }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  setDeadlineStatus: (deadlineStatus) => set({ deadlineStatus }),

  fetchInvoices: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.get('/invoices', {
        headers: getAuthHeaders()
      });
      
      set({ 
        invoices: response.data, 
        isLoading: false, 
        error: null 
      });
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch invoices';
      set({ 
        invoices: [], 
        isLoading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  fetchDeadlineStatus: async () => {
    try {
      const response = await api.get('/invoices/deadline-status', {
        headers: getAuthHeaders()
      });
      
      set({ deadlineStatus: response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch deadline status:', error);
      set({ deadlineStatus: null });
    }
  },

  createInvoice: async (entryIds) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.post('/invoices', { entryIds }, {
        headers: getAuthHeaders()
      });
      
      const newInvoice = response.data;
      const currentInvoices = get().invoices;
      
      set({ 
        invoices: [newInvoice, ...currentInvoices], 
        isLoading: false, 
        error: null 
      });
      
      return newInvoice;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create invoice';
      set({ 
        isLoading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  updateInvoiceStatus: async (invoiceId, status) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.put(`/invoices/${invoiceId}/status`, { status }, {
        headers: getAuthHeaders()
      });
      
      const updatedInvoice = response.data;
      const currentInvoices = get().invoices;
      
      set({ 
        invoices: currentInvoices.map(invoice => 
          invoice.id === invoiceId ? updatedInvoice : invoice
        ), 
        isLoading: false, 
        error: null 
      });
      
      return updatedInvoice;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update invoice status';
      set({ 
        isLoading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  deleteInvoice: async (invoiceId) => {
    set({ isLoading: true, error: null });
    
    try {
      await api.delete(`/invoices/${invoiceId}`, {
        headers: getAuthHeaders()
      });
      
      const currentInvoices = get().invoices;
      
      set({ 
        invoices: currentInvoices.filter(invoice => invoice.id !== invoiceId), 
        isLoading: false, 
        error: null 
      });
      
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete invoice';
      set({ 
        isLoading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  downloadInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/download`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Try to get filename from headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'invoice.pdf';
      
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to download invoice';
      throw new Error(errorMessage);
    }
  },

  // Get invoice by ID
  getInvoiceById: (invoiceId) => {
    const { invoices } = get();
    return invoices.find(invoice => invoice.id === invoiceId);
  },

  // Get invoice statistics
  getInvoiceStats: () => {
    const { invoices } = get();
    
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const submittedInvoices = invoices.filter(inv => inv.status === 'submitted').length;
    const rejectedInvoices = invoices.filter(inv => inv.status === 'rejected').length;
    
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    
    return {
      totalInvoices,
      paidInvoices,
      submittedInvoices,
      rejectedInvoices,
      totalAmount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount
    };
  },

  // Get recent invoices
  getRecentInvoices: (limit = 5) => {
    const { invoices } = get();
    return invoices
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
      .slice(0, limit);
  }
}));