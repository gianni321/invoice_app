import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, CheckCircle, DollarSign, Clock, X } from 'lucide-react';
import { api, getAuthHeaders } from '../config';
import { toast } from 'react-toastify';

function InvoiceModal({ invoice, entries, onClose, onDownload }) {
  const invEntries = invoice.entries || [];
  
  // Safe helper functions
  const fmtUSD = n =>
    Number.isFinite(n) ? new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(n) : '$0.00';
  
  const safeText = s => (s ?? '').toString();
  
  const safeDate = dateStr => {
    if (!dateStr) return '—';
    try {
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
    const dateA = groupedByDate[a][0]?.date ? new Date(groupedByDate[a][0].date + 'T12:00:00') : new Date(0);
    const dateB = groupedByDate[b][0]?.date ? new Date(groupedByDate[b][0].date + 'T12:00:00') : new Date(0);
    return dateB - dateA;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Invoice Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{safeText(invoice.user?.name || invoice.userName) || '—'}</h3>
                <p className="text-gray-600">{safeDate(invoice.date)}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                invoice.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                invoice.status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {(invoice.status || 'unknown').toUpperCase()}
              </span>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-3xl font-bold text-indigo-600">{fmtUSD(invoice.total)}</p>
            </div>
          </div>

          <h4 className="font-bold mb-3">Time Entries</h4>
          <div className="space-y-4">
            {sortedDates.map(dateKey => {
              const dateEntries = groupedByDate[dateKey];
              const dayTotal = dateEntries.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0);
              
              return (
                <div key={dateKey} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium">{dateKey}</h5>
                    <span className="text-sm font-medium text-gray-600">{fmtUSD(dayTotal)}</span>
                  </div>
                  <div className="space-y-2">
                    {dateEntries.map((entry, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <span className="font-medium">{Number.parseFloat(entry.hours).toFixed(2)}h</span>
                          <span className="ml-2">{safeText(entry.task)}</span>
                          {entry.notes && <span className="ml-2 text-gray-500">— {safeText(entry.notes)}</span>}
                        </div>
                        <span className="font-medium">{fmtUSD(entry.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => onDownload(invoice)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Download className="h-4 w-4 inline mr-2" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [entries, setEntries] = useState([]);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchInvoices(), fetchEntries()]);
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch(api.invoices.list(), {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      } else {
        toast.error('Failed to fetch invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Error loading invoices');
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(api.entries.list(), {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      } else {
        toast.error('Failed to fetch entries');
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Error loading entries');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInvoice = async () => {
    const uninvoicedEntries = entries.filter(e => !e.invoiceId);
    
    if (uninvoicedEntries.length === 0) {
      toast.warning('No uninvoiced entries to submit');
      return;
    }

    const totalHours = uninvoicedEntries.reduce((sum, e) => sum + Number.parseFloat(e.hours), 0);
    
    if (!window.confirm(`Submit invoice for ${totalHours.toFixed(2)} hours?`)) {
      return;
    }

    try {
      const response = await fetch(api.invoices.create(), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entries: uninvoicedEntries.map(e => e.id)
        })
      });

      if (response.ok) {
        const newInvoice = await response.json();
        setInvoices(prev => [newInvoice, ...prev]);
        // Refresh entries to update their invoice status
        await fetchEntries();
        toast.success('Invoice submitted successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit invoice');
      }
    } catch (error) {
      console.error('Error submitting invoice:', error);
      toast.error('Error submitting invoice');
    }
  };

  const handleDownload = async (invoice) => {
    try {
      const response = await fetch(api.invoices.download(invoice.id), {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoice.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Invoice downloaded');
      } else {
        toast.error('Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Error downloading invoice');
    }
  };

  // Memoized calculations
  const { uninvoicedEntries, totalUninvoicedHours, totalUninvoicedAmount } = useMemo(() => {
    const uninvoiced = entries.filter(e => !e.invoiceId);
    const totalHours = uninvoiced.reduce((sum, e) => sum + Number.parseFloat(e.hours), 0);
    const totalAmount = uninvoiced.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    return {
      uninvoicedEntries: uninvoiced,
      totalUninvoicedHours: totalHours,
      totalUninvoicedAmount: totalAmount
    };
  }, [entries]);

  const fmtUSD = (amount) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <p className="mt-2 text-gray-600">Manage your submitted invoices and create new ones</p>
      </div>

      {/* Uninvoiced Summary */}
      {uninvoicedEntries.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-yellow-800">Uninvoiced Time</h2>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-yellow-700">Hours</p>
                  <p className="text-2xl font-bold text-yellow-800">{totalUninvoicedHours.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-sm text-yellow-700">Estimated Amount</p>
                  <p className="text-2xl font-bold text-yellow-800">{fmtUSD(totalUninvoicedAmount)}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleSubmitInvoice}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Submit Invoice
            </button>
          </div>
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Invoice History</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.date + 'T12:00:00').toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Number.parseFloat(invoice.hours || 0).toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {fmtUSD(invoice.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      invoice.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                      invoice.status === 'approved' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {invoice.status === 'submitted' && <Clock className="h-3 w-3 mr-1" />}
                      {invoice.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {invoice.status === 'paid' && <DollarSign className="h-3 w-3 mr-1" />}
                      {(invoice.status || 'unknown').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setViewInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(invoice)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {invoices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No invoices yet. Submit your first invoice to get started.
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {viewInvoice && (
        <InvoiceModal 
          invoice={viewInvoice} 
          entries={entries} 
          onClose={() => setViewInvoice(null)} 
          onDownload={handleDownload} 
        />
      )}
    </div>
  );
}