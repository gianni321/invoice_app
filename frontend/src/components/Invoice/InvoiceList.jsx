import React from 'react';
import { FileText, DollarSign, Clock, CheckCircle } from 'lucide-react';

/**
 * @typedef {Object} Invoice
 * @property {number} id - Invoice ID
 * @property {number} total - Total amount
 * @property {string} status - Invoice status
 * @property {string} periodStart - Period start date
 * @property {string} periodEnd - Period end date
 * @property {string} createdAt - Creation date
 */

/**
 * @typedef {Object} InvoiceListProps
 * @property {Invoice[]} invoices - Array of invoices
 * @property {Function} onSelectInvoice - Function called when invoice is selected
 * @property {Function} onApproveInvoice - Function called when invoice is approved
 * @property {Function} onMarkPaid - Function called when invoice is marked as paid
 * @property {boolean} [loading] - Loading state
 * @property {string} [currentUserRole] - Current user role for permission checks
 */

/**
 * List component for displaying invoices with actions
 * @param {InvoiceListProps} props
 * @returns {JSX.Element}
 */
export const InvoiceList = React.memo(function InvoiceList({
  invoices,
  onSelectInvoice,
  onApproveInvoice,
  onMarkPaid,
  loading = false,
  currentUserRole = 'user'
}) {
  // Safe helper functions
  const fmtUSD = (n) =>
    Number.isFinite(n) 
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) 
      : '$0.00';

  const safeDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'approved':
        return <DollarSign size={16} className="text-blue-600" />;
      case 'submitted':
        return <Clock size={16} className="text-yellow-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canApprove = (invoice) => {
    return currentUserRole === 'admin' && invoice.status === 'submitted';
  };

  const canMarkPaid = (invoice) => {
    return currentUserRole === 'admin' && invoice.status === 'approved';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <FileText size={48} className="text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
        <p className="text-gray-600">
          Start by adding some time entries, then submit them for approval.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map(invoice => (
        <div
          key={invoice.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(invoice.status)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Invoice #{invoice.id}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {safeDate(invoice.periodStart)} - {safeDate(invoice.periodEnd)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {fmtUSD(invoice.total)}
                </div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-600">Created:</span>
                <div className="font-medium">{safeDate(invoice.createdAt)}</div>
              </div>
              <div>
                <span className="text-gray-600">Entries:</span>
                <div className="font-medium">{invoice.entries?.length || 0}</div>
              </div>
              <div>
                <span className="text-gray-600">Hours:</span>
                <div className="font-medium">
                  {invoice.entries?.reduce((sum, e) => sum + (e.hours || 0), 0).toFixed(1) || '0.0'}h
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-100">
              <button
                onClick={() => onSelectInvoice(invoice)}
                className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
              >
                View Details
              </button>

              {canApprove(invoice) && (
                <button
                  onClick={() => onApproveInvoice(invoice.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Approve
                </button>
              )}

              {canMarkPaid(invoice) && (
                <button
                  onClick={() => onMarkPaid(invoice.id)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Mark Paid
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

export default InvoiceList;