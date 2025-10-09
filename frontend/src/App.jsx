import React, { useState, useCallback, useEffect } from 'react';
import { Lock, Settings, BarChart3 } from 'lucide-react';
import { api, getAuthHeaders, setAuthToken, clearAuthToken } from './config';
import { useEntriesStore } from './stores/entriesStore';
import { useInvoicesStore } from './stores/invoicesStore';
import { useToast } from './components/Toast/ToastProvider';
import { DeadlineWarningBanner } from './components/DeadlineStatus';
import { BatchTimeEntry } from './components/BatchTimeEntry';
import { AdminPanel } from './components/AdminPanel';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import TimeEntryForm from './components/TimeEntry/TimeEntryForm';
import TimeEntryList from './components/TimeEntry/TimeEntryList';
import DashboardStats from './components/Dashboard/DashboardStats';
import AdminDashboard from './components/Admin/AdminDashboard';
import UserDashboard from './components/User/UserDashboard';
import { InvoiceModal } from './components/InvoiceModal';

// Format currency
const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function AppRefactored() {
  // Auth state
  const [user, setUser] = useState(null);
  const [isAdmin, setAdmin] = useState(false);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  // UI state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showBatchEntry, setShowBatchEntry] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);

  // Stores
  const entriesStore = useEntriesStore();
  const invoicesStore = useInvoicesStore();
  const toast = useToast();

  // Fetch data on user login
  const fetchData = useCallback(async () => {
    try {
      await Promise.all([
        entriesStore.fetchEntries('open'),
        invoicesStore.fetchInvoices()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  }, [entriesStore, invoicesStore, toast]);

  // Login function
  const login = useCallback(async () => {
    try {
      const response = await fetch(`${api.auth.login()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setAuthToken(data.token);
      setUser(data.user);
      setAdmin(data.user.role === 'admin');
      setPin('');
      setErr('');
      
      await fetchData();
      toast.success(`Welcome back, ${data.user.name}!`);
    } catch (error) {
      console.error('Login error:', error);
      setErr('Invalid PIN');
      toast.error('Login failed - please check your PIN');
    }
  }, [pin, fetchData, toast]);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    setAdmin(false);
    setPin('');
    setErr('');
    clearAuthToken();
    entriesStore.entries = [];
    invoicesStore.invoices = [];
    toast.info('Logged out successfully');
  }, [entriesStore, invoicesStore, toast]);

  // Add entry function
  const handleAddEntry = useCallback(async (entryData) => {
    try {
      await entriesStore.addEntry(entryData);
      toast.success('Time entry added successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to add entry');
      throw error;
    }
  }, [entriesStore, toast]);

  // Update entry function
  const handleUpdateEntry = useCallback(async (entryData) => {
    try {
      await entriesStore.updateEntry(entryData.id, entryData);
      toast.success('Time entry updated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to update entry');
      throw error;
    }
  }, [entriesStore, toast]);

  // Delete entry function
  const handleDeleteEntry = useCallback(async (id) => {
    const entry = entriesStore.entries.find(e => e.id === id);
    if (entry?.invoiceId) {
      toast.error('Cannot delete invoiced entry');
      return;
    }
    
    if (!confirm('Delete this entry?')) return;

    try {
      await entriesStore.deleteEntry(id);
      toast.success('Time entry deleted successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to delete entry');
    }
  }, [entriesStore, toast]);

  // Submit invoice function
  const handleSubmitInvoice = useCallback(async () => {
    const openEntries = entriesStore.getOpenEntries();
    if (!openEntries.length) {
      toast.warning('No open entries to submit');
      return;
    }

    try {
      const invoice = await invoicesStore.submitInvoice();
      
      // Remove submitted entries from entries list
      entriesStore.entries = entriesStore.entries.filter(e => !openEntries.find(oe => oe.id === e.id));
      
      toast.success(`Invoice submitted successfully! Invoice #${invoice.id} for ${fmt.format(invoice.total)}`);
    } catch (error) {
      toast.error(error.message || 'Failed to submit invoice');
    }
  }, [entriesStore, invoicesStore, toast]);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch(api.admin.tagsActive(), { headers: getAuthHeaders() });
      if (response.ok) {
        const tagsData = await response.json();
        setAvailableTags(Array.isArray(tagsData) ? tagsData : []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      // Fallback to default tags
      setAvailableTags([
        { name: 'Dev', color: '#10B981' },
        { name: 'Bug', color: '#EF4444' },
        { name: 'Call', color: '#8B5CF6' },
        { name: 'Meeting', color: '#F59E0B' }
      ]);
    }
  }, []);

  // Effects
  useEffect(() => {
    if (user) {
      fetchData();
      fetchTags();
    }
  }, [user, fetchData, fetchTags]);

  // Computed values
  const openEntries = entriesStore.getOpenEntries();
  const myInvoices = invoicesStore.getInvoicesByUser(user?.id);
  const pendingInvoices = invoicesStore.getPendingInvoices(user?.id);
  const approvedInvoices = invoicesStore.getApprovedInvoices(user?.id);

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center mb-6" style={{ minHeight: '200px' }}>
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-indigo-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold mb-2">Time Tracker</h1>
            <p className="text-gray-600">Enter PIN</p>
          </div>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && login()}
            className="w-full px-4 py-3 text-center text-2xl border-2 rounded-lg mb-4"
            placeholder="••••"
            maxLength={4}
          />
          {err && <p className="text-red-600 text-sm mb-4">{err}</p>}
          <button 
            onClick={login} 
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700"
          >
            Login
          </button>
          <p className="text-xs text-gray-500 text-center mt-4">
            Demo: 1234, 5678, 9012 | Admin: 0000
          </p>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
            <p className="text-gray-600">Rate: {fmt.format(user.rate)}/hr</p>
          </div>
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <button 
                onClick={() => setShowAnalytics(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={() => setShowAdminPanel(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}
            <button 
              onClick={logout} 
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Warning banner - only for users */}
        {!isAdmin && <DeadlineWarningBanner userId={user.id} />}
        
        {/* Role-based main content */}
        {isAdmin ? (
          <AdminDashboard
            onShowAnalytics={() => setShowAnalytics(true)}
            onShowAdminPanel={() => setShowAdminPanel(true)}
          />
        ) : (
          <UserDashboard
            user={user}
            openEntries={openEntries}
            pendingInvoices={pendingInvoices}
            approvedInvoices={approvedInvoices}
            availableTags={availableTags}
            onAddEntry={handleAddEntry}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            onSubmitInvoice={handleSubmitInvoice}
            onEditEntry={entriesStore.setEditingEntry}
            editingEntry={entriesStore.editingEntry}
            loading={entriesStore.loading}
          />
        )}

        {/* Invoice history - only for users */}
        {!isAdmin && (
          <div className="bg-white p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Invoice History</h2>
            {myInvoices.length === 0 ? (
              <p className="text-gray-500">No invoices yet</p>
            ) : (
              <div className="space-y-4">
                {myInvoices.map(invoice => (
                  <div key={invoice.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Invoice #{invoice.id}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(invoice.date).toLocaleDateString()} • {fmt.format(invoice.total)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          invoice.status === 'submitted' ? 'bg-yellow-200 text-yellow-800' :
                          invoice.status === 'approved' ? 'bg-green-200 text-green-800' :
                          'bg-purple-200 text-purple-800'
                        }`}>
                          {invoice.status.toUpperCase()}
                        </span>
                        <button 
                          onClick={() => setViewInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {viewInvoice && (
        <InvoiceModal 
          invoice={viewInvoice} 
          entries={entriesStore.entries} 
          onClose={() => setViewInvoice(null)} 
        />
      )}
      
      {showBatchEntry && (
        <BatchTimeEntry
          onClose={() => setShowBatchEntry(false)}
          onSuccess={async (result) => {
            await fetchData();
            toast.success(`Successfully imported ${result.created} entries`);
          }}
        />
      )}
      
      {showAdminPanel && (
        <AdminPanel 
          onClose={() => setShowAdminPanel(false)}
          onTagsUpdated={fetchTags}
        />
      )}
      
      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-7xl mx-4 max-h-[95vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-green-600" size={24} />
                <h2 className="text-xl font-bold">Analytics Dashboard</h2>
              </div>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
              <AnalyticsDashboard />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
