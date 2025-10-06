const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api.com' 
  : 'http://localhost:5000';

export const API_ENDPOINTS = {
  login: `${API_URL}/api/auth/login`,
  entries: `${API_URL}/api/entries`,
  invoices: `${API_URL}/api/invoices`
};