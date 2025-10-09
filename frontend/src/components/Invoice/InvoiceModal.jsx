import React from 'react';
import { Download, X } from 'lucide-react';

/**
 * @typedef {Object} Invoice
 * @property {number} id - Invoice ID
 * @property {number} total - Total amount
 * @property {string} status - Invoice status
 * @property {string} periodStart - Period start date
 * @property {string} periodEnd - Period end date
 * @property {Object[]} entries - Invoice entries
 */

/**
 * @typedef {Object} InvoiceModalProps
 * @property {Invoice} invoice - Invoice data to display
 * @property {Object[]} entries - All entries data
 * @property {Function} onClose - Function to close modal
 * @property {Function} onDownload - Function to download invoice
 */

/**
 * Modal component for displaying invoice details
 * @param {InvoiceModalProps} props
 * @returns {JSX.Element}
 */
export const InvoiceModal = React.memo(function InvoiceModal({ 
  invoice, 
  entries, 
  onClose, 
  onDownload 
}) {
  const invEntries = invoice.entries || [];
  
  // Safe helper functions
  const fmtUSD = (n) =>
    Number.isFinite(n) 
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) 
      : '$0.00';
  
  const safeText = (s) => (s ?? '').toString();
  
  const safeDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      // Add T12:00:00 to avoid UTC offset issues with YYYY-MM-DD
      return new Date(dateStr + 'T12:00:00').toLocaleDateString();
    } catch {
      return '—';
    }
  };
  
  // Group entries by date
  const groupedByDate = React.useMemo(() => {
    const grouped = {};
    invEntries.forEach(e => {
      const dateKey = safeDate(e.date);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(e);
    });
    return grouped;
  }, [invEntries]);

  const sortedDates = React.useMemo(() => {
    return Object.keys(groupedByDate).sort((a, b) => {
      // Sort by actual date, with safe fallback
      const dateA = groupedByDate[a][0]?.date 
        ? new Date(groupedByDate[a][0].date + 'T12:00:00') 
        : new Date(0);
      const dateB = groupedByDate[b][0]?.date 
        ? new Date(groupedByDate[b][0].date + 'T12:00:00') 
        : new Date(0);
      return dateB - dateA;
    });
  }, [groupedByDate]);

  const handleBackdropClick = React.useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleDownload = React.useCallback(() => {
    onDownload(invoice.id);
  }, [onDownload, invoice.id]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Invoice Details</h2>
          <div className="flex gap-3">
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={16} />
              Download
            </button>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 p-2"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice ID:</span>
                <span className="font-medium">#{invoice.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  invoice.status === 'paid' 
                    ? 'bg-green-100 text-green-800'
                    : invoice.status === 'approved' 
                    ? 'bg-blue-100 text-blue-800'
                    : invoice.status === 'submitted' 
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {invoice.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Period:</span>
                <span className="font-medium">
                  {safeDate(invoice.periodStart)} - {safeDate(invoice.periodEnd)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-bold text-lg text-green-600">
                  {fmtUSD(invoice.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Entries:</span>
                <span className="font-medium">{invEntries.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Hours:</span>
                <span className="font-medium">
                  {invEntries.reduce((sum, e) => sum + (e.hours || 0), 0).toFixed(1)}h
                </span>
              </div>
            </div>
          </div>

          {/* Entries by Date */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Time Entries</h3>
            
            {sortedDates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No entries found for this invoice.
              </div>
            ) : (
              sortedDates.map(date => (
                <div key={date} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex justify-between">
                    <span>{date}</span>
                    <span className="text-sm text-gray-500">
                      {groupedByDate[date].reduce((sum, e) => sum + (e.hours || 0), 0).toFixed(1)}h
                    </span>
                  </h4>
                  
                  <div className="space-y-2">
                    {groupedByDate[date].map(entry => (
                      <div 
                        key={entry.id} 
                        className="bg-gray-50 rounded p-3 flex justify-between items-start"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {safeText(entry.task)}
                          </div>
                          {entry.notes && (
                            <div className="text-sm text-gray-600 mt-1">
                              {safeText(entry.notes)}
                            </div>
                          )}
                          {entry.tag && (
                            <div className="mt-2">
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                {safeText(entry.tag)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-medium">
                            {Number.isFinite(entry.hours) ? entry.hours.toFixed(1) : '0.0'}h
                          </div>
                          <div className="text-sm text-gray-600">
                            {fmtUSD((entry.hours || 0) * (entry.rate || 0))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default InvoiceModal;