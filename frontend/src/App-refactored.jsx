import React, { useMemo } from 'react';
import { Settings, BarChart3 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { DataProvider, useTags } from './context/DataContext';
import { useConfirmation } from './components/ConfirmationModal';
import { useEntriesStore } from './stores/entriesStore';
import { useInvoicesStore } from './stores/invoicesStore';
import { useToast } from './components/Toast/ToastProvider';

// Components
import LoginScreen from './components/Auth/LoginScreen';
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

/**
 * Main App Layout Component
 * Uses context providers for state management and authentication
 */
function AppLayout() {
  const { user, isAdmin, logout } = useAuth();
  const { availableTags } = useTags();
  const { ConfirmationDialog, confirmDelete, confirmAction } = useConfirmation();
  const toast = useToast();

  // UI state
  const [showAdminPanel, setShowAdminPanel] = React.useState(false);
  const [showAnalytics, setShowAnalytics] = React.useState(false);
  const [showBatchEntry, setShowBatchEntry] = React.useState(false);
  const [viewInvoice, setViewInvoice] = React.useState(null);

  // Store data with selective subscriptions
  const entries = useEntriesStore(state => state.entries);
  const entriesLoading = useEntriesStore(state => state.loading);
  const editingEntry = useEntriesStore(state => state.editingEntry);
  
  const invoices = useInvoicesStore(state => state.invoices);
  const invoicesLoading = useInvoicesStore(state => state.loading);

  // Entry management functions
  const handleAddEntry = React.useCallback(async (entryData) => {
    try {
      await useEntriesStore.getState().addEntry(entryData);
      toast.success('Time entry added successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to add entry');
      throw error;
    }
  }, [toast]);

  const handleUpdateEntry = React.useCallback(async (entryData) => {
    try {
      await useEntriesStore.getState().updateEntry(entryData.id, entryData);
      toast.success('Time entry updated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to update entry');
      throw error;
    }
  }, [toast]);

  const handleDeleteEntry = React.useCallback(async (id) => {
    const entry = entries.find(e => e.id === id);
    if (entry?.invoiceId) {
      toast.error('Cannot delete invoiced entry');
      return;
    }
    
    try {
      await confirmDelete(`time entry #${id}`, async () => {
        await useEntriesStore.getState().deleteEntry(id);
        toast.success('Time entry deleted successfully!');
      });
    } catch (error) {
      toast.error(error.message || 'Failed to delete entry');
    }
  }, [entries, toast, confirmDelete]);

  // Invoice management
  const handleSubmitInvoice = React.useCallback(async () => {
    const currentOpenEntries = useEntriesStore.getState().getOpenEntries();
    if (!currentOpenEntries.length) {
      toast.warning('No open entries to submit');
      return;
    }

    try {
      await confirmAction('Submit Invoice', async () => {
        const invoice = await useInvoicesStore.getState().submitInvoice();
        
        // Refresh entries to reflect the invoiced status
        await useEntriesStore.getState().fetchEntries('open');
        
        toast.success(`Invoice submitted successfully! Invoice #${invoice.id} for ${fmt.format(invoice.total)}`);
      });
    } catch (error) {
      toast.error(error.message || 'Failed to submit invoice');
    }
  }, [toast, confirmAction]);

  // Computed values
  const openEntries = useMemo(() => useEntriesStore.getState().getOpenEntries(), [entries]);
  const myInvoices = useMemo(() => useInvoicesStore.getState().getInvoicesByUser(user?.id), [invoices, user?.id]);
  const pendingInvoices = useMemo(() => useInvoicesStore.getState().getPendingInvoices(user?.id), [invoices, user?.id]);
  const approvedInvoices = useMemo(() => useInvoicesStore.getState().getApprovedInvoices(user?.id), [invoices, user?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Welcome back, {user.name}!
              </h1>
              <p className="text-gray-600">
                {isAdmin ? 'Administrator' : 'Team Member'} • Rate: {fmt.format(user.rate)}/hour
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Admin Controls */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => setShowAnalytics(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    aria-label="Open analytics dashboard"
                  >
                    <BarChart3 size={20} />
                    <span>Analytics</span>
                  </button>
                  
                  <button
                    onClick={() => setShowAdminPanel(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    aria-label="Open admin panel"
                  >
                    <Settings size={20} />
                    <span>Admin</span>
                  </button>
                </>
              )}
              
              {/* Batch Entry */}
              <button
                onClick={() => setShowBatchEntry(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Batch Entry
              </button>
              
              {/* Logout */}
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Deadline Warning */}
        <DeadlineWarningBanner />

        {/* Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <DashboardStats 
              openEntries={openEntries}
              pendingInvoices={pendingInvoices}
              approvedInvoices={approvedInvoices}
            />
          </div>
          <div>
            {isAdmin ? (
              <AdminDashboard 
                onViewInvoice={setViewInvoice}
              />
            ) : (
              <UserDashboard 
                openEntries={openEntries}
                myInvoices={myInvoices}
                onSubmitInvoice={handleSubmitInvoice}
              />
            )}
          </div>
        </div>

        {/* Time Entry Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}
          </h2>
          <TimeEntryForm
            onSubmit={editingEntry ? handleUpdateEntry : handleAddEntry}
            availableTags={availableTags}
            editingEntry={editingEntry}
          />
        </div>

        {/* Time Entries List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Open Time Entries</h2>
            <span className="text-sm text-gray-600">
              {openEntries.length} entries
            </span>
          </div>
          
          {entriesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading entries...</p>
            </div>
          ) : (
            <TimeEntryList
              entries={openEntries}
              onEdit={useEntriesStore.getState().setEditingEntry}
              onDelete={handleDeleteEntry}
              availableTags={availableTags}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {viewInvoice && (
        <InvoiceModal 
          invoice={viewInvoice} 
          onClose={() => setViewInvoice(null)} 
        />
      )}
      
      {showBatchEntry && (
        <BatchTimeEntry
          onClose={() => setShowBatchEntry(false)}
          onSuccess={async (result) => {
            await useEntriesStore.getState().fetchEntries('open');
            toast.success(`Successfully imported ${result.created} entries`);
          }}
        />
      )}
      
      {showAdminPanel && (
        <AdminPanel 
          onClose={() => setShowAdminPanel(false)}
        />
      )}
      
      {showAnalytics && (
        <AnalyticsDashboard
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div>
  );
}

/**
 * Main App Component with Provider Wrappers
 */
export default function App() {
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  // Show main app with data provider
  return (
    <DataProvider>
      <AppLayout />
    </DataProvider>
  );
}