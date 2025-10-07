import React from 'react';
import { X, FileText } from 'lucide-react';

/**
 * Modal component for displaying invoice details
 */
export function InvoiceModal({ invoice, entries, onClose, onDownload }) {
  const invEntries = invoice.entries || [];
  
  // Safe helper functions
  const fmtUSD = n =>
    Number.isFinite(n) ? new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(n) : '$0.00';
  
  const safeText = s => (s ?? '').toString();
  
  const safeDate = dateStr => {
    if (!dateStr) return '—';
    try {
      // Add T12:00:00 to avoid UTC offset issues with YYYY-MM-DD
      return new Date(dateStr + 'T12:00:00').toLocaleDateString();
    } catch {
      return '—';
    }
  };
  
  const groupedByDate = {};
  invEntries.forEach(e => {
    const dateKey = safeDate(e.date);
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(e);
  });

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    // Sort by actual date, with safe fallback
    const dateA = groupedByDate[a][0]?.date ? new Date(groupedByDate[a][0].date + 'T12:00:00') : new Date(0);
    const dateB = groupedByDate[b][0]?.date ? new Date(groupedByDate[b][0].date + 'T12:00:00') : new Date(0);
    return dateB - dateA;
  });

  const handleDownload = () => {
    if (onDownload) {
      onDownload(invoice);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
    >
      <div 
        className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 id="invoice-modal-title" className="text-2xl font-bold">
            Invoice Details
          </h2>
          <div className="flex items-center space-x-2">
            {onDownload && (
              <button 
                onClick={handleDownload}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                aria-label="Download invoice"
              >
                <FileText size={16} />
                <span>Download</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Invoice Header */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Invoice Information</h3>
                <p><span className="font-medium">Invoice ID:</span> {invoice.id}</p>
                <p><span className="font-medium">Status:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    invoice.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status}
                  </span>
                </p>
                <p><span className="font-medium">Submitted:</span> {safeDate(invoice.submitted_at)}</p>
                {invoice.paid_at && (
                  <p><span className="font-medium">Paid:</span> {safeDate(invoice.paid_at)}</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Period</h3>
                <p><span className="font-medium">From:</span> {safeDate(invoice.period_start)}</p>
                <p><span className="font-medium">To:</span> {safeDate(invoice.period_end)}</p>
                <p><span className="font-medium">Total Hours:</span> {invoice.total_hours || 0}</p>
                <p><span className="font-medium">Total Amount:</span> {fmtUSD(invoice.total_amount)}</p>
              </div>
            </div>
          </div>

          {/* Time Entries */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Time Entries</h3>
            
            {sortedDates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No time entries found for this invoice.</p>
            ) : (
              sortedDates.map(dateKey => {
                const dateEntries = groupedByDate[dateKey];
                const dayTotal = dateEntries.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0);
                const dayHours = dateEntries.reduce((sum, e) => sum + (Number.isFinite(e.hours) ? e.hours : 0), 0);

                return (
                  <div key={dateKey} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-lg">{dateKey}</h4>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{dayHours} hours</div>
                        <div className="font-semibold">{fmtUSD(dayTotal)}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {dateEntries.map((entry, idx) => (
                        <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{safeText(entry.task)}</div>
                            {entry.notes && (
                              <div className="text-sm text-gray-600 mt-1">{safeText(entry.notes)}</div>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-medium">{entry.hours || 0} hrs</div>
                            <div className="text-sm text-gray-600">
                              @ ${entry.rate || 0}/hr = {fmtUSD(entry.amount || 0)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}