import { create } from 'zustand';
import { api, getAuthHeaders } from '../config';

/**
 * Authentication store for user state management
 */
export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user, error: null }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  login: async (name, pin) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.post('/auth/login', { name, pin });
      const { user, token } = response.data;
      
      // Store token
      localStorage.setItem('authToken', token);
      
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false, 
        error: null 
      });
      
      return { success: true, user };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false, 
        error: errorMessage 
      });
      
      return { success: false, error: errorMessage };
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    set({ 
      user: null, 
      isAuthenticated: false, 
      isLoading: false, 
      error: null 
    });
  },

  // Check if user is still authenticated (e.g., on app load)
  checkAuth: async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    set({ isLoading: true });
    
    try {
      const response = await api.get('/auth/me', {
        headers: getAuthHeaders()
      });
      
      const user = response.data;
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false, 
        error: null 
      });
      
      return true;
    } catch (error) {
      localStorage.removeItem('authToken');
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false, 
        error: null 
      });
      
      return false;
    }
  }
}));