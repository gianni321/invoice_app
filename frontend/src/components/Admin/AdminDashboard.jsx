import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  FileText, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  Settings
} from 'lucide-react';
import { useInvoicesStore } from '../../stores/invoicesStore';
import { useToast } from '../Toast/ToastProvider';

const AdminDashboard = ({ onShowAnalytics, onShowAdminPanel }) => {
  const invoicesStore = useInvoicesStore();
  const toast = useToast();
  const [stats, setStats] = useState({
    totalInvoices: 0,
    pendingInvoices: 0,
    approvedInvoices: 0,
    paidInvoices: 0,
    totalRevenue: 0,
    activeUsers: 0
  });

  // Fetch admin data
  const fetchAdminData = useCallback(async () => {
    try {
      await invoicesStore.fetchInvoices();
      
      // Calculate stats from invoices
      const invoices = invoicesStore.invoices;
      const totalInvoices = invoices.length;
      const pendingInvoices = invoices.filter(i => i.status === 'submitted').length;
      const approvedInvoices = invoices.filter(i => i.status === 'approved').length;
      const paidInvoices = invoices.filter(i => i.status === 'paid').length;
      const totalRevenue = invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.total, 0);
      
      // Get unique users
      const activeUsers = new Set(invoices.map(i => i.userId)).size;

      setStats({
        totalInvoices,
        pendingInvoices,
        approvedInvoices,
        paidInvoices,
        totalRevenue,
        activeUsers
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    }
  }, [invoicesStore, toast]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  };

  const handleApproveInvoice = async (invoiceId) => {
    try {
      await invoicesStore.approveInvoice(invoiceId);
      toast.success('Invoice approved successfully!');
      await fetchAdminData(); // Refresh data
    } catch (error) {
      toast.error(error.message || 'Failed to approve invoice');
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      await invoicesStore.markInvoicePaid(invoiceId);
      toast.success('Invoice marked as paid!');
      await fetchAdminData(); // Refresh data
    } catch (error) {
      toast.error(error.message || 'Failed to mark invoice as paid');
    }
  };

  const pendingInvoices = invoicesStore.invoices.filter(i => i.status === 'submitted');
  const approvedInvoices = invoicesStore.invoices.filter(i => i.status === 'approved');

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-purple-100 mt-2">Manage invoices, users, and system settings</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onShowAnalytics}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <BarChart3 size={20} />
              <span>Analytics</span>
            </button>
            <button
              onClick={onShowAdminPanel}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingInvoices}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approvedInvoices}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Pending Invoices */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Pending Invoices ({pendingInvoices.length})</h2>
          <p className="text-gray-600">Invoices waiting for approval</p>
        </div>
        <div className="p-6">
          {pendingInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No pending invoices</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingInvoices.map(invoice => (
                <div key={invoice.id} className="border rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Invoice #{invoice.id}</p>
                      <p className="text-sm text-gray-600">
                        {invoice.userName} • {new Date(invoice.date).toLocaleDateString()}
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(invoice.total)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproveInvoice(invoice.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => window.open(`/invoices/${invoice.id}`, '_blank')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approved Invoices */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Approved Invoices ({approvedInvoices.length})</h2>
          <p className="text-gray-600">Invoices ready for payment</p>
        </div>
        <div className="p-6">
          {approvedInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No approved invoices</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedInvoices.map(invoice => (
                <div key={invoice.id} className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Invoice #{invoice.id}</p>
                      <p className="text-sm text-gray-600">
                        {invoice.userName} • {new Date(invoice.date).toLocaleDateString()}
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(invoice.total)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleMarkPaid(invoice.id)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={() => window.open(`/invoices/${invoice.id}`, '_blank')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
